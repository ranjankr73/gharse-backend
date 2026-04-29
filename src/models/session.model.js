import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            index: true,
        },
        refreshToken: {
            type: String,
            required: [true, "Refresh token is required"],
            select: false,
        },
        ipAddress: {
            type: String,
            required: [true, "IP Address is required"],
        },
        userAgent: {
            type: String,
            required: [true, "User agent is required"],
        },
        deviceName: {
            type: String,
        },
        isRevoked: {
            type: Boolean,
            default: false,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
        lastUsedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
