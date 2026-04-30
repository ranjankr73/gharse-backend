import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    createProduct,
    updateProduct,
    toggleProductAvailability,
    updateProductStock,
    deleteProduct,
    getMyProducts,
    getMyProductById,
    getPublicShopProducts,
    getPublicProductById,
    browseProducts,
    adminGetAllProducts,
    adminToggleProductActive,
} from "../controllers/product.controller.js";

const productRouter = Router();

// ── Public ────────────────────────────────────────────────
productRouter.get("/public", browseProducts);
productRouter.get("/public/:productId", getPublicProductById);
productRouter.get("/public/shops/:shopId", getPublicShopProducts);

// ── Shop Owner ────────────────────────────────────────────
productRouter.get("/shops/:shopId", protect, authorizeRoles("partner"), getMyProducts);
productRouter.get("/shops/:shopId/:productId", protect, authorizeRoles("partner"), getMyProductById);
productRouter.post("/shops/:shopId", protect, authorizeRoles("partner"), createProduct);
productRouter.patch("/shops/:shopId/:productId", protect, authorizeRoles("partner"), updateProduct);
productRouter.patch("/shops/:shopId/:productId/toggle-availability", protect, authorizeRoles("partner"), toggleProductAvailability);
productRouter.patch("/shops/:shopId/:productId/stock", protect, authorizeRoles("partner"), updateProductStock);
productRouter.delete("/shops/:shopId/:productId", protect, authorizeRoles("partner"), deleteProduct);

// ── Admin ─────────────────────────────────────────────────
productRouter.get("/admin", protect, authorizeRoles("admin"), adminGetAllProducts);
productRouter.patch("/admin/:productId/toggle-active", protect, authorizeRoles("admin"), adminToggleProductActive);

export default productRouter;