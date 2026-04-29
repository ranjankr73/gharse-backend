import { Server } from "socket.io";
import config from "./env.config.js";

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: config.CLIENT_URL,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        // Join personal room on connect
        socket.on("join", (userId) => {
            socket.join(`user:${userId}`);
        });

        // Shop owner joins shop room
        socket.on("joinShop", (shopId) => {
            socket.join(`shop:${shopId}`);
        });

        socket.on("disconnect", () => {});
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket not initialized");
    return io;
};