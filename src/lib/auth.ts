import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";
import { RATE_LIMITS, rateLimit } from "@/lib/limits";
import { verifyDummyPassword, verifyPassword } from "@/lib/password";
import { clientIp } from "@/lib/request-ip";
import { loginSchema } from "@/lib/validation/auth";

export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Also reachable directly via POST /api/auth/callback/credentials,
      // so rate limiting lives here rather than in the server action.
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const [byIp, byEmail] = await Promise.all([
          rateLimit(RATE_LIMITS.loginPerIp, clientIp(request.headers)),
          rateLimit(RATE_LIMITS.loginPerEmail, email),
        ]);
        if (!byIp.allowed || !byEmail.allowed) throw new RateLimitedError();

        const user = await db.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user?.passwordHash) {
          await verifyDummyPassword(password);
          return null;
        }
        if (!(await verifyPassword(user.passwordHash, password))) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
