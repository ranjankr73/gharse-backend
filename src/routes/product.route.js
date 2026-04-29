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
productRouter.get("/shops/:shopId", protect, authorizeRoles("shopOwner"), getMyProducts);
productRouter.get("/shops/:shopId/:productId", protect, authorizeRoles("shopOwner"), getMyProductById);
productRouter.post("/shops/:shopId", protect, authorizeRoles("shopOwner"), createProduct);
productRouter.patch("/shops/:shopId/:productId", protect, authorizeRoles("shopOwner"), updateProduct);
productRouter.patch("/shops/:shopId/:productId/toggle-availability", protect, authorizeRoles("shopOwner"), toggleProductAvailability);
productRouter.patch("/shops/:shopId/:productId/stock", protect, authorizeRoles("shopOwner"), updateProductStock);
productRouter.delete("/shops/:shopId/:productId", protect, authorizeRoles("shopOwner"), deleteProduct);

// ── Admin ─────────────────────────────────────────────────
productRouter.get("/admin", protect, authorizeRoles("admin"), adminGetAllProducts);
productRouter.patch("/admin/:productId/toggle-active", protect, authorizeRoles("admin"), adminToggleProductActive);

export default productRouter;