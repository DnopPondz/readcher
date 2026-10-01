import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

const valid = {
  name: "สมหญิง ใจดี",
  email: "  Somying@Example.COM ",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
};

describe("registerSchema", () => {
  it("accepts Thai names and normalizes email", () => {
    const result = registerSchema.parse(valid);
    expect(result.name).toBe("สมหญิง ใจดี");
    expect(result.email).toBe("somying@example.com");
  });

  it("treats a blank name as missing", () => {
    expect(registerSchema.parse({ ...valid, name: "   " }).name).toBeUndefined();
  });

  it("accepts Thai passphrases", () => {
    const password = "รหัสผ่านภาษาไทยยาวๆ";
    expect(
      registerSchema.safeParse({ ...valid, password, confirmPassword: password }).success,
    ).toBe(true);
  });

  it.each([
    ["short password", { password: "short", confirmPassword: "short" }, "password"],
    ["long password", { password: "a".repeat(129), confirmPassword: "a".repeat(129) }, "password"],
    ["mismatch", { confirmPassword: "different" }, "confirmPassword"],
    ["bad email", { email: "not-an-email" }, "email"],
    ["long name", { name: "ก".repeat(101) }, "name"],
  ])("rejects %s", (_label, override, field) => {
    const result = registerSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain(field);
  });
});

describe("loginSchema", () => {
  it("does not apply the registration length policy", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "x" }).success).toBe(true);
  });

  it("rejects empty and oversized input", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "" }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@example.com", password: "a".repeat(129) }).success,
    ).toBe(false);
    expect(loginSchema.safeParse({ email: null, password: "x" }).success).toBe(false);
  });
});
