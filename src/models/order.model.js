import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        // Full price snapshot — never reference live product for billing
        snapshot: {
            name: { type: String, required: true },
            image: String,
            price: { type: Number, required: true },
            originalPrice: Number,
            variantName: String,
            unit: String,
        },
    },
    { _id: true }
);

const orderSchema = new mongoose.Schema(
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
        items: {
            type: [orderItemSchema],
            required: true,
        },

        // ── Status Flow ──────────────────────────────────────
        //
        // PENDING
        //   └── CONFIRMED  (shop accepts)
        //         └── PREPARING  (shop starts preparing)
        //               └── READY  (shop marks ready for pickup)
        //                     └── PICKED_UP  (delivery agent picks up)
        //                           └── OUT_FOR_DELIVERY  (agent heading to customer)
        //                                 └── DELIVERED  (order delivered)
        //
        // CANCELLED can happen at: PENDING, CONFIRMED, PREPARING
        // (cannot cancel once READY or beyond)
        //
        status: {
            type: String,
            enum: [
                "PENDING",
                "CONFIRMED",
                "PREPARING",
                "READY",
                "PICKED_UP",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
            ],
            default: "PENDING",
        },

        // Track who cancelled and why
        cancellation: {
            cancelledBy: {
                type: String,
                enum: ["customer", "shop", "admin", "system"],
                default: null,
            },
            reason: {
                type: String,
                default: null,
            },
            cancelledAt: {
                type: Date,
                default: null,
            },
        },

        // ── Delivery Address (snapshot) ──────────────────
        deliveryAddress: {
            addressLine: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pinCode: { type: String, required: true },
        },

        // ── Pricing Breakdown ────────────────────────────
        pricing: {
            subtotal: { type: Number, required: true },
            deliveryFee: { type: Number, required: true, default: 0 },
            platformFee: { type: Number, required: true, default: 0 },
            discount: { type: Number, default: 0 },
            total: { type: Number, required: true },
        },

        // ── Payment ──────────────────────────────────────
        payment: {
            method: {
                type: String,
                enum: ["COD", "ONLINE", "WALLET"],
                required: true,
            },
            status: {
                type: String,
                enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
                default: "PENDING",
            },
            transactionId: {
                type: String,
                default: null,
            },
            paidAt: {
                type: Date,
                default: null,
            },
        },

        // ── Timestamps for each status ───────────────────
        statusTimeline: {
            placedAt: {
                type: Date,
                default: Date.now,      
            },
            confirmedAt: { type: Date, default: null },
            preparingAt: { type: Date, default: null },
            readyAt: { type: Date, default: null },
            pickedUpAt: { type: Date, default: null },
            outForDeliveryAt: { type: Date, default: null },  
            deliveredAt: { type: Date, default: null },
            cancelledAt: { type: Date, default: null },
        },

        // ── Auto cancel if shop doesn't confirm ──────────
        autoConfirmDeadline: {
            type: Date,
            default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 min
        },

        // ── Instructions ─────────────────────────────────
        customerNote: {
            type: String,
            trim: true,
            default: null,
        },

        // ── Review ───────────────────────────────────────
        isReviewed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ shop: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ autoConfirmDeadline: 1, status: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;