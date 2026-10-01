import { createHash } from "node:crypto";
import type Redis from "ioredis";

/** Storage backend for fixed-window counters. */
export interface RateLimitStore {
  /** Increment the counter for `key` and return the new count and seconds until reset. */
  hit(key: string, windowSec: number): Promise<{ count: number; ttlSec: number }>;
}

export type RateLimitRule = {
  /** Namespace for the counter, e.g. "login:ip". */
  name: string;
  limit: number;
  windowSec: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Identifiers can be emails or IPs. Hash them so Redis never holds
 * personal data in plain text.
 */
export function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier).digest("base64url").slice(0, 32);
}

export async function checkRateLimit(
  store: RateLimitStore,
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult> {
  const key = `rl:${rule.name}:${hashIdentifier(identifier)}`;
  const { count, ttlSec } = await store.hit(key, rule.windowSec);
  const allowed = count <= rule.limit;
  return {
    allowed,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSec: allowed ? 0 : Math.max(1, ttlSec),
  };
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: Redis) {}

  async hit(key: string, windowSec: number): Promise<{ count: number; ttlSec: number }> {
    const results = await this.client
      .multi()
      .incr(key)
      .expire(key, windowSec, "NX")
      .ttl(key)
      .exec();
    if (!results) {
      throw new Error("Rate limit transaction aborted");
    }
    const [incr, , ttl] = results;
    if (incr?.[0] || ttl?.[0]) {
      throw new Error("Rate limit command failed");
    }
    return { count: Number(incr?.[1]), ttlSec: Number(ttl?.[1]) };
  }
}

/** In-process store for tests and single-process tooling. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async hit(key: string, windowSec: number): Promise<{ count: number; ttlSec: number }> {
    const now = this.now();
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowSec * 1000 };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return { count: entry.count, ttlSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
}
