import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    getMe,
    login,
    createAdminUser,
    logout,
    logoutAll,
    register,
    rotateToken,
} from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post(
    "/admin/create-user",
    protect,
    authorizeRoles("admin"),
    createAdminUser
);
authRouter.get("/me", protect, getMe);
authRouter.post("/rotate-token", rotateToken);
authRouter.post("/logout", protect, logout);
authRouter.post("/logout-all", protect, logoutAll);

export default authRouter;
