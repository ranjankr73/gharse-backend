import { getIO } from "../config/socket.config.js";

export const notifyUser = (userId, event, data) => {
    try {
        getIO().to(`user:${userId}`).emit(event, data);
    } catch (error) {
        console.error("NOTIFY USER ERROR:", error);
    }
};

export const notifyShop = (shopId, event, data) => {
    try {
        getIO().to(`shop:${shopId}`).emit(event, data);
    } catch (error) {
        console.error("NOTIFY SHOP ERROR:", error);
    }
};