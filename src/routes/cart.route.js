import { Router } from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} from "../controllers/cart.controller.js";

const cartRouter = Router();

// All cart routes require customer auth
cartRouter.use(protect, authorizeRoles("customer"));

cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.patch("/items/:itemId", updateCartItem);
cartRouter.delete("/items/:itemId", removeCartItem);
cartRouter.delete("/", clearCart);

export default cartRouter;