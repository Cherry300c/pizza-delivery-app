const User = require("../models/User");

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user?.userId)
      .select("_id role isVerified")
      .lean();

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Account not found or not verified.",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access is required.",
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify admin access.",
    });
  }
}

module.exports = requireAdmin;