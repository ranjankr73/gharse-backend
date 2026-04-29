import dotenv from "dotenv";

dotenv.config();

if (!process.env.PORT) {
    throw new Error(
        "PORT is not defined in environment variable",
    );
}

if (!process.env.NODE_ENV) {
    throw new Error(
        "NODE_ENV is not defined in environment variable",
    );
}

if (!process.env.CLIENT_ORIGIN) {
    throw new Error("CLIENT_ORIGIN is not defined in environment variable");
}

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variable");
}

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not defined in environment variable");
}

if (!process.env.REDIS_HOST) {
    throw new Error("REDIS_HOST is not defined in environment variable");
}

if (!process.env.REDIS_PORT) {
    throw new Error("REDIS_PORT is not defined in environment variable");
}

// if (!process.env.REDIS_PASSWORD) {
//     throw new Error("REDIS_PASSWORD is not defined in environment variable");
// }

if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error(
        "ACCESS_TOKEN_SECRET is not defined in environment variable",
    );
}

if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error(
        "REFRESH_TOKEN_SECRET is not defined in environment variable",
    );
}

if (!process.env.ACCESS_TOKEN_EXPIRY) {
    throw new Error(
        "ACCESS_TOKEN_EXPIRY is not defined in environment variable",
    );
}

if (!process.env.REFRESH_TOKEN_EXPIRY) {
    throw new Error(
        "REFRESH_TOKEN_EXPIRY is not defined in environment variable",
    );
}

const config = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
    MONGODB_URI: process.env.MONGODB_URI,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: parseInt(process.env.REDIS_PORT),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_EXPIRY,
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
};

export default config;
