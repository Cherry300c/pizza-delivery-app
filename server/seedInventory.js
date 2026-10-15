
require("dotenv").config();
const mongoose = require("mongoose");
const Inventory = require("./models/Inventory");

const ingredients = [
  // Pizza bases
  ["Classic Pan", "base", "pieces"],
  ["Thin & Crispy", "base", "pieces"],
  ["Whole Wheat", "base", "pieces"],
  ["Cheese Stuffed", "base", "pieces"],
  ["Gluten-Free", "base", "pieces"],

  // Sauces
  ["Classic Tomato", "sauce", "portions"],
  ["Spicy Marinara", "sauce", "portions"],
  ["BBQ Sauce", "sauce", "portions"],
  ["Pesto", "sauce", "portions"],
  ["White Garlic Sauce", "sauce", "portions"],

  // Cheeses
  ["Mozzarella", "cheese", "portions"],
  ["Cheddar", "cheese", "portions"],
  ["Parmesan", "cheese", "portions"],
  ["Four Cheese Blend", "cheese", "portions"],
  ["Extra Cheese", "cheese", "portions"],

  // Vegetables
  ["Onion", "vegetable", "portions"],
  ["Capsicum", "vegetable", "portions"],
  ["Mushroom", "vegetable", "portions"],
  ["Olives", "vegetable", "portions"],
  ["Sweet Corn", "vegetable", "portions"],
  ["Jalapenos", "vegetable", "portions"],
  ["Tomato", "vegetable", "portions"],
  ["Spinach", "vegetable", "portions"],

  // Non-vegetarian toppings
  ["Chicken", "meat", "portions"],
  ["Pepperoni", "meat", "portions"],
  ["Sausage", "meat", "portions"],
  ["Bacon", "meat", "portions"],
];

async function seedInventory() {
  let connected = false;

  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MongoDB URI not found. Check the variable name in server/.env."
      );
    }

    await mongoose.connect(mongoUri);
    connected = true;

    console.log("MongoDB connected:", mongoose.connection.name);

    let inserted = 0;
    let existing = 0;

    for (const [name, category, unit] of ingredients) {
      const result = await Inventory.updateOne(
        { name, category },
        {
          $setOnInsert: {
            name,
            category,
            stock: 100,
            lowStockThreshold: 20,
            unit,
            alertSent: false,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount === 1) {
        inserted++;
        console.log(`Added: ${name} (${category})`);
      } else {
        existing++;
        console.log(`Already exists: ${name} (${category})`);
      }
    }

    console.log("\nInventory setup completed.");
    console.log("New ingredients:", inserted);
    console.log("Existing ingredients preserved:", existing);
    console.log("Total configured:", ingredients.length);
  } catch (error) {
    console.error("Inventory setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.disconnect();
    }
  }
}

seedInventory();
