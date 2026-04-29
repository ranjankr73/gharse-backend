import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    createCategory,
    updateCategory,
    deleteCategory,
    adminGetAllCategories,
    getCategories,
    getCategoryBySlug,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    getShopSubCategories,
} from "../controllers/category.controller.js";

const categoryRouter = Router();

// ── Public ────────────────────────────────────────────────
categoryRouter.get("/", getCategories);
categoryRouter.get("/:slug", getCategoryBySlug);

// ── Admin ─────────────────────────────────────────────────
categoryRouter.get("/admin/all", protect, authorizeRoles("admin"), adminGetAllCategories);
categoryRouter.post("/", protect, authorizeRoles("admin"), createCategory);
categoryRouter.patch("/:categoryId", protect, authorizeRoles("admin"), updateCategory);
categoryRouter.delete("/:categoryId", protect, authorizeRoles("admin"), deleteCategory);

// ── Shop Owner SubCategories ──────────────────────────────
categoryRouter.get("/shops/:shopId/subcategories", getShopSubCategories);
categoryRouter.post("/shops/:shopId/subcategories", protect, authorizeRoles("shopOwner"), createSubCategory);
categoryRouter.patch("/shops/:shopId/subcategories/:subCategoryId", protect, authorizeRoles("shopOwner"), updateSubCategory);
categoryRouter.delete("/shops/:shopId/subcategories/:subCategoryId", protect, authorizeRoles("shopOwner"), deleteSubCategory);

export default categoryRouter;