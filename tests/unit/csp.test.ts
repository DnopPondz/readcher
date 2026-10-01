import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "@/lib/csp";

describe("createNonce", () => {
  it("returns unique base64 values", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(atob(a)).toHaveLength(16);
  });
});

describe("buildCsp", () => {
  it("locks down production pages", () => {
    const csp = buildCsp("abc", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("allows eval only in development", () => {
    const csp = buildCsp("abc", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});
