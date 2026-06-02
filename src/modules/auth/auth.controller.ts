import { NextFunction, Request, Response } from "express";
import ms from "ms";
import config from "../../config/env.config.js";
import { registerUser, loginUser } from "./auth.service.js";

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await registerUser({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
            ipAddress: req.ip || "unknown",
            userAgent: req.headers["user-agent"] || "Unknown",
        });

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
            maxAge: ms(config.REFRESH_TOKEN_EXPIRY),
        });

        res.status(201).json({
            message: "User registered successfully",
            data: {
                user: result.user,
                token: result.accessToken,
            },
        });
    } catch (error: unknown) {
        next(error);
    }
};

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await loginUser({
            email: req.body.email,
            password: req.body.password,
            ipAddress: req.ip || "unknown",
            userAgent: req.headers["user-agent"] || "unknown",
        });

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
            maxAge: ms(config.REFRESH_TOKEN_EXPIRY),
        });

        res.status(200).json({
            message: "User logged in successfully",
            data: {
                user: result.user,
                token: result.accessToken,
            },
        });
    } catch (error: unknown) {
        next(error);
    }
};
