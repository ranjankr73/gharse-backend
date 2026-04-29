import Product from "../models/product.model.js";
import Shop from "../models/shop.model.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";

// ============================================================
// HELPERS
// ============================================================

const verifyShopOwnership = async (shopId, userId) => {
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    return shop;
};

// ============================================================
// SHOP OWNER CONTROLLERS
// ============================================================

// POST /api/v1/shops/:shopId/products
export const createProduct = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const {
            name,
            description,
            images,
            categoryId,
            subCategoryId,
            price,
            discountPrice,
            unit,
            variants,
            stock,
            lowStockThreshold,
            isFeatured,
        } = req.body;

        if (!name || !categoryId) {
            return res.status(400).json({ message: "Name and category are required" });
        }

        // Verify category exists and is active
        const category = await Category.findOne({ _id: categoryId, isActive: true });
        if (!category) {
            return res.status(404).json({ message: "Category not found or inactive" });
        }

        // Verify subCategory belongs to this shop
        if (subCategoryId) {
            const subCategory = await SubCategory.findOne({
                _id: subCategoryId,
                shop: shopId,
                isActive: true,
            });
            if (!subCategory) {
                return res.status(404).json({ message: "SubCategory not found or inactive" });
            }
        }

        // Must have price or variants
        const hasPrice = price !== undefined && price !== null;
        const hasVariants = variants && variants.length > 0;
        if (!hasPrice && !hasVariants) {
            return res.status(400).json({
                message: "Product must have either a price or at least one variant",
            });
        }

        const product = await Product.create({
            name,
            description,
            images: images ?? [],
            shop: shopId,
            category: categoryId,
            subCategory: subCategoryId ?? null,
            price: hasVariants ? null : price,
            discountPrice: hasVariants ? null : (discountPrice ?? null),
            unit,
            variants: hasVariants ? variants : [],
            stock: hasVariants ? 0 : (stock ?? 0),
            lowStockThreshold: lowStockThreshold ?? 5,
            isFeatured: isFeatured ?? false,
        });

        return res.status(201).json({
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        console.error("CREATE PRODUCT ERROR:", error);
        if (error.message.includes("price or at least one variant")) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/products/:productId
export const updateProduct = async (req, res) => {
    try {
        const { shopId, productId } = req.params;

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const product = await Product.findOne({ _id: productId, shop: shopId, isActive: true });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const {
            name,
            description,
            images,
            categoryId,
            subCategoryId,
            price,
            discountPrice,
            unit,
            variants,
            stock,
            lowStockThreshold,
            isAvailable,
            isFeatured,
        } = req.body;

        if (categoryId) {
            const category = await Category.findOne({ _id: categoryId, isActive: true });
            if (!category) {
                return res.status(404).json({ message: "Category not found or inactive" });
            }
            product.category = categoryId;
        }

        if (subCategoryId !== undefined) {
            if (subCategoryId) {
                const subCategory = await SubCategory.findOne({
                    _id: subCategoryId,
                    shop: shopId,
                    isActive: true,
                });
                if (!subCategory) {
                    return res.status(404).json({ message: "SubCategory not found or inactive" });
                }
            }
            product.subCategory = subCategoryId ?? null;
        }

        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (images !== undefined) product.images = images;
        if (unit !== undefined) product.unit = unit;
        if (isFeatured !== undefined) product.isFeatured = isFeatured;
        if (isAvailable !== undefined) product.isAvailable = isAvailable;
        if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;

        // Variants take priority over flat price
        if (variants !== undefined) {
            product.variants = variants;
            if (variants.length > 0) {
                product.price = null;
                product.discountPrice = null;
            }
        }

        if (product.variants.length === 0) {
            if (price !== undefined) product.price = price;
            if (discountPrice !== undefined) product.discountPrice = discountPrice;
            if (stock !== undefined) {
                product.stock = stock;
                if (stock === 0) product.isAvailable = false;
            }
        }

        await product.save();

        return res.status(200).json({
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        console.error("UPDATE PRODUCT ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/products/:productId/toggle-availability
export const toggleProductAvailability = async (req, res) => {
    try {
        const { shopId, productId } = req.params;

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const product = await Product.findOne({ _id: productId, shop: shopId, isActive: true });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        product.isAvailable = !product.isAvailable;
        await product.save();

        return res.status(200).json({
            message: `Product marked as ${product.isAvailable ? "available" : "unavailable"}`,
            isAvailable: product.isAvailable,
        });
    } catch (error) {
        console.error("TOGGLE PRODUCT AVAILABILITY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/products/:productId/stock
export const updateProductStock = async (req, res) => {
    try {
        const { shopId, productId } = req.params;
        const { stock, variantId } = req.body;

        if (stock === undefined || stock < 0) {
            return res.status(400).json({ message: "Valid stock value is required" });
        }

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const product = await Product.findOne({ _id: productId, shop: shopId, isActive: true });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (variantId) {
            // Update specific variant stock
            const variant = product.variants.id(variantId);
            if (!variant) {
                return res.status(404).json({ message: "Variant not found" });
            }
            variant.stock = stock;
            variant.isAvailable = stock > 0;
        } else {
            // Update root stock
            product.stock = stock;
            product.isAvailable = stock > 0;
        }

        product.markModified("variants");
        await product.save();

        const isLowStock = variantId
            ? false
            : stock <= product.lowStockThreshold && stock > 0;

        return res.status(200).json({
            message: "Stock updated successfully",
            stock: variantId ? product.variants.id(variantId)?.stock : product.stock,
            isLowStock,
        });
    } catch (error) {
        console.error("UPDATE STOCK ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/shops/:shopId/products/:productId — soft delete
export const deleteProduct = async (req, res) => {
    try {
        const { shopId, productId } = req.params;

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const product = await Product.findOne({ _id: productId, shop: shopId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        product.isActive = false;
        product.isAvailable = false;
        await product.save();

        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/shops/:shopId/products — shop owner view (all products)
export const getMyProducts = async (req, res) => {
    try {
        const { shopId } = req.params;
        const {
            page = 1,
            limit = 20,
            categoryId,
            subCategoryId,
            isAvailable,
            isFeatured,
            search,
        } = req.query;

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const query = { shop: shopId, isActive: true };

        if (categoryId) query.category = categoryId;
        if (subCategoryId) query.subCategory = subCategoryId;
        if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
        if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
        if (search) query.$text = { $search: search };

        const skip = (Number(page) - 1) * Number(limit);

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate("category", "name slug")
                .populate("subCategory", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalProducts: total,
            products,
        });
    } catch (error) {
        console.error("GET MY PRODUCTS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/shops/:shopId/products/:productId — owner detail view
export const getMyProductById = async (req, res) => {
    try {
        const { shopId, productId } = req.params;

        const shop = await verifyShopOwnership(shopId, req.user.id);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const product = await Product.findOne({ _id: productId, shop: shopId, isActive: true })
            .populate("category", "name slug")
            .populate("subCategory", "name");

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({ product });
    } catch (error) {
        console.error("GET MY PRODUCT BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// PUBLIC / CUSTOMER CONTROLLERS
// ============================================================

// GET /api/v1/products/public/shops/:shopId — public menu view
export const getPublicShopProducts = async (req, res) => {
    try {
        const { shopId } = req.params;
        const {
            page = 1,
            limit = 20,
            categoryId,
            subCategoryId,
            isFeatured,
            search,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        // Verify shop is public
        const shop = await Shop.findOne({ _id: shopId, isVerified: true, isActive: true });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const query = {
            shop: shopId,
            isActive: true,
            isAvailable: true,
        };

        if (categoryId) query.category = categoryId;
        if (subCategoryId) query.subCategory = subCategoryId;
        if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
        if (search) query.$text = { $search: search };

        const allowedSortFields = ["price", "rating", "createdAt", "name"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const skip = (Number(page) - 1) * Number(limit);

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate("category", "name slug")
                .populate("subCategory", "name")
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(Number(limit)),
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalProducts: total,
            products,
        });
    } catch (error) {
        console.error("GET PUBLIC SHOP PRODUCTS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/products/public/:productId — single product public view
export const getPublicProductById = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findOne({
            _id: productId,
            isActive: true,
            isAvailable: true,
        })
            .populate("category", "name slug")
            .populate("subCategory", "name")
            .populate("shop", "name logo deliveryTime deliveryFee isOpen");

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({ product });
    } catch (error) {
        console.error("GET PUBLIC PRODUCT BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/products/public?categoryId=&search= — browse all products across shops
export const browseProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            categoryId,
            subCategoryId,
            search,
            minPrice,
            maxPrice,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const query = { isActive: true, isAvailable: true };

        if (categoryId) query.category = categoryId;
        if (subCategoryId) query.subCategory = subCategoryId;
        if (search) query.$text = { $search: search };

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const allowedSortFields = ["price", "rating", "createdAt"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const skip = (Number(page) - 1) * Number(limit);

        // Only products from verified + active shops
        const [products, total] = await Promise.all([
            Product.find(query)
                .populate({
                    path: "shop",
                    match: { isVerified: true, isActive: true },
                    select: "name logo deliveryTime deliveryFee isOpen",
                })
                .populate("category", "name slug")
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(Number(limit))
                .then(products => products.filter(p => p.shop !== null)), // remove unverified shop products
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalProducts: total,
            products,
        });
    } catch (error) {
        console.error("BROWSE PRODUCTS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /api/v1/products/admin
export const adminGetAllProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            shopId,
            categoryId,
            isActive,
            isAvailable,
            search,
        } = req.query;

        const query = {};

        if (shopId) query.shop = shopId;
        if (categoryId) query.category = categoryId;
        if (isActive !== undefined) query.isActive = isActive === "true";
        if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
        if (search) query.$text = { $search: search };

        const skip = (Number(page) - 1) * Number(limit);

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate("shop", "name owner")
                .populate("category", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalProducts: total,
            products,
        });
    } catch (error) {
        console.error("ADMIN GET PRODUCTS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/products/admin/:productId/toggle-active
export const adminToggleProductActive = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        product.isActive = !product.isActive;
        if (!product.isActive) product.isAvailable = false;
        await product.save();

        return res.status(200).json({
            message: `Product ${product.isActive ? "activated" : "deactivated"}`,
            isActive: product.isActive,
        });
    } catch (error) {
        console.error("ADMIN TOGGLE PRODUCT ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};