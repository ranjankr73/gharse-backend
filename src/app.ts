import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";

import config from "./config/env.config.js";

import authRouter from "./modules/auth/auth.route.js";
import { AppError } from "./shared/errors/AppError.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
    cors({
        origin: config.CLIENT_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

app.use("/api/v1/auth", authRouter);

// No Route match
app.use((req, res) => {
    console.log(`Endpoint: ${req.originalUrl}`);

    return res.status(404).json({
        message: "Route not found",
    });
});

// Global error handler
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error("UNHANDLED ERROR: ", err);

    return res.status(err.statusCode || 500).json({
        message: err.message || "Internal Server Error",
    });
});

export default app;
