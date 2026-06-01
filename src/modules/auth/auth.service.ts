import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import ms from "ms";

import redis from "../../config/redis.config.js";
import config from "../../config/env.config.js";

import * as authRepository from "./auth.repository.js";

import { RegisterInput } from "./auth.types.js";
import { Role } from "../../../generated/prisma/client.js";

import { ValidationError } from "../../shared/errors/ValidationError.js";
import { ConflictError } from "../../shared/errors/ConflictError.js";

export const registerUser = async (userData: RegisterInput) => {
    const { fullName, email, password, role, ipAddress, userAgent } = userData;

    if (!fullName || !email || !password || !role) {
        throw new ValidationError({
            fullName: !fullName ? ["Full name is required"] : [],
            email: !email ? ["Email is required"] : [],
            password: !password ? ["Password is required"] : [],
            role: !role ? ["Role is required"] : [],
        });
    }

    if (!["CUSTOMER", "PARTNER", "RIDER"].includes(role)) {
        throw new ValidationError({
            role: ["Role must be one of CUSTOMER, PARTNER, or RIDER"],
        });
    }

    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        throw new ConflictError("Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await authRepository.createUser({
        name: fullName,
        email,
        password: hashedPassword,
        role: role as Role,
    });

    const sessionId = crypto.randomUUID();

    const refreshToken = jwt.sign(
        { id: newUser.id, role: newUser.role, session: sessionId },
        config.REFRESH_TOKEN_SECRET as jwt.Secret,
        {
            expiresIn: config.REFRESH_TOKEN_EXPIRY,
        },
    );

    const hashedRefreshToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    console.log("Refresh Token expires in:", config.REFRESH_TOKEN_EXPIRY); // Log 7

    console.log("Refresh Token expires in:", ms(config.REFRESH_TOKEN_EXPIRY)); // Log 7

    const session = await authRepository.createSession({
        id: sessionId,
        userId: newUser.id,
        refreshTokenHash: hashedRefreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + ms(config.REFRESH_TOKEN_EXPIRY)),
    });

    const redisData = await redis.set(
        `session:${session.id.toString()}`,
        JSON.stringify({
            userId: newUser.id,
            role: newUser.role,
            isRevoked: false,
        }),
        "EX",
        7 * 24 * 60 * 60,
    );

    await redis.sadd(
        `user:${newUser.id.toString()}:sessions`,
        session.id.toString(),
    );

    const accessToken = jwt.sign(
        { id: newUser.id, role: newUser.role, session: session.id },
        config.ACCESS_TOKEN_SECRET,
        {
            expiresIn: config.ACCESS_TOKEN_EXPIRY,
        },
    );

    return {
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        },
        accessToken,
        refreshToken,
    };
};
