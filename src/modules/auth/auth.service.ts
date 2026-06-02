import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import ms from "ms";
import { OAuth2Client, TokenPayload } from "google-auth-library";

import redis from "../../config/redis.config.js";
import config from "../../config/env.config.js";

import * as authRepository from "./auth.repository.js";

import {
    LoginInput,
    RegisterInput,
    GoogleAuthInput,
    OTPAuthInput,
    AuthTokenPayload,
} from "./auth.types.js";

import {
    ValidationError,
    ConflictError,
    UnauthorizedError,
} from "../../shared/errors/index.js";

import { generateOTP } from "../../shared/utils/otp.util.js";

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
        {
            sub: newUser.id,
            role: newUser.role,
            sessionId: sessionId,
        } as AuthTokenPayload,
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
        {
            sub: newUser.id,
            role: newUser.role,
            sessionId: session.id,
        } as AuthTokenPayload,
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
            phone: newUser.phone,
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
        {
            sub: existingUser.id,
            role: existingUser.role,
            sessionId: sessionId,
        } as AuthTokenPayload,
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
        {
            sub: existingUser.id,
            role: existingUser.role,
            sessionId: session.id,
        } as AuthTokenPayload,
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
            phone: existingUser.phone,
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
        {
            sub: existingUser.id,
            role: existingUser.role,
            sessionId: sessionId,
        } as AuthTokenPayload,
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
        {
            sub: existingUser.id,
            role: existingUser.role,
            sessionId: session.id,
        } as AuthTokenPayload,
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
            phone: existingUser.phone,
            role: existingUser.role,
        },
        accessToken,
        refreshToken,
    };
};

export const sendPhoneAuthOTP = async (userData: { phoneNumber: string }) => {
    const { phoneNumber } = userData;

    if (!phoneNumber) {
        throw new ValidationError({
            phoneNumber: ["Phone number is required"],
        });
    }

    const otp = generateOTP(6);

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    await redis.set(`otp:${phoneNumber}:auth`, hashedOTP, "EX", 5 * 60);

    if (config.NODE_ENV === "development") {
        console.log(`Generated OTP for ${phoneNumber}: ${otp}`);
    }

    // TODO: Integrate with SMS provider to send the OTP to the user's phone number

    return {
        message: "OTP sent to phone number",
    };
};

export const authenticateWithPhoneOTP = async (userData: OTPAuthInput) => {
    const { phoneNumber, otp, role, ipAddress, userAgent } = userData;

    if (!phoneNumber || !otp || !role) {
        throw new ValidationError({
            phoneNumber: !phoneNumber ? ["Phone number is required"] : [],
            otp: !otp ? ["OTP is required"] : [],
            role: !role ? ["Role is required"] : [],
        });
    }

    if (!["CUSTOMER", "PARTNER", "RIDER"].includes(role)) {
        throw new ValidationError({
            role: ["Role must be one of CUSTOMER, PARTNER, or RIDER"],
        });
    }

    const storedHashedOTP = await redis.get(`otp:${phoneNumber}:auth`);

    if (!storedHashedOTP) {
        throw new UnauthorizedError({
            message: "OTP has expired or is invalid",
        });
    }

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOTP !== storedHashedOTP) {
        throw new UnauthorizedError({
            message: "Invalid OTP",
        });
    }

    await redis.del(`otp:${phoneNumber}:auth`);

    let existingUser = await authRepository.findUserByPhoneNumber(phoneNumber);

    if (!existingUser) {
        existingUser = await authRepository.createUser({
            name: "User",
            phone: phoneNumber,
            role,
            authProvider: "OTP",
        });
    }

    const sessionId = crypto.randomUUID();

    const refreshToken = jwt.sign(
        {
            sub: existingUser.id,
            role: existingUser.role,
            sessionId: sessionId,
        } as AuthTokenPayload,
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
        {
            sub: existingUser.id,
            role: existingUser.role,
            sessionId: session.id,
        } as AuthTokenPayload,
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
            phone: existingUser.phone,
            role: existingUser.role,
        },
        accessToken,
        refreshToken,
    };
};
