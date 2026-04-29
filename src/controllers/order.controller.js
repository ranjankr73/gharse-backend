import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";
import Shop from "../models/shop.model.js";
import Product from "../models/product.model.js";
import { notifyUser, notifyShop } from "../utils/notify.js";

const PLATFORM_FEE = 5;

// ── Status transition map ────────────────────────────────
//
// Key   = current status
// Value = allowed next statuses
//
// WHO moves each status:
// PENDING        → CONFIRMED      : shop owner
// CONFIRMED      → PREPARING      : shop owner
// PREPARING      → READY          : shop owner
// READY          → PICKED_UP      : shop owner (until delivery agent module)
// PICKED_UP      → OUT_FOR_DELIVERY : shop owner (until delivery agent module)
// OUT_FOR_DELIVERY → DELIVERED    : shop owner (until delivery agent module)
// Any cancellable → CANCELLED     : shop owner / customer / admin
//
const STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["PICKED_UP"],               // cannot cancel once ready
    PICKED_UP: ["OUT_FOR_DELIVERY"],    // ✅
    OUT_FOR_DELIVERY: ["DELIVERED"],    // ✅
    DELIVERED: [],                      // terminal
    CANCELLED: [],                      // terminal
};

// Statuses customer can cancel at
const CUSTOMER_CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"];

// Statuses shop can cancel at
const SHOP_CANCELLABLE = ["PENDING", "CONFIRMED", "PREPARING"];

// Timeline field map — status → timeline field
const TIMELINE_MAP = {
    CONFIRMED: "confirmedAt",
    PREPARING: "preparingAt",
    READY: "readyAt",
    PICKED_UP: "pickedUpAt",
    OUT_FOR_DELIVERY: "outForDeliveryAt",   // ✅
    DELIVERED: "deliveredAt",
    CANCELLED: "cancelledAt",
};

// Notification messages sent to customer on each status change
const CUSTOMER_MESSAGES = {
    CONFIRMED: "Your order has been accepted by the shop! 🎉",
    PREPARING: "The shop is preparing your order 👨‍🍳",
    READY: "Your order is packed and ready for pickup 📦",
    PICKED_UP: "A delivery agent has picked up your order 🛵",
    OUT_FOR_DELIVERY: "Your order is on the way! 🚀",
    DELIVERED: "Order delivered! Enjoy 😊 Don't forget to rate your experience.",
    CANCELLED: "Your order has been cancelled.",
};

// ============================================================
// CUSTOMER CONTROLLERS
// ============================================================

// POST /api/v1/orders
export const placeOrder = async (req, res) => {
    try {
        const { deliveryAddress, paymentMethod, customerNote } = req.body;

        if (!deliveryAddress || !paymentMethod) {
            return res.status(400).json({
                message: "Delivery address and payment method are required",
            });
        }

        const { addressLine, city, state, pinCode } = deliveryAddress;
        if (!addressLine || !city || !state || !pinCode) {
            return res.status(400).json({
                message: "Complete delivery address is required",
            });
        }

        // COD only until payment gateway integrated
        if (paymentMethod !== "COD") {
            return res.status(400).json({
                message: "Only Cash on Delivery is supported currently",
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Your cart is empty" });
        }

        const shop = await Shop.findOne({
            _id: cart.shop,
            isVerified: true,
            isActive: true,
            isOpen: true,
        });
        if (!shop) {
            return res.status(400).json({
                message: "Shop is currently unavailable or closed",
            });
        }

        // Validate all items and stock
        const validatedItems = [];
        for (const item of cart.items) {
            const product = await Product.findOne({
                _id: item.product,
                isActive: true,
                isAvailable: true,
            });

            if (!product) {
                return res.status(400).json({
                    message: `"${item.snapshot.name}" is no longer available`,
                });
            }

            const variant = item.variantId
                ? product.variants.id(item.variantId)
                : null;

            if (item.variantId && (!variant || !variant.isAvailable)) {
                return res.status(400).json({
                    message: `A variant of "${product.name}" is no longer available`,
                });
            }

            const effectiveStock = variant ? variant.stock : product.stock;
            if (effectiveStock < item.quantity) {
                return res.status(400).json({
                    message: `Only ${effectiveStock} units of "${product.name}" available`,
                });
            }

            validatedItems.push({ item, product, variant });
        }

        // Build order items with fresh price snapshots
        const orderItems = validatedItems.map(({ item, product, variant }) => ({
            product: product._id,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            snapshot: {
                name: product.name,
                image: product.images?.[0] ?? null,
                price: variant
                    ? (variant.discountPrice ?? variant.price)
                    : (product.discountPrice ?? product.price),
                originalPrice: variant ? variant.price : product.price,
                variantName: variant?.name ?? null,
                unit: product.unit ?? null,
            },
        }));

        // Pricing
        const subtotal = orderItems.reduce(
            (sum, item) => sum + item.snapshot.price * item.quantity,
            0
        );
        const deliveryFee = shop.deliveryFee ?? 0;
        const platformFee = PLATFORM_FEE;
        const total = subtotal + deliveryFee + platformFee;

        if (shop.minOrder && subtotal < shop.minOrder) {
            return res.status(400).json({
                message: `Minimum order amount is ₹${shop.minOrder}`,
            });
        }

        // Create order
        const order = await Order.create({
            customer: req.user.id,
            shop: shop._id,
            items: orderItems,
            deliveryAddress,
            pricing: { subtotal, deliveryFee, platformFee, discount: 0, total },
            payment: { method: paymentMethod, status: "PENDING" },
            customerNote: customerNote ?? null,
            autoConfirmDeadline: new Date(Date.now() + 5 * 60 * 1000),
            statusTimeline: { placedAt: new Date() },
        });

        // Deduct stock
        for (const { item, product, variant } of validatedItems) {
            if (variant) {
                variant.stock -= item.quantity;
                if (variant.stock === 0) variant.isAvailable = false;
            } else {
                product.stock -= item.quantity;
                if (product.stock === 0) product.isAvailable = false;
            }
            product.markModified("variants");
            await product.save();
        }

        // Clear cart
        cart.items = [];
        cart.shop = null;
        await cart.save();

        // Notify shop owner
        notifyShop(shop._id.toString(), "newOrder", {
            orderId: order._id,
            total: order.pricing.total,
            itemCount: order.items.length,
            customerNote: order.customerNote,
            placedAt: new Date(),
        });

        return res.status(201).json({
            message: "Order placed successfully",
            order,
        });
    } catch (error) {
        console.error("PLACE ORDER ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/orders/my
export const getMyOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = { customer: req.user.id };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate("shop", "name logo")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Order.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalOrders: total,
            orders,
        });
    } catch (error) {
        console.error("GET MY ORDERS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/orders/my/:orderId
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            customer: req.user.id,
        })
            .populate("shop", "name logo phone address")
            .populate("items.product", "name images");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json({ order });
    } catch (error) {
        console.error("GET ORDER BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// POST /api/v1/orders/my/:orderId/cancel
export const cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;

        const order = await Order.findOne({
            _id: req.params.orderId,
            customer: req.user.id,
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
            return res.status(400).json({
                message: `Order cannot be cancelled at this stage (${order.status}). Please contact support.`,
            });
        }

        order.status = "CANCELLED";
        order.cancellation = {
            cancelledBy: "customer",
            reason: reason ?? "Cancelled by customer",
            cancelledAt: new Date(),
        };
        order.statusTimeline.cancelledAt = new Date();

        await order.save();
        await restoreStock(order.items);

        // Notify shop
        notifyShop(order.shop.toString(), "orderCancelled", {
            orderId: order._id,
            cancelledBy: "customer",
            reason: order.cancellation.reason,
        });

        return res.status(200).json({
            message: "Order cancelled successfully",
            order,
        });
    } catch (error) {
        console.error("CANCEL ORDER ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// SHOP OWNER CONTROLLERS
// ============================================================

// GET /api/v1/orders/shop/:shopId
export const getShopOrders = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const query = { shop: shopId };
        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate("customer", "fullName phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Order.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalOrders: total,
            orders,
        });
    } catch (error) {
        console.error("GET SHOP ORDERS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/orders/shop/:shopId/:orderId
export const getShopOrderById = async (req, res) => {
    try {
        const { shopId, orderId } = req.params;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const order = await Order.findOne({ _id: orderId, shop: shopId })
            .populate("customer", "fullName phone")
            .populate("items.product", "name images");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json({ order });
    } catch (error) {
        console.error("GET SHOP ORDER BY ID ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/orders/shop/:shopId/:orderId/status
export const updateOrderStatus = async (req, res) => {
    try {
        const { shopId, orderId } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const order = await Order.findOne({ _id: orderId, shop: shopId });
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Validate transition
        const allowedTransitions = STATUS_TRANSITIONS[order.status];
        if (!allowedTransitions || !allowedTransitions.includes(status)) {
            return res.status(400).json({
                message: `Cannot move order from ${order.status} to ${status}`,
                allowed: allowedTransitions,
            });
        }

        // Shop can only cancel within allowed stages
        if (status === "CANCELLED" && !SHOP_CANCELLABLE.includes(order.status)) {
            return res.status(400).json({
                message: `Cannot cancel order at stage: ${order.status}`,
            });
        }

        // Update status
        order.status = status;

        // Update timeline
        const timelineField = TIMELINE_MAP[status];
        if (timelineField) {
            order.statusTimeline[timelineField] = new Date();
        }

        // Handle cancellation
        if (status === "CANCELLED") {
            order.cancellation = {
                cancelledBy: "shop",
                reason: reason ?? "Cancelled by shop",
                cancelledAt: new Date(),
            };
            await restoreStock(order.items);

            // Notify customer
            notifyUser(order.customer.toString(), "orderStatusUpdate", {
                orderId: order._id,
                status,
                message: CUSTOMER_MESSAGES[status],
                updatedAt: new Date(),
            });
        }

        // Mark COD as paid on delivery
        if (status === "DELIVERED") {
            if (order.payment.method === "COD") {
                order.payment.status = "PAID";
                order.payment.paidAt = new Date();
            }

            // Notify customer to review
            notifyUser(order.customer.toString(), "orderStatusUpdate", {
                orderId: order._id,
                status,
                message: CUSTOMER_MESSAGES[status],
                canReview: true,
                updatedAt: new Date(),
            });
        } else if (status !== "CANCELLED") {
            // Notify customer for all other transitions
            notifyUser(order.customer.toString(), "orderStatusUpdate", {
                orderId: order._id,
                status,
                message: CUSTOMER_MESSAGES[status],
                updatedAt: new Date(),
            });
        }

        order.markModified("statusTimeline");
        await order.save();

        return res.status(200).json({
            message: `Order status updated to ${status}`,
            order,
        });
    } catch (error) {
        console.error("UPDATE ORDER STATUS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/v1/orders/shop/:shopId/stats
export const getShopStats = async (req, res) => {
    try {
        const { shopId } = req.params;
        const { period = "today" } = req.query;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or unauthorized" });
        }

        const now = new Date();
        const periodStart = {
            today: new Date(new Date().setHours(0, 0, 0, 0)),
            week: new Date(now.setDate(now.getDate() - 7)),
            month: new Date(now.setMonth(now.getMonth() - 1)),
        };

        const since = periodStart[period] ?? periodStart.today;

        const [revenueStats] = await Order.aggregate([
            {
                $match: {
                    shop: shop._id,
                    createdAt: { $gte: since },
                    status: { $nin: ["CANCELLED", "PENDING"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$pricing.total" },
                    avgOrderValue: { $avg: "$pricing.total" },
                },
            },
        ]);

        const [activeStats] = await Order.aggregate([
            {
                $match: {
                    shop: shop._id,
                    status: {
                        $in: [
                            "PENDING",
                            "CONFIRMED",
                            "PREPARING",
                            "READY",
                            "PICKED_UP",
                            "OUT_FOR_DELIVERY",
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        // Build active orders breakdown
        const activeBreakdown = {};
        if (Array.isArray(activeStats)) {
            activeStats.forEach(({ _id, count }) => {
                activeBreakdown[_id] = count;
            });
        }

        return res.status(200).json({
            period,
            totalOrders: revenueStats?.totalOrders ?? 0,
            totalRevenue: revenueStats?.totalRevenue ?? 0,
            avgOrderValue: Math.round(revenueStats?.avgOrderValue ?? 0),
            activeOrders: {
                PENDING: activeBreakdown.PENDING ?? 0,
                CONFIRMED: activeBreakdown.CONFIRMED ?? 0,
                PREPARING: activeBreakdown.PREPARING ?? 0,
                READY: activeBreakdown.READY ?? 0,
                PICKED_UP: activeBreakdown.PICKED_UP ?? 0,
                OUT_FOR_DELIVERY: activeBreakdown.OUT_FOR_DELIVERY ?? 0,
            },
        });
    } catch (error) {
        console.error("GET SHOP STATS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /api/v1/orders/admin
export const adminGetAllOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            shopId,
            customerId,
            paymentStatus,
        } = req.query;

        const query = {};
        if (status) query.status = status;
        if (shopId) query.shop = shopId;
        if (customerId) query.customer = customerId;
        if (paymentStatus) query["payment.status"] = paymentStatus;

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate("customer", "fullName email")
                .populate("shop", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Order.countDocuments(query),
        ]);

        return res.status(200).json({
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalOrders: total,
            orders,
        });
    } catch (error) {
        console.error("ADMIN GET ORDERS ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/orders/admin/:orderId/cancel
export const adminCancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (["DELIVERED", "CANCELLED"].includes(order.status)) {
            return res.status(400).json({ message: "Order cannot be cancelled" });
        }

        order.status = "CANCELLED";
        order.cancellation = {
            cancelledBy: "admin",
            reason: reason ?? "Cancelled by admin",
            cancelledAt: new Date(),
        };
        order.statusTimeline.cancelledAt = new Date();

        await order.save();
        await restoreStock(order.items);

        notifyUser(order.customer.toString(), "orderStatusUpdate", {
            orderId: order._id,
            status: "CANCELLED",
            message: "Your order has been cancelled by admin. Support will contact you.",
            updatedAt: new Date(),
        });

        notifyShop(order.shop.toString(), "orderCancelled", {
            orderId: order._id,
            cancelledBy: "admin",
            reason: order.cancellation.reason,
        });

        return res.status(200).json({ message: "Order cancelled", order });
    } catch (error) {
        console.error("ADMIN CANCEL ORDER ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// ============================================================
// EXPORTED HELPER — used by cron job
// ============================================================

export const restoreStock = async (items) => {
    for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        if (item.variantId) {
            const variant = product.variants.id(item.variantId);
            if (variant) {
                variant.stock += item.quantity;
                variant.isAvailable = true;
            }
        } else {
            product.stock += item.quantity;
            product.isAvailable = true;
        }

        product.markModified("variants");
        await product.save();
    }
};