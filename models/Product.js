const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true }, // SEO-friendly URL
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0, default: 0 },
    discountStartDate: { type: Date }, // New field
    discountEndDate: { type: Date }, // New field
    category: { 
      type: String, 
      required: true, 
      enum: ["Bengal Handloom", "Kanchipuram", "Pochampally Ikkat", "Maheshwari", "Ilkal", "Jaipur Handblock"] 
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    brand: { type: String, trim: true }, // New field
    tags: [{ type: String, trim: true }], // New field
    variants: [
      {
        size: { type: String, enum: ["XS", "S", "M", "L", "XL", "XXL"] }, 
        color: { type: String },
        stock: { type: Number, required: true, min: 0 },
        reservedStock: { type: Number, default: 0 }, // Prevents overselling
        sku: { type: String, unique: true, sparse: true }, // Track inventory better
      }
    ], // New field
    images: [{ type: String, required: true }],
    stock: { type: Number, required: true, min: 0 },
    stockLocked: { type: Number, default: 0 }, // Prevents overselling
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 0, max: 5 },
        comment: { type: String, trim: true },
      },
    ],
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);