import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import Shop from "../models/shop.model.js";

const buildSnapshot = (product, variant) => ({
    name: product.name,
    image: product.images?.[0] ?? null,
    price: variant
        ? (variant.discountPrice ?? variant.price)
        : (product.discountPrice ?? product.price),
    originalPrice: variant ? variant.price : product.price,
    variantName: variant?.name ?? null,
    unit: product.unit ?? null,
});

// GET /api/v1/cart
export const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id })
            .populate("shop", "name logo deliveryFee minOrder isOpen isActive isVerified")
            .populate("items.product", "name images isAvailable isActive");

        if (!cart || cart.items.length === 0) {
            return res.status(200).json({
                message: "Cart is empty",
                cart: { items: [], subtotal: 0, totalItems: 0 },
            });
        }

        return res.status(200).json({ cart });
    } catch (error) {
        console.error("GET CART ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// POST /api/v1/cart/add
export const addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }
        if (quantity < 1) {
            return res.status(400).json({ message: "Quantity must be at least 1" });
        }

        // Verify product
        const product = await Product.findOne({
            _id: productId,
            isActive: true,
            isAvailable: true,
        });
        if (!product) {
            return res.status(404).json({ message: "Product not found or unavailable" });
        }

        // Verify shop
        const shop = await Shop.findOne({
            _id: product.shop,
            isVerified: true,
            isActive: true,
        });
        if (!shop) {
            return res.status(404).json({ message: "Shop not available" });
        }

        // Verify variant if provided
        let variant = null;
        if (variantId) {
            variant = product.variants.id(variantId);
            if (!variant || !variant.isAvailable) {
                return res.status(404).json({ message: "Variant not found or unavailable" });
            }
        }

        // Stock check
        const effectiveStock = variant ? variant.stock : product.stock;
        if (effectiveStock < quantity) {
            return res.status(400).json({
                message: `Only ${effectiveStock} items available in stock`,
            });
        }

        let cart = await Cart.findOne({ user: req.user.id });

        // Cart belongs to different shop — clear it
        if (cart && cart.shop && cart.shop.toString() !== product.shop.toString()) {
            cart.items = [];
            cart.shop = product.shop;
        }

        if (!cart) {
            cart = new Cart({ user: req.user.id, shop: product.shop, items: [] });
        }

        if (!cart.shop) cart.shop = product.shop;

        // Check if same product + variant already in cart
        const existingItem = cart.items.find(
            (item) =>
                item.product.toString() === productId &&
                String(item.variantId) === String(variantId ?? null)
        );

        if (existingItem) {
            const newQty = existingItem.quantity + quantity;
            if (newQty > effectiveStock) {
                return res.status(400).json({
                    message: `Cannot add more. Only ${effectiveStock} items available`,
                });
            }
            existingItem.quantity = newQty;
            existingItem.snapshot = buildSnapshot(product, variant); // refresh snapshot
        } else {
            cart.items.push({
                product: productId,
                variantId: variantId ?? null,
                quantity,
                snapshot: buildSnapshot(product, variant),
            });
        }

        await cart.save();

        return res.status(200).json({
            message: "Item added to cart",
            cart,
        });
    } catch (error) {
        console.error("ADD TO CART ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// PATCH /api/v1/cart/items/:itemId
export const updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: "Valid quantity is required" });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found in cart" });
        }

        // Stock check
        const product = await Product.findById(item.product);
        if (!product) {
            return res.status(404).json({ message: "Product no longer available" });
        }

        const variant = item.variantId ? product.variants.id(item.variantId) : null;
        const effectiveStock = variant ? variant.stock : product.stock;

        if (quantity > effectiveStock) {
            return res.status(400).json({
                message: `Only ${effectiveStock} items available`,
            });
        }

        item.quantity = quantity;
        item.snapshot = buildSnapshot(product, variant); // refresh snapshot
        await cart.save();

        return res.status(200).json({ message: "Cart updated", cart });
    } catch (error) {
        console.error("UPDATE CART ITEM ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/cart/items/:itemId
export const removeCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        cart.items = cart.items.filter(
            (item) => item._id.toString() !== itemId
        );

        // Clear shop ref when cart is empty
        if (cart.items.length === 0) cart.shop = null;

        await cart.save();

        return res.status(200).json({ message: "Item removed", cart });
    } catch (error) {
        console.error("REMOVE CART ITEM ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// DELETE /api/v1/cart
export const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(200).json({ message: "Cart already empty" });
        }

        cart.items = [];
        cart.shop = null;
        await cart.save();

        return res.status(200).json({ message: "Cart cleared" });
    } catch (error) {
        console.error("CLEAR CART ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};