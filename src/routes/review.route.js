import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    createReview,
    getShopReviews,
    getProductReviews,
    deleteReview,
    adminToggleReviewVisibility,
} from "../controllers/review.controller.js";

const reviewRouter = Router();

// ── Public ────────────────────────────────────────────────
reviewRouter.get("/shop/:shopId", getShopReviews);
reviewRouter.get("/product/:productId", getProductReviews);

// ── Customer ──────────────────────────────────────────────
reviewRouter.post("/", protect, authorizeRoles("customer"), createReview);
reviewRouter.delete("/:reviewId", protect, authorizeRoles("customer"), deleteReview);

// ── Admin ─────────────────────────────────────────────────
reviewRouter.patch("/admin/:reviewId/toggle-visibility", protect, authorizeRoles("admin"), adminToggleReviewVisibility);

export default reviewRouter;