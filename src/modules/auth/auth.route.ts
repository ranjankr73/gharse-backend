import { Router } from "express";
import { register } from "./auth.controller.js";

const router = Router();

router.post("/register", register);

export default router;

// Register -> Only for Email and Password

// Login -> Email/Password, Social Login (Google, Facebook, etc.) and OTP-based Login (Phone Number)

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
