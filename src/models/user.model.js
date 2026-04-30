import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                "Email must be valid",
            ],
        },
        password: {
            type: String,
            required: function () {
                return this.authProvider === "local";
            },
            select: false,
        },
        role: {
            type: String,
            enum: ["admin", "customer", "partner", "rider"],
            default: "customer",
        },
        googleId: {
            type: String,
            sparse: true,
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
