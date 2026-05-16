import { Redis } from "ioredis";
import config from "./env.config.js";

const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,

    retryStrategy(times: number) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },

    enableReadyCheck: true,
});

// const redis = new Redis(config.REDIS_URL);

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
