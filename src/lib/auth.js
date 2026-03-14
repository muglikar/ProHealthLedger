import GithubProvider from "next-auth/providers/github";
import LinkedInProvider from "next-auth/providers/linkedin";

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_ID,
      clientSecret: process.env.LINKEDIN_SECRET,
      authorization: {
        params: { scope: "openid profile email" },
      },
    }),
  ],
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
