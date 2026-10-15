const express = require("express");

const {
  getPizzas,
} = require("../controllers/pizzaController");

const router = express.Router();

// Get all available pizzas
router.get("/", getPizzas);

module.exports = router;