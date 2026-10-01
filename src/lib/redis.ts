import "server-only";
import Redis from "ioredis";
import { env } from "@/lib/env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createClient(): Redis {
  return new Redis(env().REDIS_URL, {
    // Fail fast instead of queueing commands forever when Redis is down.
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
  });
}

export function redis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createClient();
  }
  return globalForRedis.redis;
}
