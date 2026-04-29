import mongoose from "mongoose";
import config from "./src/config/env.config.js";
import connectDB from "./src/config/database.config.js";
import redis from "./src/config/redis.config.js";
import app from "./src/app.js";
import { startAutoCancelJob } from "./src/jobs/autoCancelOrders.job.js";
import { initSocket } from "./src/config/socket.config.js";
import http from "http";

const httpServer = http.createServer(app);
initSocket(httpServer);

const startServer = async () => {
    try {
        await connectDB();
        await redis.ping();

        startAutoCancelJob();
        
        const server = app.listen(config.PORT, () => {
            console.log(`🚀 Server running on port ${config.PORT}`);
        });

        process.on("SIGTERM", async () => {
            console.log("SIGTERM received, shutting down...");
            server.close();
            await mongoose.connection.close();
            await redis.quit();
            process.exit(0);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};

startServer();
