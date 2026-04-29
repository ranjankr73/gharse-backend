import Redis from "ioredis";
import config from "./env.config.js";

const redis = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
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