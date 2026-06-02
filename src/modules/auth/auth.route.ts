import { Router } from "express";
import {
    login,
    register,
    googleAuth,
    verifyPhoneOTP,
    sendPhoneOTP,
} from "./auth.controller.js";

const router = Router();

router.post("/register", register); // Only for Email and Password
router.post("/login", login); // Only for Email and Password
router.post("/google", googleAuth); // Google Social Auth (Login or Register)
router.post("/send-otp", sendPhoneOTP); // Send OTP for Phone Authentication
router.post("/verify-otp", verifyPhoneOTP); // Verify OTP and Authenticate

export default router;

// Logout
// Refresh Token
// Forgot Password
// Reset Password
// Verify Email
// Verify OTP
// Verify Phone Number
// JWT Generation
// Session Management
// Role-Based Access Control (RBAC)
// Two-Factor Authentication (2FA)
// Social Authentication (Google, Facebook, etc.)
// Account Lockout
// Password Strength Validation
// Rate Limiting
// Email Notifications (for registration, password reset, etc.)
// Account Deletion
