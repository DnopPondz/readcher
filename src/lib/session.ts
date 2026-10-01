import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CurrentUser = { id: string; email: string; name: string | null };

/**
 * Authoritative auth check for Server Components, Server Actions and Route Handlers.
 * The proxy redirect is only an optimistic check; always call this before touching user data.
 * Re-reads the user so a deleted account cannot keep using a still-valid JWT.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
