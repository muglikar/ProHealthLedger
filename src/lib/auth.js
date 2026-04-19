import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";
import { isSiteAdmin } from "@/lib/site-admins";

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
          token.provider = "github";
        } else if (account.provider === "linkedin") {
          token.userId = `linkedin:${account.providerAccountId}`;
          token.displayName = profile.name || profile.email || "LinkedIn User";
          token.provider = "linkedin";
        }
      }
      if (token.userId) {
        token.siteAdmin = isSiteAdmin(token.userId);
      }
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId;
      session.displayName = token.displayName;
      session.provider = token.provider;
      session.siteAdmin = Boolean(token.siteAdmin);
      return session;
    },
  },
};
