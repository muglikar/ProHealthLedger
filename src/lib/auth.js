import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";

// Vercel: use exact names LINKEDIN_ID + LINKEDIN_SECRET (see .env.example).
// Fallbacks help if you used LinkedIn's default naming from their UI.
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
      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: { scope: "openid profile email" },
      },
      token: "https://www.linkedin.com/oauth/v2/accessToken",
      userinfo: { url: "https://api.linkedin.com/v2/userinfo" },
      profile(profile) {
        return {
          id: profile.sub,
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
      return token;
    },
    async session({ session, token }) {
      session.userId = token.userId;
      session.displayName = token.displayName;
      session.provider = token.provider;
      return session;
    },
  },
};
