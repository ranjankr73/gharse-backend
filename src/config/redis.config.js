import Redis from "ioredis";
import config from "./env.config.js";

const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,

    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },

    enableReadyCheck: true,
});

redis.on("connect", () => {
    console.log("✅ Redis connected");
});

redis.on("error", (error) => {
    console.error("❌ Redis error: ", error.message);
});

redis.on("close", () => {
    console.warn("⚠️ Redis connection closed");
});

export default redis;