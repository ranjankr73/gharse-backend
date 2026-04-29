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
shopRouter.post("/", protect, authorizeRoles("shopOwner"), createShop);
shopRouter.get("/my-shops", protect, authorizeRoles("shopOwner"), getMyShops);
shopRouter.get("/my-shops/:shopId", protect, authorizeRoles("shopOwner"), getMyShopById);
shopRouter.patch("/:shopId/profile", protect, authorizeRoles("shopOwner"), updateShopProfile);
shopRouter.patch("/:shopId/address", protect, authorizeRoles("shopOwner"), updateShopAddress);
shopRouter.patch("/:shopId/delivery-settings", protect, authorizeRoles("shopOwner"), updateDeliverySettings);
shopRouter.patch("/:shopId/business-details", protect, authorizeRoles("shopOwner"), updateBusinessDetails);
shopRouter.patch("/:shopId/toggle-status", protect, authorizeRoles("shopOwner"), toggleShopStatus);
shopRouter.delete("/:shopId", protect, authorizeRoles("shopOwner"), deleteShop);

// ── Admin ─────────────────────────────────────────────────
shopRouter.get("/admin", protect, authorizeRoles("admin"), adminGetAllShops);
shopRouter.get("/admin/:shopId", protect, authorizeRoles("admin"), adminGetShopById);
shopRouter.patch("/admin/:shopId/verify", protect, authorizeRoles("admin"), adminVerifyShop);
shopRouter.patch("/admin/:shopId/toggle-active", protect, authorizeRoles("admin"), adminToggleShopActive);
shopRouter.delete("/admin/:shopId", protect, authorizeRoles("admin"), adminDeleteShop);

export default shopRouter;