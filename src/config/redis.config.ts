import { Redis, RedisOptions } from "ioredis";
import config from "./env.config.js";

const redisOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
    enableReadyCheck: true,
};

const redis =
    config.REDIS_URL.startsWith("redis://") ||
    config.REDIS_URL.startsWith("rediss://")
        ? new Redis(config.REDIS_URL, redisOptions)
        : new Redis({
              host: config.REDIS_HOST,
              port: config.REDIS_PORT,
              password: config.REDIS_PASSWORD,
              ...redisOptions,
          });

redis.on("connect", () => {
    console.log("✅ Redis connected");
});

redis.on("error", (error: Error) => {
    console.error("❌ Redis error: ", error.message);
});

redis.on("close", () => {
    console.warn("⚠️ Redis connection closed");
});

export default redis;
