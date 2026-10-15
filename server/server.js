
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const pizzaRoutes = require("./routes/pizzaRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");

// Scheduled low-stock alert job
const startLowStockAlert = require("./jobs/lowStockAlert");

const app = express();

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      // Development-only CORS: allow local Vite ports,
      // plus tools without an Origin header.
      if (!origin) return callback(null, true);

      try {
        const parsed = new URL(origin);

        const isLocalFrontend =
          ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
          ["http:", "https:"].includes(parsed.protocol);

        return callback(
          isLocalFrontend
            ? null
            : new Error("Origin is not allowed by CORS"),
          isLocalFrontend
        );
      } catch {
        return callback(new Error("Invalid request origin"));
      }
    },
  })
);

app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/pizzas", pizzaRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// Admin inventory routes
app.use("/api/admin/inventory", inventoryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Pizza Delivery API is running 🍕",
  });
});

// Start server after connecting to MongoDB
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    // Start scheduled low-stock checks after DB connection.
    startLowStockAlert();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Auth routes registered at /api/auth");
      console.log("Pizza routes registered at /api/pizzas");
      console.log("Payment routes registered at /api/payment");
      console.log("Order routes registered at /api/orders");
      console.log("Admin routes registered at /api/admin");
      console.log(
        "Inventory routes registered at /api/admin/inventory"
      );
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();
