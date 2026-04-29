import jwt from "jsonwebtoken";
import config from "../config/env.config.js";
import redis from "../config/redis.config.js";

export const protect = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
        } catch (err) {
            return res.status(401).json({
                message: "Invalid or expired token",
            });
        }

        const sessionData = await redis.get(`session:${decoded.session}`);

        if (!sessionData) {
            return res.status(401).json({
                message: "Session expired",
            });
        }

        const session = JSON.parse(sessionData);

        if (session.isRevoked) {
            return res.status(401).json({
                message: "Session revoked",
            });
        }

        req.user = {
            id: decoded.id,
            role: decoded.role,
            session: decoded.session,
        };

        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(500).json({
            message: "Internal Server Error while authenticating user",
        });
    }
};

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Forbidden: insufficient permissions",
                ...(config.NODE_ENV === "development" && {
                    required: allowedRoles,
                    current: req.user.role,
                }),
            });
        }

        next();
    };
};
