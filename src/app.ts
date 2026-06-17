import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";

import config from "./config/env.config.js";
import authRouter from "./modules/auth/auth.route.js";
import { AppError } from "./shared/errors/AppError.js";

const app = express();

// 1. Global Pre-Routing Middlewares
app.use(express.json());
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());
app.use(
    cors({
        origin: config.CLIENT_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

// 2. REST API Base Resource Routes
app.use("/api/v1/auth", authRouter);

// 3. Fallback Catch-All Middleware for Undefined Route Requests (404)
app.use((req: Request, res: Response) => {
    console.log(
        `⚠️ Unmapped Resource Request: [${req.method}] ${req.originalUrl}`,
    );

    return res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// 4. Centralized Global Exception and Operational Error Handler Middleware
app.use(
    (
        err: Error | AppError,
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        let statusCode = 500;
        let message = "Internal Server Error";

        if (err instanceof AppError) {
            statusCode = err.statusCode;
            message = err.message;
        } else if ("statusCode" in err && typeof err.statusCode === "number") {
            statusCode = err.statusCode;
            message = err.message;
        } else if (config.NODE_ENV === "development") {
            message = err.message;
        }

        console.error(
            `💥 System Exception on [${req.method}] ${req.originalUrl} - Stack Trace:`,
            err,
        );

        return res.status(statusCode).json({
            success: false,
            message,
            ...(config.NODE_ENV === "development" && { stack: err.stack }),
        });
    },
);

export default app;
