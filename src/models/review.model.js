import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true,        // one review per order
        },
        // Optional product-level review
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null,
        },
        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            trim: true,
            maxLength: [500, "Comment cannot exceed 500 characters"],
        },
        images: {
            type: [String],
            default: [],
        },
        // Admin moderation
        isVisible: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// One review per customer per shop
reviewSchema.index({ customer: 1, shop: 1, order: 1 }, { unique: true });
reviewSchema.index({ shop: 1, isVisible: 1 });
reviewSchema.index({ product: 1, isVisible: 1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;