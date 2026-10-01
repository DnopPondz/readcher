import "server-only";
import { checkRateLimit, RedisRateLimitStore, type RateLimitRule } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

export const RATE_LIMITS = {
  loginPerIp: { name: "login:ip", limit: 30, windowSec: 15 * 60 },
  loginPerEmail: { name: "login:email", limit: 10, windowSec: 15 * 60 },
  registerPerIp: { name: "register:ip", limit: 5, windowSec: 60 * 60 },
  uploadPerUser: { name: "upload:user", limit: 20, windowSec: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

let store: RedisRateLimitStore | undefined;

export function rateLimit(rule: RateLimitRule, identifier: string) {
  store ??= new RedisRateLimitStore(redis());
  return checkRateLimit(store, rule, identifier);
}
