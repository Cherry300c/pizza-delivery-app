const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  getMyOrders,
  getMyOrderById,
} = require("../controllers/orderController");

router.get("/my-orders", protect, getMyOrders);
router.get("/:id", protect, getMyOrderById);

module.exports = router;