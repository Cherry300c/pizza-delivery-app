
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");

const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
} = require("../controllers/inventoryController");

router.use(protect, requireAdmin);

router.get("/", getInventory);
router.post("/", createInventoryItem);
router.patch("/:id", updateInventoryItem);

module.exports = router;
