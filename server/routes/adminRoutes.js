const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  getAdminPizzas,
  createAdminPizza,
  updateAdminPizza,
  deleteAdminPizza,
  getAdminCustomers,
} = require("../controllers/adminController");

router.use(protect, requireAdmin);

router.get("/stats", getDashboardStats);
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/pizzas", getAdminPizzas);
router.post("/pizzas", createAdminPizza);
router.patch("/pizzas/:id", updateAdminPizza);
router.delete("/pizzas/:id", deleteAdminPizza);
router.get("/customers", getAdminCustomers);

module.exports = router;