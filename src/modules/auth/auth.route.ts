import { Router } from "express";
import { login, register } from "./auth.controller.js";

const router = Router();

router.post("/register", register); // Only for Email and Password
router.post("/login", login); // Only for Email and Password

export default router;

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
