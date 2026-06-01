import { NextFunction, Request, Response } from "express";
import { registerUser } from "./auth.service.js";

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await registerUser({
            fullName: req.body.fullName,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
            ipAddress: req.ip || req.connection.remoteAddress || "Unknown",
            userAgent: req.headers["user-agent"] || "Unknown",
        });

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({
            message: "User registered successfully",
            data: {
                user: result.user,
                token: result.accessToken,
            },
        });
    } catch (error: any) {
        next(error);
    }
};
