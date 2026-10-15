import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import "../Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const data = await forgotPassword(email);
      setMessage(
        data.message || "Check your email for reset instructions."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-password-page">
      <form
        className="forgot-password-card"
        onSubmit={handleSubmit}
      >
        <div className="forgot-password-icon">🔐</div>

        <h1>Forgot Password?</h1>

        <p className="subtitle">
          No worries! Enter your registered email address
          and we'll help you reset your password.
        </p>

        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Reset Password"}
        </button>

        {message && (
          <p className="forgot-password-message">
            {message}
          </p>
        )}

        {error && (
          <p
            className="forgot-password-message"
            style={{ color: "#dc2626" }}
          >
            {error}
          </p>
        )}

        <Link className="forgot-password-back" to="/login">
          ← Back to Login
        </Link>
      </form>
    </div>
  );
}