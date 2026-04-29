import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import Shop from "../models/shop.model.js";

// ============================================================
// ADMIN — Global Categories
// ============================================================

// POST /api/v1/categories
export const createCategory = async (req, res) => {
    try {
        const { name, description, image, displayOrder } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const category = await Category.create({
            name,
            description,
            image,
            displayOrder,
            createdBy: req.user.id,
        });

        return res.status(201).json({
            message: "Category created successfully",
            category,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Category already exists" });
        }
        console.error("CREATE CATEGORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/categories/:categoryId
export const updateCategory = async (req, res) => {
    try {
        const { name, description, image, displayOrder, isActive } = req.body;

        const category = await Category.findById(req.params.categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (name !== undefined) category.name = name;
        if (description !== undefined) category.description = description;
        if (image !== undefined) category.image = image;
        if (displayOrder !== undefined) category.displayOrder = displayOrder;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        return res.status(200).json({
            message: "Category updated successfully",
            category,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Category name already exists" });
        }
        console.error("UPDATE CATEGORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/categories/:categoryId — soft delete
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Soft delete — deactivate instead of removing
        // Hard delete would break subcategories and products referencing this
        category.isActive = false;
        await category.save();

        return res.status(200).json({ message: "Category deactivated successfully" });
    } catch (error) {
        console.error("DELETE CATEGORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/categories/admin — all categories including inactive
export const adminGetAllCategories = async (req, res) => {
    try {
        const categories = await Category.find()
            .sort({ displayOrder: 1, createdAt: -1 });

        return res.status(200).json({ categories });
    } catch (error) {
        console.error("ADMIN GET CATEGORIES ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// PUBLIC — Global Categories
// ============================================================

// GET /api/v1/categories — active only
export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select("-createdBy")
            .sort({ displayOrder: 1 });

        return res.status(200).json({ categories });
    } catch (error) {
        console.error("GET CATEGORIES ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/categories/:slug — single by slug
export const getCategoryBySlug = async (req, res) => {
    try {
        const category = await Category.findOne({
            slug: req.params.slug,
            isActive: true,
        }).select("-createdBy");

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        return res.status(200).json({ category });
    } catch (error) {
        console.error("GET CATEGORY BY SLUG ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// SHOP OWNER — SubCategories
// ============================================================

// POST /api/v1/shops/:shopId/subcategories
export const createSubCategory = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { name, description, image, categoryId, displayOrder } = req.body;

        if (!name || !categoryId) {
            return res.status(400).json({ message: "Name and category are required" });
        }

        // Ownership check
        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        // Verify global category exists and is active
        const category = await Category.findOne({ _id: categoryId, isActive: true });
        if (!category) {
            return res.status(404).json({ message: "Category not found or inactive" });
        }

        const subCategory = await SubCategory.create({
            name,
            description,
            image,
            shop: shopId,
            category: categoryId,
            displayOrder,
        });

        return res.status(201).json({
            message: "Subcategory created successfully",
            subCategory,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Subcategory already exists in this shop" });
        }
        console.error("CREATE SUBCATEGORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/subcategories/:subCategoryId
export const updateSubCategory = async (req, res) => {
    try {
        const { shopId, subCategoryId } = req.params;
        const { name, description, image, displayOrder, isActive } = req.body;

        // Ownership check
        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const subCategory = await SubCategory.findOne({ _id: subCategoryId, shop: shopId });
        if (!subCategory) {
            return res.status(404).json({ message: "Subcategory not found" });
        }

        if (name !== undefined) subCategory.name = name;
        if (description !== undefined) subCategory.description = description;
        if (image !== undefined) subCategory.image = image;
        if (displayOrder !== undefined) subCategory.displayOrder = displayOrder;
        if (isActive !== undefined) subCategory.isActive = isActive;

        await subCategory.save();

        return res.status(200).json({
            message: "Subcategory updated successfully",
            subCategory,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Subcategory name already exists in this shop" });
        }
        console.error("UPDATE SUBCATEGORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/shops/:shopId/subcategories/:subCategoryId
export const deleteSubCategory = async (req, res) => {
    try {
        const { shopId, subCategoryId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const subCategory = await SubCategory.findOne({ _id: subCategoryId, shop: shopId });
        if (!subCategory) {
            return res.status(404).json({ message: "Subcategory not found" });
        }

        // Soft delete
        subCategory.isActive = false;
        await subCategory.save();

        return res.status(200).json({ message: "Subcategory deactivated successfully" });
    } catch (error) {
        console.error("DELETE SUBCATEGORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/shops/:shopId/subcategories
export const getShopSubCategories = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { categoryId } = req.query;      // optional filter by global category

        const query = { shop: shopId, isActive: true };
        if (categoryId) query.category = categoryId;

        const subCategories = await SubCategory.find(query)
            .populate("category", "name slug image")
            .sort({ displayOrder: 1, createdAt: -1 });

        return res.status(200).json({ subCategories });
    } catch (error) {
        console.error("GET SHOP SUBCATEGORIES ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
