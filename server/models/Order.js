
const mongoose = require("mongoose");

// Custom pizza configuration
const customPizzaSchema = new mongoose.Schema(
  {
    pizzaType: {
      type: String,
      enum: ["Veg", "Non-Veg"],
      required: true,
    },

    base: {
      type: String,
      required: true,
      trim: true,
    },

    sauce: {
      type: String,
      required: true,
      trim: true,
    },

    cheese: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
    },

    crust: {
      type: String,
      required: true,
      trim: true,
    },

    toppings: {
      type: [String],
      default: [],
    },

    extraCheese: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Individual order item
const orderItemSchema = new mongoose.Schema(
  {
    // Required for regular pizzas; omitted for custom pizzas.
    pizzaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pizza",
      required: false,
    },

    isCustomized: {
      type: Boolean,
      default: false,
    },

    customPizza: {
      type: customPizzaSchema,
      required: function () {
        return this.isCustomized === true;
      },
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
  },
  { _id: true }
);

// Validate regular and customized pizza identifiers.
orderItemSchema.pre("validate", function (next) {
  if (this.isCustomized) {
    if (this.pizzaId) {
      this.invalidate(
        "pizzaId",
        "Custom pizzas must not use a regular pizza ID."
      );
    }

    if (!this.customPizza) {
      this.invalidate(
        "customPizza",
        "Custom pizza configuration is required."
      );
    }
  } else {
    if (!this.pizzaId) {
      this.invalidate(
        "pizzaId",
        "A regular pizza requires a pizza ID."
      );
    }

    if (this.customPizza) {
      this.invalidate(
        "customPizza",
        "Regular pizzas must not contain custom pizza configuration."
      );
    }
  }

  next();
});

// Main order schema
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) &&
          items.length > 0 &&
          items.length <= 30,
        message: "An order must contain between 1 and 30 items.",
      },
    },

    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
      },

      address: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      pincode: {
        type: String,
        required: true,
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      required: true,
      default: 40,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    // Razorpay order ID
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Razorpay captured payment ID
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Payment status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },

    // Order tracking status
    orderStatus: {
      type: String,
      enum: [
        "pending_payment",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending_payment",
      index: true,
    },

    // True only after the inventory service completes deduction.
    inventoryDeducted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Useful indexes for customer order history and admin dashboards.
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, inventoryDeducted: 1 });

module.exports = mongoose.model("Order", orderSchema);
