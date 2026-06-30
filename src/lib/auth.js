import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import {
  isSiteAdminForSession,
  normalizeAdminEmail,
} from "@/lib/site-admins";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { fetchLinkedinTrustSignals } from "@/lib/linkedin-trust-signals";
import { readRepoJson, writeRepoJson } from "@/lib/github";

const linkedInClientId =
  process.env.LINKEDIN_ID?.trim() ||
  process.env.LINKEDIN_CLIENT_ID?.trim() ||
  "";
const linkedInClientSecret =
  process.env.LINKEDIN_SECRET?.trim() ||
  process.env.LINKEDIN_CLIENT_SECRET?.trim() ||
  "";

/**
 * Fetch the authenticated member's LinkedIn profile data via the
 * "Verified on LinkedIn" /identityMe endpoint.
 *
 * Returns an object { slug, profileUrl } where slug is the vanity slug
 * extracted from basicInfo.profileUrl, and profileUrl is the persistent
 * redirect URL, or null if the product isn't enabled.
 */
async function fetchLinkedinProfileSlug(accessToken) {
  if (!accessToken || typeof accessToken !== "string") return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.linkedin.com/rest/identityMe", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202604",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const profileUrl = data?.basicInfo?.profileUrl;
    if (profileUrl && typeof profileUrl === "string") {
      let slug = null;
      // Direct vanity URL: linkedin.com/in/muglikar
      const directMatch = profileUrl.match(
        /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
      );
      if (directMatch) {
        slug = directMatch[1].toLowerCase();
      } else {
        // Redirect-style URL: follow redirect to resolve the canonical vanity URL
        try {
          const redirectRes = await fetch(profileUrl, {
            method: "HEAD",
            redirect: "manual",
          });
          const location = redirectRes.headers.get("location") || "";
          const redirectMatch = location.match(
            /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
          );
          if (redirectMatch) slug = redirectMatch[1].toLowerCase();
        } catch {
          /* redirect resolution failed — non-fatal */
        }
      }
      return { slug, profileUrl };
    }
  } catch {
    /* ignore — product may not be enabled yet */
  }
  return null;
}

/**
 * Persist a LinkedIn vanity slug → member URN mapping.
 * Used later to @mention-tag vouchees in LinkedIn auto-posts.
 * Best-effort: failures are silently ignored (non-critical path).
 */
async function persistLinkedinUrn(vanitySlug, linkedinSub) {
  if (!vanitySlug || !linkedinSub) return;
  const slug = String(vanitySlug).trim().toLowerCase();
  const urn = String(linkedinSub).trim();
  if (!slug || !urn) return;

  try {
    const filePath = "data/linkedin-urns/_index.json";
    const { data: existing, sha } = await readRepoJson(filePath);
    const map = existing && typeof existing === "object" ? existing : {};

    // Skip write if already stored with same value
    if (map[slug] === urn) return;

    map[slug] = urn;
    await writeRepoJson(filePath, map, sha || undefined, `chore: map ${slug} → URN`);
  } catch (e) {
    // Non-critical — if it fails, tagging just won't work for this user
    console.warn("persistLinkedinUrn failed:", e.message);
  }
}

/**
 * Scientific Name Verification:
 * When a user logs in via LinkedIn, we capture their true name from OIDC
 * and update their corresponding ledger profile (if any) to fix "unbroken string" names.
 */
async function updateProfilePublicName(vanitySlug, realName) {
  if (!vanitySlug || !realName) return;
  const slug = String(vanitySlug).trim().toLowerCase();
  const name = String(realName).trim();
  if (!slug || !name) return;

  try {
    const filePath = "data/profiles/_index.json";
    const { data: profiles, sha } = await readRepoJson(filePath);
    if (!Array.isArray(profiles)) return;

    const profile = profiles.find((p) => p.slug === slug);
    if (profile) {
      // Only update if missing or if it's currently just the slug (unbroken string)
      const currentName = String(profile.public_name || "").trim();
      const isUnbrokenSlug = currentName.toLowerCase() === slug.replace(/-/g, "").toLowerCase();
      
      if (!currentName || isUnbrokenSlug || currentName === slug) {
        if (currentName === name) return; // No change needed
        
        profile.public_name = name;
        await writeRepoJson(
          filePath,
          profiles,
          sha,
          `verification: update public_name for ${slug} via OIDC login`
        );
        console.log(`Verified name for ${slug}: ${name}`);
      }
    }
  } catch (e) {
    console.warn("updateProfilePublicName failed:", e.message);
  }
}

const providers = [
  GithubProvider({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  }),
];

if (linkedInClientId && linkedInClientSecret) {
  providers.push(
    LinkedInProvider({
      clientId: linkedInClientId,
      clientSecret: linkedInClientSecret,
      client: { token_endpoint_auth_method: "client_secret_post" },
      // Skip ID token signature/issuer verification — we fetch user data via
      // the userinfo endpoint directly, so we don't need openid-client to
      // validate the JWT. This fixes login for LinkedIn accounts created via
      // "Sign in with Google" where the ID token iss claim can differ.
      idToken: false,
      // Use simple state-based CSRF protection instead of PKCE/nonce which
      // LinkedIn doesn't consistently support across all account types.
      checks: ["state"],
      // Removed issuer and jwks_endpoint to force next-auth to treat this as
      // a pure OAuth2 provider rather than OIDC, bypassing ID token validation
      // that fails for Google-linked accounts due to issuer mismatch.
      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: {
          // w_member_social is required for POST /rest/posts and image uploads.
          // The "Share on LinkedIn" product must be enabled in the LinkedIn
          // Developer App dashboard for this scope to be granted.
          scope: process.env.LINKEDIN_SCOPE || "openid profile email w_member_social",
        },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      // Custom fetch avoids merged userinfo.params.projection (for /v2/me) breaking OIDC userinfo.
      // Includes fallback: if /v2/userinfo fails, decode the ID token directly.
      userinfo: {
        url: "https://api.linkedin.com/v2/userinfo",
        async request({ tokens }) {
          try {
            const res = await fetch("https://api.linkedin.com/v2/userinfo", {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            if (!res.ok) {
              const body = await res.text();
              console.error(`[LinkedIn Auth] userinfo endpoint failed ${res.status}: ${body}`);
              // Fallback: try to decode the ID token payload directly
              if (tokens.id_token) {
                console.log("[LinkedIn Auth] Falling back to ID token payload");
                const payload = JSON.parse(
                  Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()
                );
                return payload;
              }
              throw new Error(`LinkedIn userinfo ${res.status}: ${body}`);
            }
            return res.json();
          } catch (err) {
            console.error("[LinkedIn Auth] userinfo request error:", err.message);
            // Last-resort fallback: decode ID token if available
            if (tokens.id_token) {
              try {
                console.log("[LinkedIn Auth] Last-resort fallback to ID token payload");
                const payload = JSON.parse(
                  Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()
                );
                return payload;
              } catch (decodeErr) {
                console.error("[LinkedIn Auth] ID token decode failed:", decodeErr.message);
              }
            }
            throw err;
          }
        },
      },
      profile(profile) {
        const id = profile.sub;
        if (!id) {
          console.error("[LinkedIn Auth] Profile missing sub claim:", JSON.stringify(profile));
          throw new Error("LinkedIn userinfo missing `sub`");
        }
        return {
          id: String(id),
          name:
            profile.name ||
            [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
            null,
          email: profile.email ?? null,
          image: profile.picture ?? null,
        };
      },
    })
  );
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  logger: {
    error(code, metadata) {
      console.error(`[NextAuth Error] ${code}`, metadata);
    },
    warn(code) {
      // Suppress annoying warning about DEBUG_ENABLED
      if (code !== 'DEBUG_ENABLED') {
        console.warn(`[NextAuth Warn] ${code}`);
      }
    },
    debug(code, metadata) {
      // Filter out overly noisy debug logs if needed, but keeping for now
      console.log(`[NextAuth Debug] ${code}`, metadata);
    }
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "linkedin") {
        console.log("[LinkedIn Auth] signIn callback:", {
          userId: user?.id,
          name: user?.name,
          email: user?.email ? "present" : "missing",
          profileSub: profile?.sub,
          providerAccountId: account?.providerAccountId,
        });
      }
      if (!user?.id || !user?.name) return true;
      try {
        const filePath = "data/users/_index.json";
        const { data: users, sha } = await readRepoJson(filePath);
        const userList = Array.isArray(users) ? users : [];
        
        const existingIdx = userList.findIndex(u => u.user_id === user.id);
        const userData = {
          user_id: user.id,
          display_name: user.name,
          email: user.email || null,
          image: user.image || null,
          last_login: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          // Update existing
          userList[existingIdx] = { ...userList[existingIdx], ...userData };
        } else {
          // Add new
          userList.push(userData);
        }

        await writeRepoJson(filePath, userList, sha, `auth: record user ${user.id}`);
      } catch (e) {
        console.error("Failed to persist user to index:", e);
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        if (account.provider === "github") {
          token.userId = `github:${profile.login}`;
          token.displayName = profile.name || profile.login;
          token.name = token.displayName;
          token.provider = "github";
          // Clear stale LinkedIn trust signals if they exist from a previous session
          delete token.linkedinAccountAgeDays;
          delete token.linkedinConnections;
          delete token.linkedinVanity;
          delete token.linkedinProfileUrl;
          delete token.linkedinAccessToken;
          delete token.linkedinSub;
          if (profile.email) {
            const em = normalizeAdminEmail(String(profile.email));
            token.authEmail = em;
            token.email = em;
          }
        } else if (account.provider === "linkedin") {
          const liSub =
            profile.sub != null
              ? String(profile.sub)
              : String(account.providerAccountId);
          token.userId = `linkedin:${liSub}`;
          token.displayName = profile.name || profile.email || "LinkedIn User";
          token.name = token.displayName;
          token.provider = "linkedin";
          if (profile.email) {
            const em = normalizeAdminEmail(String(profile.email));
            token.authEmail = em;
            token.email = em;
          }
          const profileData = await fetchLinkedinProfileSlug(account.access_token);
          if (profileData) {
            if (profileData.slug) token.linkedinVanity = profileData.slug;
            if (profileData.profileUrl) token.linkedinProfileUrl = profileData.profileUrl;
          }
          // Store access token for server-side LinkedIn API calls (e.g. posting)
          token.linkedinAccessToken = account.access_token;
          token.linkedinSub = liSub;
          // Persist slug → URN mapping for @mention tagging in auto-posts
          if (profileData?.slug) {
            if (liSub) {
              persistLinkedinUrn(profileData.slug, liSub).catch(() => {});
            }
            // Scientific name resolution: update profile with real name from OIDC
            updateProfilePublicName(profileData.slug, profile.name).catch(() => {});
          }
          const trust = await fetchLinkedinTrustSignals(account.access_token, liSub);
          token.linkedinAccountAgeDays = trust.accountAgeDays;
          token.linkedinConnections = trust.connections;
        }
      }
      const adminEmail =
        (token.email && normalizeAdminEmail(String(token.email))) ||
        (token.authEmail && normalizeAdminEmail(String(token.authEmail))) ||
        "";
      token.siteAdmin =
        isSiteAdminForSession({
          userId: token.userId,
          email: adminEmail,
          linkedinVanity: token.linkedinVanity,
        }) ||
        (token.userId ? isRepoMaintainerUserId(String(token.userId)) : false);
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId;
      session.displayName = token.displayName;
      session.provider = token.provider;
      const email =
        (session.user?.email && normalizeAdminEmail(String(session.user.email))) ||
        (token.authEmail && normalizeAdminEmail(String(token.authEmail))) ||
        (token.email && normalizeAdminEmail(String(token.email))) ||
        "";
      if (email) {
        session.authEmail = email;
        if (session.user) {
          session.user.email = session.user.email || email;
        }
      }
      if (token.linkedinVanity) {
        session.linkedinVanity = String(token.linkedinVanity);
      }
      if (token.linkedinProfileUrl) {
        session.linkedinProfileUrl = String(token.linkedinProfileUrl);
      } else if (token.userId) {
        try {
          const { data: users } = await readRepoJson("data/users/_index.json").catch(() => ({ data: [] }));
          let sessionUserId = String(token.userId).replace("github:", "").replace("linkedin:", "");
          if (sessionUserId === "CAOSO1oig0") sessionUserId = "muglikar";
          const dbUser = users?.find?.((u) => {
            const uid = (u.user_id || u.github_username || "").replace("github:", "").replace("linkedin:", "");
            return uid === sessionUserId;
          });
          if (dbUser?.linkedin_url) {
            session.linkedinProfileUrl = dbUser.linkedin_url;
          }
        } catch (e) {
          console.warn("Failed to read user for session linkedinProfileUrl:", e);
        }
      }
      session.siteAdmin = Boolean(token.siteAdmin);
      // Flag so the client knows direct LinkedIn posting is available (token stays server-side)
      session.canPostToLinkedIn = Boolean(token.linkedinAccessToken && token.provider === "linkedin");
      if (token.linkedinSub) {
        session.linkedinSub = String(token.linkedinSub);
      }
      if (token.linkedinAccountAgeDays != null && Number.isFinite(Number(token.linkedinAccountAgeDays))) {
        session.linkedinAccountAgeDays = Number(token.linkedinAccountAgeDays);
      } else if (token.linkedinAccountAgeDays === null) {
        session.linkedinAccountAgeDays = null;
      }
      if (token.linkedinConnections != null && Number.isFinite(Number(token.linkedinConnections))) {
        session.linkedinConnections = Number(token.linkedinConnections);
      } else if (token.linkedinConnections === null) {
        session.linkedinConnections = null;
      }
      return session;
    },
  },
};
