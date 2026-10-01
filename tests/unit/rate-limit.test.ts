import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  hashIdentifier,
  MemoryRateLimitStore,
  type RateLimitStore,
} from "@/lib/rate-limit";

const rule = { name: "test", limit: 3, windowSec: 60 };

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const store = new MemoryRateLimitStore(() => 0);
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await checkRateLimit(store, rule, "1.2.3.4"));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
    expect(results[3].retryAfterSec).toBe(60);
  });

  it("resets after the window expires", async () => {
    let now = 0;
    const store = new MemoryRateLimitStore(() => now);
    for (let i = 0; i < 4; i++) await checkRateLimit(store, rule, "a@example.com");

    now = 61_000;
    const result = await checkRateLimit(store, rule, "a@example.com");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("tracks identifiers and rules independently", async () => {
    const store = new MemoryRateLimitStore(() => 0);
    for (let i = 0; i < 3; i++) await checkRateLimit(store, rule, "สมชาย@example.com");

    expect((await checkRateLimit(store, rule, "other@example.com")).allowed).toBe(true);
    expect(
      (await checkRateLimit(store, { ...rule, name: "other" }, "สมชาย@example.com")).allowed,
    ).toBe(true);
  });

  it("never passes the raw identifier to the store", async () => {
    const keys: string[] = [];
    const spy: RateLimitStore = {
      async hit(key) {
        keys.push(key);
        return { count: 1, ttlSec: 60 };
      },
    };
    await checkRateLimit(spy, rule, "secret@example.com");

    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain("secret");
    expect(keys[0]).toBe(`rl:test:${hashIdentifier("secret@example.com")}`);
  });

  it("propagates store failures so callers can fail closed", async () => {
    const broken: RateLimitStore = {
      async hit() {
        throw new Error("redis down");
      },
    };
    await expect(checkRateLimit(broken, rule, "x")).rejects.toThrow("redis down");
  });
});
