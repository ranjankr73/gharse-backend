import Review from "../models/review.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import Product from "../models/product.model.js";

// POST /api/v1/reviews
export const createReview = async (req, res) => {
    try {
        const { orderId, rating, comment, images, productId } = req.body;

        if (!orderId || !rating) {
            return res.status(400).json({ message: "Order ID and rating are required" });
        }

        // Verify order belongs to customer and is delivered
        const order = await Order.findOne({
            _id: orderId,
            customer: req.user.id,
            status: "DELIVERED",
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found or not yet delivered",
            });
        }

        if (order.isReviewed) {
            return res.status(409).json({ message: "You have already reviewed this order" });
        }

        const review = await Review.create({
            customer: req.user.id,
            shop: order.shop,
            order: orderId,
            product: productId ?? null,
            rating,
            comment,
            images: images ?? [],
        });

        // Mark order as reviewed
        order.isReviewed = true;
        await order.save();

        // Recalculate shop rating
        await recalculateShopRating(order.shop);

        // Recalculate product rating if product review
        if (productId) {
            await recalculateProductRating(productId);
        }

        return res.status(201).json({
            message: "Review submitted successfully",
            review,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "You have already reviewed this order" });
        }
        console.error("CREATE REVIEW ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/reviews/shop/:shopId
export const getShopReviews = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { page = 1, limit = 10, rating } = req.query;

        const query = { shop: shopId, isVisible: true };
        if (rating) query.rating = Number(rating);

        const skip = (Number(page) - 1) * Number(limit);

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate("customer", "fullName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Review.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalReviews: total,
            reviews,
        });
    } catch (error) {
        console.error("GET SHOP REVIEWS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/reviews/product/:productId
export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const query = { product: productId, isVisible: true };
        const skip = (Number(page) - 1) * Number(limit);

        const [reviews, total] = await Promise.all([
            Review.find(query)
                .populate("customer", "fullName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Review.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalReviews: total,
            reviews,
        });
    } catch (error) {
        console.error("GET PRODUCT REVIEWS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/reviews/:reviewId — customer delete own review
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findOne({
            _id: req.params.reviewId,
            customer: req.user.id,
        });

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        const shopId = review.shop;
        const productId = review.product;

        await Review.findByIdAndDelete(req.params.reviewId);

        // Reset order reviewed flag
        await Order.findByIdAndUpdate(review.order, { isReviewed: false });

        // Recalculate ratings
        await recalculateShopRating(shopId);
        if (productId) await recalculateProductRating(productId);

        return res.status(200).json({ message: "Review deleted successfully" });
    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/reviews/admin/:reviewId/toggle-visibility
export const adminToggleReviewVisibility = async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        review.isVisible = !review.isVisible;
        await review.save();

        // Recalculate ratings after visibility change
        await recalculateShopRating(review.shop);
        if (review.product) await recalculateProductRating(review.product);

        return res.status(200).json({
            message: `Review ${review.isVisible ? "visible" : "hidden"}`,
            review,
        });
    } catch (error) {
        console.error("ADMIN TOGGLE REVIEW ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// HELPERS — Rating recalculation
// ============================================================

const recalculateShopRating = async (shopId) => {
    const result = await Review.aggregate([
        { $match: { shop: shopId, isVisible: true } },
        {
            $group: {
                _id: "$shop",
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
            },
        },
    ]);

    const { avgRating = 0, totalReviews = 0 } = result[0] ?? {};

    await Shop.findByIdAndUpdate(shopId, {
        rating: Math.round(avgRating * 10) / 10, // round to 1 decimal
        totalReviews,
    });
};

const recalculateProductRating = async (productId) => {
    const result = await Review.aggregate([
        { $match: { product: productId, isVisible: true } },
        {
            $group: {
                _id: "$product",
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 },
            },
        },
    ]);

    const { avgRating = 0, totalReviews = 0 } = result[0] ?? {};

    await Product.findByIdAndUpdate(productId, {
        rating: Math.round(avgRating * 10) / 10,
        totalReviews,
    });
};