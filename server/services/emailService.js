
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (email, name, token) => {
  const backendURL = (
    process.env.BACKEND_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/$/, "");

  const verificationLink = `${backendURL}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: `"Pizza Delivery" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Pizza Delivery Account 🍕",
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2>Welcome to Pizza Delivery, ${name}! 🍕</h2>
        <p>Thank you for registering.</p>
        <p>Please verify your email address:</p>
        <a href="${verificationLink}"
          style="display:inline-block;padding:12px 20px;
          background:#ff5722;color:white;text-decoration:none;
          border-radius:6px">
          Verify Email
        </a>
        <p>This verification link will expire in 24 hours.</p>
      </div>
    `,
  });
};

const sendLowStockAlert = async (items) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  if (!adminEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email configuration is missing.");
  }

  const rows = items.map((item) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">
        ${item.name}
      </td>
      <td style="padding:8px;border:1px solid #ddd">
        ${item.category}
      </td>
      <td style="padding:8px;border:1px solid #ddd">
        ${item.stock} ${item.unit}
      </td>
      <td style="padding:8px;border:1px solid #ddd">
        ${item.lowStockThreshold}
      </td>
    </tr>
  `).join("");

  await transporter.sendMail({
    from: `"Pizza Delivery Inventory" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `⚠️ PizzaHouse Low Stock Alert (${items.length} items)`,
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Low Inventory Alert 🍕</h2>
        <p>The following ingredients have reached or fallen below
        their configured stock thresholds.</p>
        <table style="border-collapse:collapse;width:100%">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd">Ingredient</th>
              <th style="padding:8px;border:1px solid #ddd">Category</th>
              <th style="padding:8px;border:1px solid #ddd">Stock</th>
              <th style="padding:8px;border:1px solid #ddd">Threshold</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p>Please review and replenish your inventory.</p>
      </div>
    `,
  });
};

module.exports = sendVerificationEmail;
module.exports.sendLowStockAlert = sendLowStockAlert;
