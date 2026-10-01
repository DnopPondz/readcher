"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { RateLimitedError, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { RATE_LIMITS, rateLimit } from "@/lib/limits";
import { hashPassword } from "@/lib/password";
import { clientIp } from "@/lib/request-ip";
import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from "@/lib/safe-redirect";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { messages } from "@/messages";

const errors = messages.auth.errors;

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;
  values?: { name?: string; email?: string };
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Calls signIn and maps Auth.js errors to UI messages. Redirects on success. */
async function signInWithCredentials(
  email: string,
  password: string,
  redirectTo: string,
): Promise<string> {
  try {
    await signIn("credentials", { email, password, redirectTo });
    return "";
  } catch (error) {
    // signIn throws NEXT_REDIRECT on success; let it propagate.
    if (!(error instanceof AuthError)) throw error;
    if (error instanceof RateLimitedError) return errors.rateLimited;
    if (error instanceof CredentialsSignin) return errors.invalidCredentials;
    console.error("auth.signIn failed", { type: error.type });
    return errors.unavailable;
  }
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email");
  const parsed = loginSchema.safeParse({ email, password: text(formData, "password") });
  if (!parsed.success) {
    return { error: errors.invalidCredentials, values: { email } };
  }

  const redirectTo = safeRedirectPath(formData.get("callbackUrl"));
  const error = await signInWithCredentials(parsed.data.email, parsed.data.password, redirectTo);
  return { error, values: { email } };
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { name: text(formData, "name"), email: text(formData, "email") };

  try {
    const limit = await rateLimit(RATE_LIMITS.registerPerIp, clientIp(await headers()));
    if (!limit.allowed) return { error: errors.rateLimited, values };
  } catch (error) {
    console.error("auth.register rate limit unavailable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return { error: errors.unavailable, values };
  }

  const parsed = registerSchema.safeParse({
    ...values,
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "name") fieldErrors.name = errors.nameTooLong;
      if (field === "email") fieldErrors.email = errors.invalidEmail;
      if (field === "password") {
        fieldErrors.password =
          issue.code === "too_big" ? errors.passwordTooLong : errors.passwordTooShort;
      }
      if (field === "confirmPassword") fieldErrors.confirmPassword = errors.passwordMismatch;
    }
    return { fieldErrors, values };
  }

  const { name, email, password } = parsed.data;
  try {
    await db.user.create({
      data: { email, name, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { email: errors.emailTaken }, values };
    }
    console.error("auth.register failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return { error: errors.unavailable, values };
  }

  const error = await signInWithCredentials(email, password, DEFAULT_AFTER_LOGIN);
  return { error, values };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
