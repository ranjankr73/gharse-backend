import redis from "../config/redis.config.js";
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/auth/auth.utils.js";
import { Role } from "../../generated/prisma/enums.js";
import { SessionPayload } from "../modules/auth/auth.types.js";

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const token = authHeader.split(" ")[1];

        const payload = verifyAccessToken(token);

        const sessionData = await redis.get(`session:${payload.sessionId}`);

        if (!sessionData) {
            return res.status(401).json({
                message: "Session expired",
            });
        }

        const session: SessionPayload = JSON.parse(sessionData);

        if (session.isRevoked) {
            return res.status(401).json({
                message: "Session revoked",
            });
        }

        if (session.userId !== payload.sub || session.role !== payload.role) {
            return res.status(401).json({
                message: "Invalid session",
            });
        }

        req.user = {
            sub: payload.sub,
            role: payload.role,
            sessionId: payload.sessionId,
        };

        next();
    } catch (error: unknown) {
        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};

export const authorize = (...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Forbidden",
            });
        }

        next();
    };
};
