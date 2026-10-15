
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const Pizza = require("../models/Pizza");
const Order = require("../models/Order");
const {
  deductOrderInventory,
} = require("../services/inventoryService");

const DELIVERY_FEE = 40;
const MAX_QUANTITY = 20;

// Server-side prices: never trust prices sent by the browser.
const OPTIONS = {
  bases: {
    "Classic Pan": 0,
    "Thin & Crispy": 20,
    "Whole Wheat": 30,
    "Cheese Stuffed": 60,
    "Gluten-Free": 50,
  },
  sauces: {
    "Classic Tomato": 0,
    "Spicy Marinara": 10,
    "BBQ Sauce": 15,
    Pesto: 25,
    "White Garlic Sauce": 20,
  },
  cheeses: {
    Mozzarella: 0,
    Cheddar: 20,
    Parmesan: 25,
    "Four Cheese Blend": 40,
  },
  sizes: {
    Small: 149,
    Medium: 249,
    Large: 349,
    "Extra Large": 449,
  },
  crusts: {
    "Thin Crust": 0,
    "Classic Hand-Tossed": 0,
    "Thick Crust": 30,
    "Cheese Burst": 50,
  },
  vegToppings: {
    Onion: 15,
    Capsicum: 15,
    Mushroom: 20,
    Olives: 20,
    "Sweet Corn": 15,
    Jalapenos: 15,
    Tomato: 15,
    Spinach: 15,
  },
  nonVegToppings: {
    Chicken: 40,
    Pepperoni: 45,
    Sausage: 35,
    Bacon: 45,
  },
  extraCheese: 40,
};

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay API keys are not configured.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function validCustomer(customer) {
  return (
    customer &&
    typeof customer.name === "string" &&
    customer.name.trim().length >= 2 &&
    typeof customer.phone === "string" &&
    /^[6-9]\d{9}$/.test(customer.phone) &&
    typeof customer.address === "string" &&
    customer.address.trim().length >= 5 &&
    typeof customer.city === "string" &&
    customer.city.trim().length >= 2 &&
    typeof customer.pincode === "string" &&
    /^\d{6}$/.test(customer.pincode)
  );
}

function validQuantity(value) {
  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_QUANTITY
  );
}

function getOptionPrice(options, value, label) {
  if (
    typeof value !== "string" ||
    !Object.prototype.hasOwnProperty.call(options, value)
  ) {
    throw new Error(`Invalid custom pizza ${label}.`);
  }

  return options[value];
}

function buildCustomPizza(item) {
  const input = item.customPizza;

  if (!input || typeof input !== "object") {
    throw new Error("Custom pizza configuration is missing.");
  }

  if (!["Veg", "Non-Veg"].includes(input.pizzaType)) {
    throw new Error("Invalid custom pizza type.");
  }

  const basePrice = getOptionPrice(
    OPTIONS.bases,
    input.base,
    "base"
  );

  const saucePrice = getOptionPrice(
    OPTIONS.sauces,
    input.sauce,
    "sauce"
  );

  const cheesePrice = getOptionPrice(
    OPTIONS.cheeses,
    input.cheese,
    "cheese"
  );

  const sizePrice = getOptionPrice(
    OPTIONS.sizes,
    input.size,
    "size"
  );

  const crustPrice = getOptionPrice(
    OPTIONS.crusts,
    input.crust,
    "crust"
  );

  if (
    !Array.isArray(input.toppings) ||
    input.toppings.length > 12
  ) {
    throw new Error("Invalid custom pizza toppings.");
  }

  const allowedToppings =
    input.pizzaType === "Veg"
      ? OPTIONS.vegToppings
      : {
          ...OPTIONS.vegToppings,
          ...OPTIONS.nonVegToppings,
        };

  const uniqueToppings = [...new Set(input.toppings)];

  if (uniqueToppings.length !== input.toppings.length) {
    throw new Error(
      "Duplicate custom pizza toppings are not allowed."
    );
  }

  let toppingsPrice = 0;

  for (const topping of uniqueToppings) {
    toppingsPrice += getOptionPrice(
      allowedToppings,
      topping,
      "topping"
    );
  }

  if (typeof input.extraCheese !== "boolean") {
    throw new Error("Invalid extra cheese selection.");
  }

  const price =
    basePrice +
    saucePrice +
    cheesePrice +
    sizePrice +
    crustPrice +
    toppingsPrice +
    (input.extraCheese ? OPTIONS.extraCheese : 0);

  if (!Number.isSafeInteger(price) || price <= 0) {
    throw new Error("Invalid custom pizza price.");
  }

  return {
    isCustomized: true,
    customPizza: {
      pizzaType: input.pizzaType,
      base: input.base,
      sauce: input.sauce,
      cheese: input.cheese,
      size: input.size,
      crust: input.crust,
      toppings: uniqueToppings,
      extraCheese: input.extraCheese,
    },
    name: `Custom ${input.pizzaType} Pizza`,
    price,
  };
}

// POST /api/payment/create-order
exports.createPaymentOrder = async (req, res) => {
  let savedOrder = null;

  try {
    const { items, customer } = req.body;

    if (!validCustomer(customer)) {
      return res.status(400).json({
        message: "Please enter valid delivery details.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 30
    ) {
      return res.status(400).json({
        message: "Your cart is empty or invalid.",
      });
    }

    const regularQuantities = new Map();
    const customItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!validQuantity(quantity)) {
        return res.status(400).json({
          message: "Invalid item quantity.",
        });
      }

      if (item.isCustomized === true) {
        if (item.pizzaId || item._id || item.id) {
          return res.status(400).json({
            message:
              "Custom pizzas must not include a regular pizza ID.",
          });
        }

        customItems.push({ item, quantity });
        continue;
      }

      const pizzaId = String(item.pizzaId || "");

      if (!mongoose.Types.ObjectId.isValid(pizzaId)) {
        return res.status(400).json({
          message: "Invalid pizza ID.",
        });
      }

      const combinedQuantity =
        (regularQuantities.get(pizzaId) || 0) + quantity;

      if (combinedQuantity > MAX_QUANTITY) {
        return res.status(400).json({
          message: "Maximum quantity per regular pizza is 20.",
        });
      }

      regularQuantities.set(pizzaId, combinedQuantity);
    }

    const pizzaIds = [...regularQuantities.keys()];

    const pizzas = pizzaIds.length
      ? await Pizza.find({
          _id: { $in: pizzaIds },
          available: true,
        })
      : [];

    if (pizzas.length !== pizzaIds.length) {
      return res.status(400).json({
        message:
          "A regular pizza is unavailable. Refresh your cart.",
      });
    }

    let subtotalPaise = 0;
    const orderItems = [];

    for (const pizza of pizzas) {
      const quantity = regularQuantities.get(
        pizza._id.toString()
      );

      const pricePaise = Math.round(Number(pizza.price) * 100);

      if (!Number.isSafeInteger(pricePaise) || pricePaise <= 0) {
        throw new Error(
          "A regular pizza has an invalid database price."
        );
      }

      subtotalPaise += pricePaise * quantity;

      orderItems.push({
        pizzaId: pizza._id,
        isCustomized: false,
        name: pizza.name,
        price: pricePaise / 100,
        quantity,
      });
    }

    for (const { item, quantity } of customItems) {
      const custom = buildCustomPizza(item);
      const pricePaise = Math.round(custom.price * 100);

      subtotalPaise += pricePaise * quantity;

      orderItems.push({
        isCustomized: true,
        customPizza: custom.customPizza,
        name: custom.name,
        price: custom.price,
        quantity,
      });
    }

    const deliveryPaise = DELIVERY_FEE * 100;
    const totalPaise = subtotalPaise + deliveryPaise;

    if (
      !Number.isSafeInteger(totalPaise) ||
      totalPaise <= 0 ||
      totalPaise > 100000000
    ) {
      return res.status(400).json({
        message: "Invalid order amount.",
      });
    }

    savedOrder = await Order.create({
      user: req.user.userId,
      items: orderItems,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone,
        address: customer.address.trim(),
        city: customer.city.trim(),
        pincode: customer.pincode,
      },
      subtotal: subtotalPaise / 100,
      deliveryFee: DELIVERY_FEE,
      totalAmount: totalPaise / 100,
      currency: "INR",
      paymentStatus: "pending",
      orderStatus: "pending_payment",
      inventoryDeducted: false,
    });

    const razorpay = getRazorpayClient();

    const razorpayOrder = await razorpay.orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: `ph_${savedOrder._id.toString()}`,
      notes: {
        pizzaHouseOrderId: savedOrder._id.toString(),
      },
    });

    savedOrder.razorpayOrderId = razorpayOrder.id;
    await savedOrder.save();

    return res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      order: razorpayOrder,
      appOrderId: savedOrder._id,
      amount: totalPaise,
      currency: "INR",
    });
  } catch (error) {
   console.error("PAYMENT VERIFICATION FAILED");
console.error("Message:", error.message);
console.error("Code:", error.code);
console.error("Stack:", error.stack);

    if (savedOrder && !savedOrder.razorpayOrderId) {
      try {
        savedOrder.paymentStatus = "failed";
        await savedOrder.save();
      } catch (saveError) {
        console.error(
          "Order cleanup failed:",
          saveError.message
        );
      }
    }

    const isValidationError =
      error.message &&
      (
        error.message.startsWith("Invalid custom pizza") ||
        error.message.startsWith("Custom pizza") ||
        error.message.startsWith("Duplicate custom pizza") ||
        error.message.startsWith("Invalid extra cheese")
      );

    return res.status(isValidationError ? 400 : 500).json({
      message: isValidationError
        ? error.message
        : "Could not create the payment order.",
    });
  }
};

// POST /api/payment/verify
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment verification details.",
      });
    }

    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Idempotent success response for a previously completed payment.
    if (
      order.paymentStatus === "paid" &&
      order.razorpayPaymentId === razorpay_payment_id &&
      order.inventoryDeducted === true
    ) {
      return res.json({
        success: true,
        orderId: order._id,
        message: "Payment already verified.",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(409).json({
        success: false,
        message:
          "This order is already marked paid. Please contact support to reconcile its inventory status.",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: "Payment service is not configured.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order.razorpayOrderId}|${razorpay_payment_id}`)
      .digest();

    const receivedSignature = Buffer.from(
      razorpay_signature,
      "hex"
    );

    if (
      expectedSignature.length !== receivedSignature.length ||
      !crypto.timingSafeEqual(
        expectedSignature,
        receivedSignature
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
      });
    }

    const razorpay = getRazorpayClient();
    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      payment.order_id !== order.razorpayOrderId ||
      Number(payment.amount) !==
        Math.round(order.totalAmount * 100) ||
      payment.currency !== order.currency ||
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment has not been confirmed as captured.",
      });
    }

    // Commit stock deduction and order confirmation atomically.
    // MongoDB must support transactions.
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const currentOrder = await Order.findOne({
          _id: order._id,
          user: req.user.userId,
        }).session(session);

        if (!currentOrder) {
          throw new Error(
            "Order not found during payment confirmation."
          );
        }

        // A concurrent verification may have finished first.
        if (currentOrder.paymentStatus === "paid") {
          if (
            currentOrder.razorpayPaymentId ===
              razorpay_payment_id &&
            currentOrder.inventoryDeducted === true
          ) {
            return;
          }

          throw new Error(
            "Order payment or inventory state needs reconciliation."
          );
        }

        await deductOrderInventory(currentOrder, session);

        currentOrder.razorpayPaymentId = payment.id;
        currentOrder.paymentStatus = "paid";
        currentOrder.orderStatus = "confirmed";

        await currentOrder.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return res.json({
      success: true,
      orderId: order._id,
      message: "Payment verified and order confirmed.",
    });
  } catch (error) {
    console.error("Verify payment:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "Payment may have been captured, but confirmation or inventory deduction failed. Check the order status and reconcile before retrying or requesting another payment.",
    });
  }
};
