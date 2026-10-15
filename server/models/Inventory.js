
const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ingredient name is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Ingredient category is required"],
      enum: ["base", "sauce", "cheese", "vegetable", "meat"],
    },

    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      min: 0,
      default: 20,
    },

    unit: {
      type: String,
      default: "portions",
      trim: true,
    },

    alertSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Each ingredient name must be unique within its category.
inventorySchema.index(
  { name: 1, category: 1 },
  { unique: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
