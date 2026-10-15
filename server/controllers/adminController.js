const mongoose = require("mongoose");
const Order = require("../models/Order");

const ALLOWED_STATUSES = [
"confirmed",
"preparing",
"out_for_delivery",
"delivered",
"cancelled",
];

exports.getDashboardStats = async (req, res) => {
try {
const [orderStats, paidRevenue, recentOrders, dailySales] =
await Promise.all([
Order.aggregate([
{
$group: {
_id: null,
totalOrders: { $sum: 1 },
paidOrders: {
$sum: {
$cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0],
},
},
pendingOrders: {
$sum: {
$cond: [
{ $eq: ["$orderStatus", "pending_payment"] },
1,
0,
],
},
},
},
},
]),
Order.aggregate([
{ $match: { paymentStatus: "paid" } },
{
$group: {
_id: null,
revenue: { $sum: "$totalAmount" },
},
},
]),
Order.find()
.sort({ createdAt: -1 })
.limit(5)
.select("customer totalAmount paymentStatus orderStatus createdAt")
.lean(),
Order.aggregate([
{ $match: { paymentStatus: "paid" } },
{
$group: {
_id: {
$dateToString: {
format: "%Y-%m-%d",
date: "$createdAt",
},
},
revenue: { $sum: "$totalAmount" },
orders: { $sum: 1 },
},
},
{ $sort: { _id: -1 } },
{ $limit: 7 },
{ $sort: { _id: 1 } },
]),
]);

const stats = orderStats[0] || {
  totalOrders: 0,
  paidOrders: 0,
  pendingOrders: 0,
};

return res.json({
  success: true,
  stats: {
    totalOrders: stats.totalOrders,
    paidOrders: stats.paidOrders,
    pendingOrders: stats.pendingOrders,
    revenue: paidRevenue[0]?.revenue || 0,
  },
  recentOrders,
  dailySales,
});

} catch (error) {
console.error("Admin stats error:", error.message);
return res.status(500).json({
success: false,
message: "Unable to load dashboard statistics.",
});
}
};

exports.getAllOrders = async (req, res) => {
try {
const { status, paymentStatus, page = 1, limit = 20 } = req.query;

const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
const pageSize = Math.min(
  100,
  Math.max(1, Number.parseInt(limit, 10) || 20)
);

const filter = {};

if (status && status !== "all") {
  if (!ALLOWED_STATUSES.includes(status) && status !== "pending_payment") {
    return res.status(400).json({
      success: false,
      message: "Invalid order status filter.",
    });
  }
  filter.orderStatus = status;
}

if (paymentStatus && paymentStatus !== "all") {
  if (!["pending", "paid", "failed"].includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment status filter.",
    });
  }
  filter.paymentStatus = paymentStatus;
}

const [orders, total] = await Promise.all([
  Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)
    .lean(),
  Order.countDocuments(filter),
]);

return res.json({
  success: true,
  orders,
  pagination: {
    page: pageNumber,
    limit: pageSize,
    total,
    pages: Math.ceil(total / pageSize),
  },
});

} catch (error) {
console.error("Admin orders error:", error.message);
return res.status(500).json({
success: false,
message: "Unable to load orders.",
});
}
};

exports.updateOrderStatus = async (req, res) => {
try {
const { id } = req.params;
const { orderStatus } = req.body;

if (!mongoose.Types.ObjectId.isValid(id)) {
  return res.status(400).json({
    success: false,
    message: "Invalid order ID.",
  });
}

if (!ALLOWED_STATUSES.includes(orderStatus)) {
  return res.status(400).json({
    success: false,
    message: "Invalid order status.",
  });
}

const order = await Order.findById(id);

if (!order) {
  return res.status(404).json({
    success: false,
    message: "Order not found.",
  });
}

// Do not prepare or deliver an order whose payment is not confirmed.
if (
  order.paymentStatus !== "paid" &&
  ["preparing", "out_for_delivery", "delivered"].includes(orderStatus)
) {
  return res.status(409).json({
    success: false,
    message: "Payment must be confirmed before fulfillment.",
  });
}

if (order.orderStatus === "cancelled") {
  return res.status(409).json({
    success: false,
    message: "Cancelled orders cannot be changed.",
  });
}

order.orderStatus = orderStatus;
await order.save();

return res.json({
  success: true,
  message: "Order status updated.",
  order,
});

} catch (error) {
console.error("Update order status error:", error.message);
return res.status(500).json({
success: false,
message: "Unable to update order status.",
});
}
};
// Admin-only product and customer management endpoints.
const Pizza = require("../models/Pizza");
const User = require("../models/User");

exports.getAdminPizzas = async (req, res) => {
  try {
    const pizzas = await Pizza.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, pizzas });
  } catch (error) {
    console.error("Admin pizzas error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load pizzas." });
  }
};

exports.createAdminPizza = async (req, res) => {
  try {
    const { name, description, price, image, category, available } = req.body;
    if (!name?.trim() || !description?.trim() || !image?.trim() || !["veg", "non-veg"].includes(category) || !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "Provide a name, description, valid price, image path/URL, and veg/non-veg category." });
    }
    const pizza = await Pizza.create({ name: name.trim(), description: description.trim(), price: Number(price), image: image.trim(), category, available: available !== false });
    return res.status(201).json({ success: true, pizza, message: "Pizza created." });
  } catch (error) {
    console.error("Create pizza error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create pizza." });
  }
};

exports.updateAdminPizza = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid pizza ID." });
    const updates = {};
    for (const key of ["name", "description", "image", "category", "available"]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ success: false, message: "Price must be zero or greater." });
      updates.price = price;
    }
    if (updates.category !== undefined && !["veg", "non-veg"].includes(updates.category)) return res.status(400).json({ success: false, message: "Category must be veg or non-veg." });
    const pizza = await Pizza.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!pizza) return res.status(404).json({ success: false, message: "Pizza not found." });
    return res.json({ success: true, pizza, message: "Pizza updated." });
  } catch (error) {
    console.error("Update pizza error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update pizza." });
  }
};

exports.deleteAdminPizza = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid pizza ID." });
    const pizza = await Pizza.findByIdAndDelete(req.params.id);
    if (!pizza) return res.status(404).json({ success: false, message: "Pizza not found." });
    return res.json({ success: true, message: "Pizza deleted." });
  } catch (error) {
    console.error("Delete pizza error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to delete pizza." });
  }
};

exports.getAdminCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: "user" }).select("name email isVerified createdAt").sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, customers });
  } catch (error) {
    console.error("Admin customers error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load customers." });
  }
};
