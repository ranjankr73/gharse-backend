import mongoose from "mongoose";

const shopSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Shop name is required"],
            trim: true,
        },
        tagline: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Phone is required"],
        },
        address: {
            type: {
                addressLine: {
                    type: String,
                    required: [true, "Address line is required"],
                },
                city: {
                    type: String,
                    required: [true, "City is required"],
                },
                state: {
                    type: String,
                    required: [true, "State is required"],
                },
                pinCode: {
                    type: String,
                    required: [true, "PIN code is required"],
                },
            },
            required: false, // address itself is optional
        },
        logo: {
            type: String,
        },
        coverImage: {
            type: String,
        },
        isOpen: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        deliveryTime: {
            type: Number,
            min: 0,
        },
        deliveryFee: {
            type: Number,
            min: 0,
        },
        minOrder: {
            type: Number,
            min: 0,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
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
        onboardingStep: {
            type: Number,
            default: 1,
        },
        businessDetails: {
            gstNumber: String,
            panNumber: String,
            fssaiLicense: String,
        },
        bankDetails: {
            accountNumber: String,
            ifscCode: String,
            accountHolderName: String,
        },
    },
    { timestamps: true },
);

shopSchema.index({ owner: 1 });

const Shop = mongoose.model("Shop", shopSchema);

export default Shop;
