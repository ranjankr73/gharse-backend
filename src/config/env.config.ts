import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "production" | "test";
type Duration = `${number}${"s" | "m" | "h" | "d"}`;

function getEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

function getNodeEnv(): NodeEnv {
    const env = getEnv("NODE_ENV");

    if (env !== "development" && env !== "production" && env !== "test") {
        throw new Error("NODE_ENV must be development, production, or test");
    }

    return env;
}

function getNumberEnv(name: string): number {
    const value = getEnv(name);
    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
        throw new Error(`${name} must be a valid number`);
    }

    return parsed;
}

function getDurationEnv(name: string): Duration {
    const value = getEnv(name);

    if (!/^\d+[smhd]$/.test(value)) {
        throw new Error(`${name} must be in format like 15m, 7d, 30s, 1h`);
    }

    return value as Duration;
}

const config = {
    PORT: getNumberEnv("PORT"),

    NODE_ENV: getNodeEnv(),

    CLIENT_ORIGIN: getEnv("CLIENT_ORIGIN"),

    POSTGRES_URI: getEnv("POSTGRES_URI"),

    REDIS_URL: getEnv("REDIS_URL"),

    REDIS_HOST: getEnv("REDIS_HOST"),

    REDIS_PORT: getNumberEnv("REDIS_PORT"),

    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET"),

    REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),

    ACCESS_TOKEN_EXPIRY: getDurationEnv("ACCESS_TOKEN_EXPIRY"),

    REFRESH_TOKEN_EXPIRY: getDurationEnv("REFRESH_TOKEN_EXPIRY"),

    GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
} as const;

export default config;
