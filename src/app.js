import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";

import config from "./config/env.config.js";

import authRouter from "./modules/auth/auth.route.js";
import shopRouter from "./routes/shop.route.js";
import categoryRouter from "./routes/category.route.js";
import productRouter from "./routes/product.route.js";
import cartRouter from "./routes/cart.route.js";
import orderRouter from "./routes/order.route.js";
import reviewRouter from "./routes/review.route.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
    cors({
        origin: config.CLIENT_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/shops", shopRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/reviews", reviewRouter);

// No Route match
app.use((req, res) => {
    return res.status(404).json({
        message: "Route not found",
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR: ", err);

    return res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
    });
});

export default app;
