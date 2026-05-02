import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import config from "../config/env.config.js";
import redis from "../config/redis.config.js";

export const register = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const ALLOWED_ROLES = ["customer", "partner", "rider"];
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Invalid role",
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });
        if (existingUser) {
            return res.status(409).json({
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role,
        });

        const refreshToken = jwt.sign(
            { id: user._id, role: user.role },
            config.REFRESH_TOKEN_SECRET,
            {
                expiresIn: config.REFRESH_TOKEN_EXPIRY,
            },
        );

        const hashedRefreshToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await Session.create({
            user: user._id,
            refreshToken: hashedRefreshToken,
            ipAddress,
            userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const redisData = await redis.set(
            `session:${session._id.toString()}`,
            JSON.stringify({
                userId: user._id,
                role: user.role,
                isRevoked: false,
            }),
            "EX",
            7 * 24 * 60 * 60,
        );

        await redis.sadd(`user:${user._id.toString()}:sessions`, session._id.toString());

        const accessToken = jwt.sign(
            { id: user._id, role: user.role, session: session._id },
            config.ACCESS_TOKEN_SECRET,
            {
                expiresIn: config.ACCESS_TOKEN_EXPIRY,
            },
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
            token: accessToken,
        });
    } catch (error) {
        console.error("REGISTER ERROR: ", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "User already exists",
            });
        }

        return res.status(500).json({
            message: "Internal Server Error while registering user",
        });
    }
};

export const createAdminUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            role: "admin",
        });

        return res.status(201).json({
            message: "Admin user created successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("CREATE ADMIN ERROR:", error);
        if (error.code === 11000) {
            return res.status(409).json({ message: "User already exists" });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const userAgent = req.headers["user-agent"];

        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select(
            "+password",
        );
        if (!user) {
            return res.status(404).json({
                message: "Invalid email or password",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const refreshToken = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            config.REFRESH_TOKEN_SECRET,
            {
                expiresIn: config.REFRESH_TOKEN_EXPIRY,
            },
        );

        const hashedRefreshToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await Session.create({
            user: user._id,
            refreshToken: hashedRefreshToken,
            ipAddress,
            userAgent,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        await redis.set(
            `session:${session._id.toString()}`,
            JSON.stringify({
                userId: user._id,
                role: user.role,
                isRevoked: false,
            }),
            "EX",
            7 * 24 * 60 * 60,
        );

        await redis.sadd(`user:${user._id.toString()}:sessions`, session._id.toString());

        const accessToken = jwt.sign(
            {
                id: user._id,
                role: user.role,
                session: session._id,
            },
            config.ACCESS_TOKEN_SECRET,
            {
                expiresIn: config.ACCESS_TOKEN_EXPIRY,
            },
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "User logged in successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
            token: accessToken,
        });
    } catch (error) {
        console.error("LOGIN ERROR: ", error);

        return res.status(500).json({
            message: "Internal Server Error while logging in user",
        });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("GET_ME ERROR: ", error);

        return res.status(500).json({
            message: "Internal Server Error while fetching user",
        });
    }
};

export const rotateToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
        } catch (error) {
            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }

        const hashedRefreshToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await Session.findOne({
            refreshToken: hashedRefreshToken,
            isRevoked: false,
        }).select("+refreshToken");

        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({
                message: "Session invalid or expired",
            });
        }

        const user = await User.findById(session.user).select("role isActive");
        if (!user || user.isActive === false) {
            return res.status(401).json({
                message: "Account not found or suspended",
            });
        }

        const newRefreshToken = jwt.sign(
            {
                id: user._id,
                role: user.role,
                session: session._id,
            },
            config.REFRESH_TOKEN_SECRET,
            {
                expiresIn: config.REFRESH_TOKEN_EXPIRY,
            },
        );

        const newHashedRefreshToken = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        session.refreshToken = newHashedRefreshToken;
        session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await session.save();

        await redis.set(
            `session:${session._id.toString()}`,
            JSON.stringify({
                userId: user._id,
                role: user.role,
                isRevoked: false,
            }),
            "EX",
            7 * 24 * 60 * 60,
        );

        const accessToken = jwt.sign(
            {
                id: user._id,
                role: user.role,
                session: session._id,
            },
            config.ACCESS_TOKEN_SECRET,
            {
                expiresIn: config.ACCESS_TOKEN_EXPIRY,
            },
        );

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "Token rotated successfully",
            token: accessToken,
        });
    } catch (error) {
        console.error("ROTATE_TOKEN ERROR: ", error);

        return res.status(500).json({
            message: "Internal Server Error while rotating token",
        });
    }
};

export const logout = async (req, res) => {
    try {
        await redis.del(`session:${req.user.session.toString()}`);

        await redis.srem(`user:sessions:${req.user.id.toString()}`, req.user.session);

        await Session.findByIdAndUpdate(req.user.session, { isRevoked: true });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
        });

        return res.status(200).json({
            message: "User logged out successfully",
        });
    } catch (error) {
        console.error("LOGOUT ERROR: ", error);

        return res.status(500).json({
            message: "Internal Server Error while logging out user",
        });
    }
};

export const logoutAll = async (req, res) => {
    try {
        const sessionIds = await redis.sMembers(`user:sessions:${req.user.id.toString()}`);
        if (sessionIds.length) {
            await Promise.all(
                sessionIds.map((id) => redis.del(`session:${id}`)),
            );
            await redis.del(`user:sessions:${req.user.id.toString()}`);
        }

        await Session.updateMany(
            {
                user: req.user.id,
                isRevoked: false,
            },
            { isRevoked: true },
        );

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "none",
        });

        return res.status(200).json({
            message: "Logged out from all devices",
        });
    } catch (error) {
        console.error("LOGOUT_ALL ERROR: ", error);

        res.status(500).json({
            message: "Internal Server Error while logging out from all devices",
        });
    }
};

// import UAParser from "ua-parser-js";

// const parser = new UAParser(userAgent);
// const { browser, os } = parser.getResult();
// const deviceName = `${browser.name} on ${os.name}`; // "Chrome on Windows"
