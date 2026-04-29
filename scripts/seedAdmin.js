import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/user.model.js";
import config from "../src/config/env.config.js";

const seedAdmin = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log("✅ Connected to DB");

        const existing = await User.findOne({ email: "admin@gharse.com" });
        if (existing) {
            console.log("⚠️ Admin already exists");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash("Admin@123456", 12);

        await User.create({
            fullName: "GharSe Admin",
            email: "admin@gharse.com",
            password: hashedPassword,
            role: "admin",
        });

        console.log("✅ Admin created successfully");
        console.log("   Email:    admin@gharse.com");
        console.log("   Password: Admin@123456");
        console.log("   ⚠️  Change password after first login!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeder failed:", error.message);
        process.exit(1);
    }
};

seedAdmin();