const mongoose = require("mongoose");
const Order = require("../models/Order");

// GET /api/orders/my-orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get my orders error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your orders.",
    });
  }
};

// GET /api/orders/:id
exports.getMyOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: req.user.userId,
    }).select("-__v");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order details error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order details.",
    });
  }
};