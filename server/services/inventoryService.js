
const mongoose = require("mongoose");
const Inventory = require("../models/Inventory");

// These toppings use the "meat" inventory category.
const MEAT_TOPPINGS = new Set([
  "Chicken",
  "Pepperoni",
  "Sausage",
  "Bacon",
]);

function getRequirements(orderItems) {
  const requirements = new Map();

  function add(name, category, quantity) {
    const key = `${category}:${name}`;
    requirements.set(key, {
      name,
      category,
      quantity:
        (requirements.get(key)?.quantity || 0) + quantity,
    });
  }

  for (const item of orderItems) {
    // Regular pizzas need a recipe before their ingredients
    // can be deducted accurately.
    if (!item.isCustomized) {
      continue;
    }

    const pizza = item.customPizza;
    const quantity = item.quantity;

    add(pizza.base, "base", quantity);
    add(pizza.sauce, "sauce", quantity);
    add(pizza.cheese, "cheese", quantity);

    for (const topping of pizza.toppings || []) {
      const category = MEAT_TOPPINGS.has(topping)
        ? "meat"
        : "vegetable";

      add(topping, category, quantity);
    }

    if (pizza.extraCheese) {
      add("Extra Cheese", "cheese", quantity);
    }
  }

  return [...requirements.values()];
}

async function deductOrderInventory(order, session) {
  if (order.inventoryDeducted) {
    return;
  }

  const requirements = getRequirements(order.items);

  // Resolve all ingredient records before updating anything.
  const resolved = [];

  for (const requirement of requirements) {
    const ingredient = await Inventory.findOne({
      name: requirement.name,
      category: requirement.category,
    }).session(session);

    if (!ingredient) {
      throw new Error(
        `Inventory item missing: ${requirement.name} (${requirement.category})`
      );
    }

    resolved.push({
      ...requirement,
      id: ingredient._id,
    });
  }

  // Conditional updates prevent stock from becoming negative.
  // All updates roll back together if any ingredient is unavailable.
  for (const requirement of resolved) {
    const result = await Inventory.updateOne(
      {
        _id: requirement.id,
        stock: { $gte: requirement.quantity },
      },
      {
        $inc: { stock: -requirement.quantity },
        $set: { alertSent: false },
      },
      { session }
    );

    if (result.modifiedCount !== 1) {
      throw new Error(
        `Insufficient stock for ${requirement.name}`
      );
    }
  }

  order.inventoryDeducted = true;
  await order.save({ session });
}

module.exports = {
  deductOrderInventory,
};

