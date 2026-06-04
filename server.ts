import config from "./src/config/env.config.js";
import redis from "./src/config/redis.config.js";
import app from "./src/app.js";
import { connectDatabases } from "./src/database/index.js";

const startServer = async () => {
    try {
        await connectDatabases();
        await redis.ping();

        const server = app.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT}`);
        });

        process.on("SIGTERM", async () => {
            console.log("SIGTERM received, shutting down...");
            server.close();
            await redis.quit();
            process.exit(0);
        });
    } catch (error: unknown) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
