const mongoose = require("mongoose");
require("dotenv").config();

const Pizza = require("./models/Pizza");

const pizzas = [
  // CLASSIC PIZZAS
  {
    name: "Margherita",
    description: "Classic pizza with tomato sauce, mozzarella and fresh basil.",
    price: 199,
    image: "/images/pizza/Margherita.jpg",
    category: "veg",
  },
  {
    name: "Farmhouse",
    description: "Loaded with onion, capsicum, tomato and mozzarella cheese.",
    price: 249,
    image: "/images/pizza/Farmhouse.jpg",
    category: "veg",
  },
  {
    name: "Paneer Tikka",
    description: "Spicy paneer tikka with onion, capsicum and cheese.",
    price: 279,
    image: "/images/pizza/Paneer Tikka.jpg",
    category: "veg",
  },
  {
    name: "Chicken Pepperoni",
    description: "Chicken pepperoni with mozzarella and rich tomato sauce.",
    price: 299,
    image: "/images/pizza/Chicken Pepperoni.jpg",
    category: "non-veg",
  },
  {
    name: "Chicken Tikka",
    description: "Juicy chicken tikka with onion, capsicum and mozzarella.",
    price: 319,
    image: "/images/pizza/Chicken Tikka.jpg",
    category: "non-veg",
  },
  {
    name: "BBQ Chicken",
    description: "Smoky barbecue chicken with melted mozzarella.",
    price: 329,
    image: "/images/pizza/BBQ Chicken.jpg",
    category: "non-veg",
  },
  {
    name: "BBQ Paneer",
    description: "Paneer with smoky BBQ sauce and mozzarella.",
    price: 279,
    image: "/images/pizza/BBQ Paneer.jpg",
    category: "veg",
  },
  {
    name: "Cheese Burst Veg",
    description: "Vegetarian pizza with a rich cheese-burst base.",
    price: 269,
    image: "/images/pizza/Cheese Burst Veg.jpg",
    category: "veg",
  },
  {
    name: "Chicken Dominator",
    description: "A loaded chicken pizza with rich sauce and cheese.",
    price: 349,
    image: "/images/pizza/Chicken Dominator.jpg",
    category: "non-veg",
  },
  {
    name: "Chicken Fiesta",
    description: "Chicken with capsicum, onion and mozzarella.",
    price: 329,
    image: "/images/pizza/Chicken Fiesta.jpg",
    category: "non-veg",
  },
  {
    name: "Chicken Keema",
    description: "Spiced chicken keema with cheese and tomato sauce.",
    price: 329,
    image: "/images/pizza/Chicken Keema.jpg",
    category: "non-veg",
  },
  {
    name: "Chicken Sausage",
    description: "Chicken sausage pieces with mozzarella cheese.",
    price: 299,
    image: "/images/pizza/Chicken Sausage.jpg",
    category: "non-veg",
  },
  {
    name: "Chicken Supreme",
    description: "Chicken with vegetables, tomato sauce and mozzarella.",
    price: 339,
    image: "/images/pizza/Chicken Supreme.jpg",
    category: "non-veg",
  },
  {
    name: "Corn & Cheese",
    description: "Sweet corn and melted mozzarella cheese.",
    price: 229,
    image: "/images/pizza/Corn & Cheese.jpg",
    category: "veg",
  },
  {
    name: "Double Cheese",
    description: "Extra mozzarella cheese with rich tomato sauce.",
    price: 249,
    image: "/images/pizza/Double Cheese.jpg",
    category: "veg",
  },

  // PREMIUM PIZZAS
  {
    name: "Cheese Overload",
    description: "A rich blend of mozzarella, cheddar and extra cheese.",
    price: 349,
    image: "/images/pizza/Cheese Overload_ Veg vs Non-Veg Pizzas.png",
    category: "veg",
  },
  {
    name: "Four Cheese",
    description: "Mozzarella, cheddar, parmesan and a special cheese blend.",
    price: 379,
    image: "/images/pizza/Four Cheese Pizza_ Veg vs Non-Veg.png",
    category: "veg",
  },
  {
    name: "Meat Lovers",
    description: "A hearty combination of chicken toppings and mozzarella.",
    price: 429,
    image: "/images/pizza/Loaded Meat Lovers Pizza Feast.png",
    category: "non-veg",
  },
  {
    name: "Ultimate Supreme",
    description: "Loaded with chicken, mushrooms, onion, capsicum and olives.",
    price: 399,
    image: "/images/pizza/Loaded Supreme Meat Pizza.png",
    category: "non-veg",
  },
  {
    name: "Mexican Fiesta",
    description: "Mexican sauce, sweet corn, capsicum, onion and jalapeños.",
    price: 329,
    image: "/images/pizza/Loaded Mexican-Style Vegetarian Pizza.png",
    category: "veg",
  },
  {
    name: "Italian Special",
    description: "Italian herbs, mozzarella, mushrooms, olives and vegetables.",
    price: 329,
    image: "/images/pizza/Italian Veg.jpg",
    category: "veg",
  },
  {
    name: "Smoky BBQ",
    description: "Smoky BBQ chicken with onion, capsicum and mozzarella.",
    price: 379,
    image: "/images/pizza/Smoky BBQ Chicken Pizza Feast.png",
    category: "non-veg",
  },
  {
    name: "Spicy Inferno",
    description: "Spicy chicken, jalapeños, chili and mozzarella.",
    price: 369,
    image: "/images/pizza/Inferno Chicken Pepperoni Pizza.png",
    category: "non-veg",
  },
  {
    name: "Chef's Special",
    description: "Specially seasoned chicken, mushrooms and mozzarella.",
    price: 399,
    image: "/images/pizza/Loaded Chef’s Special Non-Veg Pizza.png",
    category: "non-veg",
  },
  {
    name: "Signature Pizza",
    description: "Signature sauce with grilled chicken, vegetables and cheese.",
    price: 429,
    image: "/images/pizza/Chicken Special.jpg",
    category: "non-veg",
  },
];

const seedPizzas = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your server/.env file");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const operations = pizzas.map((pizza) => ({
      updateOne: {
        filter: { name: pizza.name },
        update: {
          $set: {
            ...pizza,
            available: true,
          },
        },
        upsert: true,
      },
    }));

    const result = await Pizza.bulkWrite(operations);

    console.log("Pizza data updated successfully 🍕");
    console.log(`Added: ${result.upsertedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);
    console.log(`Total pizza entries in this seed: ${pizzas.length}`);
  } catch (error) {
    console.error("Error seeding pizzas:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedPizzas();