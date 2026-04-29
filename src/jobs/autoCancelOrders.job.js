import cron from "node-cron";
import Order from "../models/order.model.js";
import { restoreStock } from "../controllers/order.controller.js";
import { notifyUser, notifyShop } from "../utils/notify.js";

export const startAutoCancelJob = () => {
    // Runs every minute
    cron.schedule("* * * * *", async () => {
        try {
            const expiredOrders = await Order.find({
                status: "PENDING",
                autoConfirmDeadline: { $lt: new Date() },
            });

            for (const order of expiredOrders) {
                order.status = "CANCELLED";
                order.cancellation = {
                    cancelledBy: "system",
                    reason: "Auto-cancelled: shop did not respond in time",
                    cancelledAt: new Date(),
                };
                order.statusTimeline.cancelledAt = new Date();
                await order.save();

                await restoreStock(order.items);

                // Notify customer
                notifyUser(order.customer.toString(), "orderStatusUpdate", {
                    orderId: order._id,
                    status: "CANCELLED",
                    message: "Your order was auto-cancelled as the shop did not respond in time.",
                    updatedAt: new Date(),
                });

                // Notify shop
                notifyShop(order.shop.toString(), "orderAutoCancelled", {
                    orderId: order._id,
                    reason: "Order expired — not confirmed in time",
                });

                console.log(`⚠️ Auto-cancelled order: ${order._id}`);
            }
        } catch (error) {
            console.error("AUTO CANCEL JOB ERROR:", error);
        }
    });

    console.log("✅ Auto-cancel cron job started");
};