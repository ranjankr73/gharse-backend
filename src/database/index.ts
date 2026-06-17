import { prisma } from "./postgresql.js";
import redis from "../config/redis.config.js";

export const connectDatabases = async (): Promise<void> => {
    console.log("⏳ Initializing infrastructure data layers...");

    await prisma.$connect();
    console.log("✅ PostgreSQL cluster connected successfully.");

    await redis.ping();
    console.log("✅ Redis memory cluster verified (Ping successful).");
};

export const disconnectDatabases = async (): Promise<void> => {
    console.log("⏳ Gracefully terminating backing storage connections...");

    try {
        await prisma.$disconnect();
        await redis.quit();

        console.log(
            "🛑 PostgreSQL and Redis network connections closed cleanly.",
        );
    } catch (error) {
        console.error(
            "❌ Exception encountered during data tier shutdown sequence:",
            error,
        );
        throw error;
    }
};
