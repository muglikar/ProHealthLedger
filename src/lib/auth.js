import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import { isSiteAdminForSession, normalizeAdminEmail } from "@/lib/site-admins";

const linkedInClientId =
  process.env.LINKEDIN_ID?.trim() ||
  process.env.LINKEDIN_CLIENT_ID?.trim() ||
  "";
const linkedInClientSecret =
  process.env.LINKEDIN_SECRET?.trim() ||
  process.env.LINKEDIN_CLIENT_SECRET?.trim() ||
  "";

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
        params: { scope: "openid profile email" },
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
          const data = await res.json();
          /** Optional: vanity URL segment for /in/{slug}; may fail without extra LinkedIn API products. */
          let vanityName;
          try {
            const meRes = await fetch(
              "https://api.linkedin.com/v2/me?projection=(vanityName)",
              {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                  "X-Restli-Protocol-Version": "2.0.0",
                  "LinkedIn-Version": "202401",
                },
              }
            );
            if (meRes.ok) {
              const me = await meRes.json();
              if (me && typeof me.vanityName === "string") {
                vanityName = me.vanityName;
              }
            }
          } catch {
            /* ignore — use LINKEDIN_ADMIN_SUBS instead */
          }
          return { ...data, vanityName };
        },
      },
      profile(profile) {
        const id = profile.sub;
        if (!id) {
          throw new Error("LinkedIn userinfo missing `sub`");
        }
        const vanity =
          typeof profile.vanityName === "string" && profile.vanityName.trim()
            ? profile.vanityName.trim().toLowerCase()
            : undefined;
        return {
          id: String(id),
          name:
            profile.name ||
            [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
            null,
          email: profile.email ?? null,
          image: profile.picture ?? null,
          linkedinVanity: vanity,
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
          token.provider = "github";
          if (profile.email) {
            token.authEmail = normalizeAdminEmail(String(profile.email));
          }
        } else if (account.provider === "linkedin") {
          token.userId = `linkedin:${account.providerAccountId}`;
          token.displayName = profile.name || profile.email || "LinkedIn User";
          token.provider = "linkedin";
          if (profile.email) {
            token.authEmail = normalizeAdminEmail(String(profile.email));
          }
          if (profile.linkedinVanity) {
            token.linkedinVanity = String(profile.linkedinVanity).toLowerCase();
          }
        }
      }
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
      }
      if (token.linkedinVanity) {
        session.linkedinVanity = String(token.linkedinVanity);
      }
      session.siteAdmin = isSiteAdminForSession({
        userId: token.userId,
        email,
        linkedinVanity: token.linkedinVanity,
      });
      return session;
    },
  },
};
