import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import {
  isSiteAdminForSession,
  normalizeAdminEmail,
} from "@/lib/site-admins";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { fetchLinkedinTrustSignals } from "@/lib/linkedin-trust-signals";

const linkedInClientId =
  process.env.LINKEDIN_ID?.trim() ||
  process.env.LINKEDIN_CLIENT_ID?.trim() ||
  "";
const linkedInClientSecret =
  process.env.LINKEDIN_SECRET?.trim() ||
  process.env.LINKEDIN_CLIENT_SECRET?.trim() ||
  "";

/**
 * Fetch the authenticated member's LinkedIn profile slug via the
 * "Verified on LinkedIn" /identityMe endpoint.
 *
 * Returns the vanity slug (e.g. "muglikar") extracted from
 * basicInfo.profileUrl, or null if the product isn't enabled or
 * the call otherwise fails.
 */
async function fetchLinkedinProfileSlug(accessToken) {
  if (!accessToken || typeof accessToken !== "string") return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.linkedin.com/rest/identityMe", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const profileUrl = data?.basicInfo?.profileUrl;
    if (profileUrl && typeof profileUrl === "string") {
      // Direct vanity URL: linkedin.com/in/muglikar
      const directMatch = profileUrl.match(
        /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
      );
      if (directMatch) return directMatch[1].toLowerCase();

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
        if (redirectMatch) return redirectMatch[1].toLowerCase();
      } catch {
        /* redirect resolution failed — non-fatal */
      }
    }
  } catch {
    /* ignore — product may not be enabled yet */
  }
  return null;
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
      // Must match LinkedIn ID token `iss` (see openid-configuration). wellKnown +
      // merged defaults produced issuer undefined → "unexpected iss value" in openid-client.
      issuer: "https://www.linkedin.com/oauth",
      jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: { scope: "openid profile email r_verify r_profile_basicinfo w_member_social" },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      // Custom fetch avoids merged userinfo.params.projection (for /v2/me) breaking OIDC userinfo.
      userinfo: {
        url: "https://api.linkedin.com/v2/userinfo",
        async request({ tokens }) {
          const res = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (!res.ok) {
            const body = await res.text();
            throw new Error(`LinkedIn userinfo ${res.status}: ${body}`);
          }
          return res.json();
        },
      },
      profile(profile) {
        const id = profile.sub;
        if (!id) {
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
  providers,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        if (account.provider === "github") {
          token.userId = `github:${profile.login}`;
          token.displayName = profile.name || profile.login;
          token.name = token.displayName;
          token.provider = "github";
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
          const vanity = await fetchLinkedinProfileSlug(account.access_token);
          if (vanity) {
            token.linkedinVanity = vanity;
          }
          // Store access token for server-side LinkedIn API calls (e.g. posting)
          token.linkedinAccessToken = account.access_token;
          token.linkedinSub = liSub;
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
      session.siteAdmin = Boolean(token.siteAdmin);
      // Flag so the client knows direct LinkedIn posting is available (token stays server-side)
      session.canPostToLinkedIn = Boolean(token.linkedinAccessToken && token.provider === "linkedin");
      if (token.linkedinSub) {
        session.linkedinSub = String(token.linkedinSub);
      }
      if (Number.isFinite(Number(token.linkedinAccountAgeDays))) {
        session.linkedinAccountAgeDays = Number(token.linkedinAccountAgeDays);
      }
      if (Number.isFinite(Number(token.linkedinConnections))) {
        session.linkedinConnections = Number(token.linkedinConnections);
      }
      return session;
    },
  },
};
