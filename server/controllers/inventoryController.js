
const Inventory = require("../models/Inventory");

const VALID_CATEGORIES = [
  "base",
  "sauce",
  "cheese",
  "vegetable",
  "meat",
];

exports.getInventory = async (req, res) => {
  try {
    const items = await Inventory.find().sort({
      category: 1,
      name: 1,
    });

    res.json({ success: true, items });
  } catch (error) {
    console.error("Get inventory:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not load inventory.",
    });
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    const { name, category, stock, lowStockThreshold, unit } =
      req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !VALID_CATEGORIES.includes(category) ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      (lowStockThreshold !== undefined &&
        (!Number.isInteger(lowStockThreshold) ||
          lowStockThreshold < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid inventory details.",
      });
    }

    const item = await Inventory.create({
      name: name.trim(),
      category,
      stock,
      lowStockThreshold: lowStockThreshold ?? 20,
      unit: typeof unit === "string" && unit.trim()
        ? unit.trim()
        : "portions",
    });

    res.status(201).json({ success: true, item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This inventory item already exists.",
      });
    }

    console.error("Create inventory item:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not create inventory item.",
    });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const { stock, lowStockThreshold, unit } = req.body;

    const updates = {};

    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative whole number.",
        });
      }

      updates.stock = stock;
    }

    if (lowStockThreshold !== undefined) {
      if (
        !Number.isInteger(lowStockThreshold) ||
        lowStockThreshold < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Threshold must be a non-negative whole number.",
        });
      }

      updates.lowStockThreshold = lowStockThreshold;
    }

    if (unit !== undefined) {
      if (typeof unit !== "string" || !unit.trim()) {
        return res.status(400).json({
          success: false,
          message: "Unit must be a non-empty string.",
        });
      }

      updates.unit = unit.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide stock, threshold, or unit to update.",
      });
    }

    // Reset the alert when stock is replenished above the threshold.
    const current = await Inventory.findById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found.",
      });
    }

    const resultingStock = updates.stock ?? current.stock;
    const resultingThreshold =
      updates.lowStockThreshold ?? current.lowStockThreshold;

    if (resultingStock > resultingThreshold) {
      updates.alertSent = false;
    }

    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, item });
  } catch (error) {
    console.error("Update inventory item:", error.message);
    res.status(500).json({
      success: false,
      message: "Could not update inventory.",
    });
  }
};

module.exports = {
  ...exports,
};
