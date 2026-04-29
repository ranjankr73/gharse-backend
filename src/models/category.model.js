import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Category name is required"],
            trim: true,
            unique: true,
        },
        slug: {
            type: String,
            unique: true,
        },
        description: {
            type: String,
            trim: true,
        },
        image: {
            type: String,
        },
        displayOrder: {
            type: Number,
            default: 0,         // lower = appears first
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Auto-generate slug from name before saving
categorySchema.pre("save", async function () {
    if (this.isModified("name")) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
});

categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;