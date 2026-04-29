import Shop from "../models/shop.model.js";

// ============================================================
// ONBOARDING STEPS
// 1 — Shop created (name + phone + email) -> email while signup
// 2 — Profile updated (logo, coverImage, tagline)
// 3 — Address added
// 4 — Delivery settings added (deliveryTime, deliveryFee, minOrder)
// 5 — Business details added (GST, PAN etc)
// Verified by admin → visible to customers
// ============================================================

// ============================================================
// SHOP OWNER CONTROLLERS
// ============================================================

// POST /api/v1/shops
export const createShop = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const owner = req.user.id;

        if (!name || !phone) {
            return res.status(400).json({ message: "Name and phone are required" });
        }

        const existingShop = await Shop.findOne({ name, owner });
        if (existingShop) {
            return res.status(409).json({
                message: "You already have a shop with this name",
            });
        }

        const shop = await Shop.create({
            name,
            phone,
            owner,
            onboardingStep: 1,
        });

        return res.status(201).json({
            message: "Shop created successfully",
            shop,
        });
    } catch (error) {
        console.error("CREATE SHOP ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/profile
// Step 2 — logo, coverImage, tagline
export const updateShopProfile = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const { name, tagline, phone, logo, coverImage } = req.body;

        if (name !== undefined) shop.name = name;
        if (tagline !== undefined) shop.tagline = tagline;
        if (phone !== undefined) shop.phone = phone;
        if (logo !== undefined) shop.logo = logo;
        if (coverImage !== undefined) shop.coverImage = coverImage;

        // Advance onboarding step
        if (shop.onboardingStep < 2) shop.onboardingStep = 2;

        await shop.save();

        return res.status(200).json({
            message: "Shop profile updated successfully",
            shop,
        });
    } catch (error) {
        console.error("UPDATE SHOP PROFILE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/address
// Step 3 — address
export const updateShopAddress = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const { addressLine, city, state, pinCode } = req.body;

        if (!addressLine || !city || !state || !pinCode) {
            return res.status(400).json({
                message: "All address fields are required",
            });
        }

        shop.address = { addressLine, city, state, pinCode };
        shop.markModified("address");

        // Advance onboarding step
        if (shop.onboardingStep < 3) shop.onboardingStep = 3;

        await shop.save();

        return res.status(200).json({
            message: "Shop address updated successfully",
            shop,
        });
    } catch (error) {
        console.error("UPDATE SHOP ADDRESS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/delivery-settings
// Step 4 — delivery settings
export const updateDeliverySettings = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const { deliveryTime, deliveryFee, minOrder } = req.body;

        if (deliveryTime !== undefined) shop.deliveryTime = deliveryTime;
        if (deliveryFee !== undefined) shop.deliveryFee = deliveryFee;
        if (minOrder !== undefined) shop.minOrder = minOrder;

        // Advance onboarding step
        if (shop.onboardingStep < 4) shop.onboardingStep = 4;

        await shop.save();

        return res.status(200).json({
            message: "Delivery settings updated successfully",
            shop,
        });
    } catch (error) {
        console.error("UPDATE DELIVERY SETTINGS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/business-details
// Step 5 — business details
export const updateBusinessDetails = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const { gstNumber, panNumber, fssaiLicense } = req.body;

        if (!shop.businessDetails) shop.businessDetails = {};

        if (gstNumber !== undefined) shop.businessDetails.gstNumber = gstNumber;
        if (panNumber !== undefined) shop.businessDetails.panNumber = panNumber;
        if (fssaiLicense !== undefined) shop.businessDetails.fssaiLicense = fssaiLicense;

        shop.markModified("businessDetails");

        // Advance onboarding step
        if (shop.onboardingStep < 5) shop.onboardingStep = 5;

        await shop.save();

        return res.status(200).json({
            message: "Business details updated successfully",
            shop,
        });
    } catch (error) {
        console.error("UPDATE BUSINESS DETAILS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/shops/:shopId/toggle-status
// Toggle isOpen on/off
export const toggleShopStatus = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        if (!shop.isVerified) {
            return res.status(403).json({
                message: "Shop must be verified before going live",
            });
        }

        shop.isOpen = !shop.isOpen;
        await shop.save();

        return res.status(200).json({
            message: `Shop is now ${shop.isOpen ? "open" : "closed"}`,
            isOpen: shop.isOpen,
        });
    } catch (error) {
        console.error("TOGGLE SHOP STATUS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/shops/my-shops
// Get all shops owned by logged in user
export const getMyShops = async (req, res) => {
    try {
        const shops = await Shop.find({ owner: req.user.id }).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Shops fetched successfully",
            total: shops.length,
            shops,
        });
    } catch (error) {
        console.error("GET MY SHOPS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/shops/:shopId
// Get single shop (owner view — full details)
export const getMyShopById = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        return res.status(200).json({
            message: "Shop fetched successfully",
            shop,
        });
    } catch (error) {
        console.error("GET MY SHOP BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/shops/:shopId
// Soft delete — just deactivate
export const deleteShop = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        shop.isActive = false;
        shop.isOpen = false;
        await shop.save();

        return res.status(200).json({ message: "Shop deactivated successfully" });
    } catch (error) {
        console.error("DELETE SHOP ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// PUBLIC / CUSTOMER CONTROLLERS
// ============================================================

// GET /api/v1/shops/public
// Paginated, filtered, search
export const getPublicShops = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            city,
            isOpen,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        const query = {
            isVerified: true,
            isActive: true,
        };

        if (city) query["address.city"] = { $regex: city, $options: "i" };
        if (isOpen !== undefined) query.isOpen = isOpen === "true";
        if (search) query.name = { $regex: search, $options: "i" };

        const allowedSortFields = ["rating", "createdAt", "deliveryTime", "deliveryFee"];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrder = order === "asc" ? 1 : -1;

        const skip = (Number(page) - 1) * Number(limit);

        const [shops, total] = await Promise.all([
            Shop.find(query)
                .select("-businessDetails -bankDetails -onboardingStep") // hide sensitive fields
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(Number(limit)),
            Shop.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalShops: total,
            shops,
        });
    } catch (error) {
        console.error("GET PUBLIC SHOPS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/shops/public/:shopId
// Single shop public view
export const getPublicShopById = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findOne({
            _id: shopId,
            isVerified: true,
            isActive: true,
        }).select("-businessDetails -bankDetails -onboardingStep");

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        return res.status(200).json({
            message: "Shop fetched successfully",
            shop,
        });
    } catch (error) {
        console.error("GET PUBLIC SHOP BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /api/v1/admin/shops
// All shops with full details + filters
export const adminGetAllShops = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            isVerified,
            isActive,
            isOpen,
        } = req.query;

        const query = {};

        if (isVerified !== undefined) query.isVerified = isVerified === "true";
        if (isActive !== undefined) query.isActive = isActive === "true";
        if (isOpen !== undefined) query.isOpen = isOpen === "true";
        if (search) query.name = { $regex: search, $options: "i" };

        const skip = (Number(page) - 1) * Number(limit);

        const [shops, total] = await Promise.all([
            Shop.find(query)
                .populate("owner", "fullName email phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Shop.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalShops: total,
            shops,
        });
    } catch (error) {
        console.error("ADMIN GET ALL SHOPS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/admin/shops/:shopId
// Full shop details for admin
export const adminGetShopById = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId)
            .populate("owner", "fullName email phone");

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        return res.status(200).json({ shop });
    } catch (error) {
        console.error("ADMIN GET SHOP BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/admin/shops/:shopId/verify
// Verify or unverify a shop
export const adminVerifyShop = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { isVerified } = req.body;

        if (isVerified === undefined) {
            return res.status(400).json({ message: "isVerified field is required" });
        }

        const shop = await Shop.findByIdAndUpdate(
            shopId,
            { isVerified },
            { new: true }
        );

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        return res.status(200).json({
            message: `Shop ${isVerified ? "verified" : "unverified"} successfully`,
            shop,
        });
    } catch (error) {
        console.error("ADMIN VERIFY SHOP ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/admin/shops/:shopId/toggle-active
// Suspend or restore a shop
export const adminToggleShopActive = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        shop.isActive = !shop.isActive;

        // If suspending, also close the shop
        if (!shop.isActive) shop.isOpen = false;

        await shop.save();

        return res.status(200).json({
            message: `Shop ${shop.isActive ? "restored" : "suspended"} successfully`,
            isActive: shop.isActive,
        });
    } catch (error) {
        console.error("ADMIN TOGGLE SHOP ACTIVE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/admin/shops/:shopId
// Hard delete — admin only, permanent
export const adminDeleteShop = async (req, res) => {
    try {
        const shop = await Shop.findByIdAndDelete(req.params.shopId);

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // TODO: delete associated products, orders etc when those modules are built

        return res.status(200).json({ message: "Shop permanently deleted" });
    } catch (error) {
        console.error("ADMIN DELETE SHOP ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};