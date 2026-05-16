import mongoose from "mongoose";
import config from "./env.config.js";

async function connectDB(){
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (error: any) {
        console.error("❌ MongoDB connection failed: ", error.message);
        process.exit(1);
    }
}

export default connectDB;