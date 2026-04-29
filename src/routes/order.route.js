import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    placeOrder,
    getMyOrders,
    getOrderById,
    cancelOrder,
    getShopOrders,
    updateOrderStatus,
    getShopOrderById,
    getShopStats,
    adminGetAllOrders,
    adminCancelOrder,
} from "../controllers/order.controller.js";

const orderRouter = Router();

// ── Customer ──────────────────────────────────────────────
orderRouter.post("/", protect, authorizeRoles("customer"), placeOrder);
orderRouter.get("/my", protect, authorizeRoles("customer"), getMyOrders);
orderRouter.get("/my/:orderId", protect, authorizeRoles("customer"), getOrderById);
orderRouter.post("/my/:orderId/cancel", protect, authorizeRoles("customer"), cancelOrder);

// ── Shop Owner ────────────────────────────────────────────
orderRouter.get("/shop/:shopId", protect, authorizeRoles("shopOwner"), getShopOrders);
orderRouter.get("/shop/:shopId/stats", protect, authorizeRoles("shopOwner"), getShopStats);
orderRouter.patch("/shop/:shopId/:orderId/status", protect, authorizeRoles("shopOwner"), updateOrderStatus);
orderRouter.get("/shop/:shopId/:orderId", protect, authorizeRoles("shopOwner"), getShopOrderById);

// ── Admin ─────────────────────────────────────────────────
orderRouter.get("/admin", protect, authorizeRoles("admin"), adminGetAllOrders);
orderRouter.patch("/admin/:orderId/cancel", protect, authorizeRoles("admin"), adminCancelOrder);

export default orderRouter;