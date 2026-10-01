import type { NextAuthConfig } from "next-auth";

/**
 * Auth.js settings shared by the proxy and the full server config.
 * Must not import Node-only modules (DB, argon2, Redis).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  // Credentials provider requires JWT sessions.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  providers: [],
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
