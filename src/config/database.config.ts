import mongoose from "mongoose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import config from "./env.config.js";

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (error: any) {
        console.error("❌ MongoDB connection failed: ", error.message);
        process.exit(1);
    }
};

const adapter = new PrismaPg({ connectionString: config.POSTGRES_URI });
export const prisma = new PrismaClient({ adapter });

export default connectDB;
