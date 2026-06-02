import jwt from "jsonwebtoken";

import config from "../../config/env.config.js";
import { AuthTokenPayload } from "./auth.types.js";
import { Role } from "../../../generated/prisma/enums.js";

const createToken = (
    payload: AuthTokenPayload,
    secret: jwt.Secret,
    expiresIn: jwt.SignOptions["expiresIn"],
) => {
    return jwt.sign(payload, secret, {
        expiresIn,
    });
};

export const generateAccessToken = (
    userId: string,
    role: Role,
    sessionId: string,
) =>
    createToken(
        { sub: userId, role, sessionId },
        config.ACCESS_TOKEN_SECRET,
        config.ACCESS_TOKEN_EXPIRY,
    );

export const generateRefreshToken = (
    userId: string,
    role: Role,
    sessionId: string,
) =>
    createToken(
        { sub: userId, role, sessionId },
        config.REFRESH_TOKEN_SECRET,
        config.REFRESH_TOKEN_EXPIRY,
    );

export const verifyAccessToken = (token: string) => {
    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

    if (typeof decoded === "string") {
        throw new Error("Invalid token payload");
    }

    return decoded as AuthTokenPayload;
};

export const verifyRefreshToken = (token: string) => {
    const decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET);

    if (typeof decoded === "string") {
        throw new Error("Invalid token payload");
    }

    return decoded as AuthTokenPayload;
};
