import mongoose from "mongoose";
import slugify from "slugify";

const subCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Subcategory name is required"],
            trim: true,
        },
        slug: {
            type: String,
        },
        description: {
            type: String,
            trim: true,
        },
        image: {
            type: String,
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
        },
        // Maps to a global category — required
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Must be mapped to a global category"],
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Auto-generate slug
subCategorySchema.pre("save", async function () {
    if (this.isModified("name")) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
});

// Same name can't exist twice in same shop
subCategorySchema.index({ name: 1, shop: 1 }, { unique: true });

// Frequent query patterns
subCategorySchema.index({ shop: 1, isActive: 1 });
subCategorySchema.index({ category: 1 });           // find all subcategories under a global category

const SubCategory = mongoose.model("SubCategory", subCategorySchema);
export default SubCategory;