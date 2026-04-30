import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    createShop,
    updateShopProfile,
    updateShopAddress,
    updateDeliverySettings,
    updateBusinessDetails,
    toggleShopStatus,
    getMyShops,
    getMyShopById,
    deleteShop,
    getPublicShops,
    getPublicShopById,
    adminGetAllShops,
    adminGetShopById,
    adminVerifyShop,
    adminToggleShopActive,
    adminDeleteShop,
} from "../controllers/shop.controller.js";

const shopRouter = Router();

// ── Public ───────────────────────────────────────────────
shopRouter.get("/public", getPublicShops);
shopRouter.get("/public/:shopId", getPublicShopById);

// ── Shop Owner ───────────────────────────────────────────
shopRouter.post("/", protect, authorizeRoles("partner"), createShop);
shopRouter.get("/my-shops", protect, authorizeRoles("partner"), getMyShops);
shopRouter.get("/my-shops/:shopId", protect, authorizeRoles("partner"), getMyShopById);
shopRouter.patch("/:shopId/profile", protect, authorizeRoles("partner"), updateShopProfile);
shopRouter.patch("/:shopId/address", protect, authorizeRoles("partner"), updateShopAddress);
shopRouter.patch("/:shopId/delivery-settings", protect, authorizeRoles("partner"), updateDeliverySettings);
shopRouter.patch("/:shopId/business-details", protect, authorizeRoles("partner"), updateBusinessDetails);
shopRouter.patch("/:shopId/toggle-status", protect, authorizeRoles("partner"), toggleShopStatus);
shopRouter.delete("/:shopId", protect, authorizeRoles("partner"), deleteShop);

// ── Admin ─────────────────────────────────────────────────
shopRouter.get("/admin", protect, authorizeRoles("admin"), adminGetAllShops);
shopRouter.get("/admin/:shopId", protect, authorizeRoles("admin"), adminGetShopById);
shopRouter.patch("/admin/:shopId/verify", protect, authorizeRoles("admin"), adminVerifyShop);
shopRouter.patch("/admin/:shopId/toggle-active", protect, authorizeRoles("admin"), adminToggleShopActive);
shopRouter.delete("/admin/:shopId", protect, authorizeRoles("admin"), adminDeleteShop);

export default shopRouter;