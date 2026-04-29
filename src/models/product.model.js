import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Variant name is required"],
            trim: true,          // e.g. "500g", "1L", "Large"
        },
        price: {
            type: Number,
            required: [true, "Variant price is required"],
            min: 0,
        },
        discountPrice: {
            type: Number,
            min: 0,
            default: null,
        },
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
    },
    { _id: true }
);

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        images: {
            type: [String],
            default: [],
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Category is required"],
        },
        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCategory",
            default: null,       // optional
        },

        // Pricing — used when no variants
        price: {
            type: Number,
            min: 0,
            default: null,
        },
        discountPrice: {
            type: Number,
            min: 0,
            default: null,
        },

        // Unit label — e.g. "500g", "1L", "piece", "dozen"
        unit: {
            type: String,
            trim: true,
        },

        // Variants — e.g. multiple sizes/weights
        // If variants exist, price/discountPrice on root are ignored
        variants: {
            type: [variantSchema],
            default: [],
        },

        // Inventory
        stock: {
            type: Number,
            default: 0,
            min: 0,
        },
        lowStockThreshold: {
            type: Number,
            default: 5,          // alert shop owner when stock hits this
        },

        isAvailable: {
            type: Boolean,
            default: true,       // shop owner can toggle without deleting
        },
        isActive: {
            type: Boolean,
            default: true,       // soft delete
        },
        isFeatured: {
            type: Boolean,
            default: false,      // highlight on shop page
        },

        // Computed from reviews (never set manually)
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// ── Validation ───────────────────────────────────────────
// Either price or at least one variant must be present
productSchema.pre("save", async function () {
    const hasPrice = this.price !== null && this.price !== undefined;
    const hasVariants = this.variants && this.variants.length > 0;

    if (!hasPrice && !hasVariants) {
        return next(new Error("Product must have either a price or at least one variant"));
    }

    // Auto mark unavailable when stock is 0 (only if no variants)
    if (!hasVariants && this.stock === 0) {
        this.isAvailable = false;
    }
});

// ── Indexes ──────────────────────────────────────────────
productSchema.index({ shop: 1, isActive: 1 });
productSchema.index({ shop: 1, category: 1 });
productSchema.index({ shop: 1, subCategory: 1 });
productSchema.index({ shop: 1, isFeatured: 1 });
productSchema.index({ category: 1, isActive: 1 });    // for public browse by category
productSchema.index({ name: "text", description: "text" }); // text search

const Product = mongoose.model("Product", productSchema);
export default Product;