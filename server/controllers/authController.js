const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendVerificationEmail = require("../services/emailService");
const nodemailer = require("nodemailer");

// ===============================
// Register User
// ===============================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Login User
// ===============================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from the .env file");
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Verify Email
// ===============================
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification link",
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    await user.save();

    res.status(200).json({
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Resend Verification Email
// ===============================
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide your email",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken
    );

    res.status(200).json({
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Forgot Password
// ===============================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide your email",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Avoid revealing whether an account exists.
    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate a secure reset token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    // FIX: Open the React frontend, not the backend API.
    const frontendURL = "http://localhost:5173";
    const resetLink =
      `${frontendURL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"Pizza Delivery" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Pizza Delivery Password 🍕",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          padding: 24px;
          max-width: 600px;
          margin: auto;
          color: #222;
        ">
          <h2>Password Reset Request 🍕</h2>

          <p>Hello ${user.name},</p>

          <p>
            We received a request to reset your Pizza Delivery
            account password.
          </p>

          <p>
            Click the button below to create a new password:
          </p>

          <a
            href="${resetLink}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background-color: #ff5722;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            "
          >
            Reset Password
          </a>

          <p style="margin-top: 20px;">
            This link expires in 15 minutes.
          </p>

          <p>
            If you did not request this, you can safely ignore
            this email.
          </p>

          <hr />

          <p style="font-size: 12px; color: #777;">
            Pizza Delivery App
          </p>
        </div>
      `,
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Reset Password
// ===============================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset link",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Get Current User
// ===============================
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ===============================
// Export Controllers
// ===============================
module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getMe,
};