import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes with argon2id and verifies Thai and English passwords", async () => {
    for (const password of ["correct horse battery", "รหัสผ่านภาษาไทย"]) {
      const hash = await hashPassword(password);
      expect(hash).toMatch(/^\$argon2id\$/);
      expect(hash).toContain("m=19456,t=2,p=1");
      expect(await verifyPassword(hash, password)).toBe(true);
      expect(await verifyPassword(hash, `${password}x`)).toBe(false);
    }
  });

  it("produces a different hash for the same password", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});
