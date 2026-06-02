import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import ms from "ms";
import { OAuth2Client, TokenPayload } from "google-auth-library";

import redis from "../../config/redis.config.js";
import config from "../../config/env.config.js";

import * as authRepository from "./auth.repository.js";

import { LoginInput, RegisterInput, GoogleAuthInput } from "./auth.types.js";
import { Role } from "../../../generated/prisma/client.js";

import { ValidationError } from "../../shared/errors/ValidationError.js";
import { ConflictError } from "../../shared/errors/ConflictError.js";
import { UnauthorizedError } from "../../shared/errors/UnauthorizedError.js";

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

export const registerUser = async (userData: RegisterInput) => {
    const { name, email, password, role, ipAddress, userAgent } = userData;

    if (!name || !email || !password || !role) {
        throw new ValidationError({
            name: !name ? ["Name is required"] : [],
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
        name: name,
        email,
        password: hashedPassword,
        role,
        authProvider: "LOCAL",
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
        config.ACCESS_TOKEN_SECRET as jwt.Secret,
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

export const loginUser = async (userData: LoginInput) => {
    const { email, password, ipAddress, userAgent } = userData;

    if (!email || !password) {
        throw new ValidationError({
            email: !email ? ["Email is required"] : [],
            password: !password ? ["Password is required"] : [],
        });
    }

    const existingUser = await authRepository.findUserByEmail(email);
    if (!existingUser) {
        throw new UnauthorizedError({
            message: "Invalid email or password",
        });
    }

    if (!existingUser.password) {
        throw new UnauthorizedError({
            message:
                "This account uses Google sign-in. Please continue with Google.",
        });
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        existingUser.password,
    );
    if (!isPasswordCorrect) {
        throw new UnauthorizedError({
            message: "Invalid email or password",
        });
    }

    const sessionId = crypto.randomUUID();

    const refreshToken = jwt.sign(
        { id: existingUser.id, role: existingUser.role, session: sessionId },
        config.REFRESH_TOKEN_SECRET as jwt.Secret,
        {
            expiresIn: config.REFRESH_TOKEN_EXPIRY,
        },
    );

    const hashedRefreshToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const session = await authRepository.createSession({
        id: sessionId,
        userId: existingUser.id,
        refreshTokenHash: hashedRefreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + ms(config.REFRESH_TOKEN_EXPIRY)),
    });

    const redisData = await redis.set(
        `session:${session.id.toString()}`,
        JSON.stringify({
            userId: existingUser.id,
            role: existingUser.role,
            isRevoked: false,
        }),
        "EX",
        7 * 24 * 60 * 60,
    );

    await redis.sadd(
        `user:${existingUser.id.toString()}:sessions`,
        session.id.toString(),
    );

    const accessToken = jwt.sign(
        { id: existingUser.id, role: existingUser.role, session: session.id },
        config.ACCESS_TOKEN_SECRET as jwt.Secret,
        {
            expiresIn: config.ACCESS_TOKEN_EXPIRY,
        },
    );

    return {
        user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
        },
        accessToken,
        refreshToken,
    };
};

export const authenticateWithGoogle = async (userData: GoogleAuthInput) => {
    const { googleToken, role, ipAddress, userAgent } = userData;

    if (!googleToken || !role) {
        throw new ValidationError({
            googleToken: !googleToken ? ["Google token is required"] : [],
            role: !role ? ["Role is required"] : [],
        });
    }

    if (!["CUSTOMER", "PARTNER", "RIDER"].includes(role)) {
        throw new ValidationError({
            role: ["Role must be one of CUSTOMER, PARTNER, or RIDER"],
        });
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new UnauthorizedError({
            message: "Invalid Google token",
        });
    }

    const { sub, email, name, picture } = ticket.getPayload() as TokenPayload;

    let existingUser = await authRepository.findUserByEmail(email!);

    if (!existingUser) {
        existingUser = await authRepository.createUser({
            name,
            email,
            role,
            authProvider: "GOOGLE",
            providerId: sub,
            avatarUrl: picture,
        });
    }

    const sessionId = crypto.randomUUID();

    const refreshToken = jwt.sign(
        { id: existingUser.id, role: existingUser.role, session: sessionId },
        config.REFRESH_TOKEN_SECRET as jwt.Secret,
        {
            expiresIn: config.REFRESH_TOKEN_EXPIRY,
        },
    );

    const hashedRefreshToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const session = await authRepository.createSession({
        id: sessionId,
        userId: existingUser.id,
        refreshTokenHash: hashedRefreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + ms(config.REFRESH_TOKEN_EXPIRY)),
    });

    const redisData = await redis.set(
        `session:${session.id.toString()}`,
        JSON.stringify({
            userId: existingUser.id,
            role: existingUser.role,
            isRevoked: false,
        }),
        "EX",
        7 * 24 * 60 * 60,
    );

    await redis.sadd(
        `user:${existingUser.id.toString()}:sessions`,
        session.id.toString(),
    );

    const accessToken = jwt.sign(
        { id: existingUser.id, role: existingUser.role, session: session.id },
        config.ACCESS_TOKEN_SECRET as jwt.Secret,
        {
            expiresIn: config.ACCESS_TOKEN_EXPIRY,
        },
    );

    return {
        user: {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
        },
        accessToken,
        refreshToken,
    };
};
