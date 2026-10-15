const Pizza = require("../models/Pizza");

// Get all pizzas
const getPizzas = async (req, res) => {
  try {
    const pizzas = await Pizza.find({
      available: true,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      pizzas,
    });
  } catch (error) {
    console.error("Get pizzas error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getPizzas,
};