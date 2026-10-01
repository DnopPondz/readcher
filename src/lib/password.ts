import { hash, verify } from "@node-rs/argon2";

// Argon2id (library default) with OWASP Password Storage Cheat Sheet parameters.
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Malformed hash: treat as a failed login rather than a server error.
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Run a verification against a throwaway hash so that "unknown email" and
 * "wrong password" take roughly the same time.
 */
export async function verifyDummyPassword(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
}
