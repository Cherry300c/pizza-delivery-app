
const cron = require("node-cron");
const Inventory = require("../models/Inventory");

// Change this path if your email service has a different filename.
const { sendLowStockAlert } = require("../services/emailService");

let isRunning = false;

async function checkLowStock() {
  // Avoid overlapping checks within this server process.
  if (isRunning) return;
  isRunning = true;

  try {
    // Reset alerts when stock rises above the configured threshold.
    await Inventory.updateMany(
      {
        $expr: {
          $gt: ["$stock", "$lowStockThreshold"],
        },
      },
      {
        $set: { alertSent: false },
      }
    );

    // Find ingredients that need an email alert.
    const lowStockItems = await Inventory.find({
      $expr: {
        $lte: ["$stock", "$lowStockThreshold"],
      },
      alertSent: false,
    }).lean();

    if (lowStockItems.length === 0) {
      return;
    }

    // Send one email containing all currently low-stock ingredients.
    await sendLowStockAlert(lowStockItems);

    // Mark alerted items only after the email has been sent.
    await Inventory.updateMany(
      {
        _id: {
          $in: lowStockItems.map((item) => item._id),
        },
        alertSent: false,
        $expr: {
          $lte: ["$stock", "$lowStockThreshold"],
        },
      },
      {
        $set: { alertSent: true },
      }
    );

    console.log(
      `Low-stock email sent for ${lowStockItems.length} item(s).`
    );
  } catch (error) {
    console.error("Low-stock alert check failed:", error.message);
  } finally {
    isRunning = false;
  }
}

function startLowStockAlert() {
  // Prevent accidentally registering the scheduler twice.
  if (startLowStockAlert.started) return;
  startLowStockAlert.started = true;

  // Run a check immediately after startup.
  checkLowStock();

  // Repeat every five minutes.
  cron.schedule("*/5 * * * *", () => {
    checkLowStock();
  });

  console.log("Low-stock alert scheduler started.");
}

module.exports = startLowStockAlert;
