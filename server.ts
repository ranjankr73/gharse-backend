import config from "./src/config/env.config.js";
import app from "./src/app.js";
import { connectDatabases, disconnectDatabases } from "./src/database/index.js";

// --- PRIORITY 1: Top-Level Node Process Guards ---

process.on("uncaughtException", async (error: Error) => {
    console.error("☠️ CRITICAL SYSTEM EXCEPTION (UNCAUGHT):", error);
    await disconnectDatabases();
    process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
    console.error("⚠️ UNHANDLED PROMISE REJECTION DETECTED:", reason);
    // Safe to keep running, but critical to forward to an APM monitoring tool like Sentry
});

// --- PRIORITY 2: Server Initialization Engine ---

const startServer = async () => {
    try {
        await connectDatabases();

        const server = app.listen(config.PORT, () => {
            console.log(
                `🚀 GharSe Core Service listening on Port [${config.PORT}] under [${config.NODE_ENV}] profile.`,
            );
        });

        // Graceful Cloud Platform / Docker Termination Sequence Hook
        process.on("SIGTERM", () => {
            console.log(
                "📥 SIGTERM event signaled. Draining pending network traffic...",
            );

            // 1. Force HTTP connection listener to stop accepting incoming sockets
            server.close(async (err) => {
                if (err) {
                    console.error(
                        "❌ Error encountered during network socket drain sequence:",
                        err,
                    );
                }

                // 2. Safely tear down database driver allocations once client requests finish
                try {
                    await disconnectDatabases();
                    console.log(
                        "👋 System shutdown sequence finalized. Exiting container worker processes gracefully.",
                    );
                    process.exit(0);
                } catch (dbErr) {
                    console.error(
                        "❌ Shutdown stalled due to database disconnect crash:",
                        dbErr,
                    );
                    process.exit(1);
                }
            });

            // Hard barrier fallback timeout constraint (10 Seconds)
            setTimeout(() => {
                console.error(
                    "🚨 Graceful shutdown threshold breached! Forcing immediate container termination.",
                );
                process.exit(1);
            }, 10000);
        });
    } catch (error: unknown) {
        console.error("❌ Core stack bootstrap routine failed:", error);
        process.exit(1);
    }
};

startServer();
