const express = require("express");

const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Current user
router.get("/me", protect, getMe);

// Verify email
router.get("/verify/:token", verifyEmail);

// Resend verification email
router.post(
  "/resend-verification",
  resendVerificationEmail
);

// Forgot password
router.post(
  "/forgot-password",
  forgotPassword
);

// Reset password
router.post(
  "/reset-password/:token",
  resetPassword
);

module.exports = router;