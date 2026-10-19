import type { NextAuthConfig } from "next-auth";

// Edge-safe half of the Auth.js config (no database, no bcrypt): the
// middleware imports this one. The Credentials provider lives in lib/auth.ts.
export const authConfig = {
  providers: [],
  // Hosting is not decided: the host header is trusted (it only builds the
  // callback URL; sessions are signed with AUTH_SECRET).
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/admin/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
