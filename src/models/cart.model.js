import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,       // null = no variant selected
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"],
            default: 1,
        },
        // Snapshot at time of adding — prices can change
        snapshot: {
            name: String,
            image: String,
            price: Number,       // effective price (discountPrice if exists)
            originalPrice: Number,
            variantName: String,
            unit: String,
        },
    },
    { _id: true }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,        // one cart per user
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            default: null,       // cart is locked to one shop at a time
        },
        items: {
            type: [cartItemSchema],
            default: [],
        },
    },
    { timestamps: true }
);

// ── Virtuals ─────────────────────────────────────────────
cartSchema.virtual("subtotal").get(function () {
    return this.items.reduce((sum, item) => {
        return sum + item.snapshot.price * item.quantity;
    }, 0);
});

cartSchema.virtual("totalItems").get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

cartSchema.index({ user: 1 });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;