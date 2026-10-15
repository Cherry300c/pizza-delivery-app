import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";
import "../Auth.css";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await resetPassword(token, password);
      setMessage(data.message || "Password reset successfully.");

      setTimeout(() => navigate("/login"), 2000);
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
        <h1>Reset Password</h1>
        <p className="subtitle">
          Create a new password for your Pizza Delivery account.
        </p>

        <input
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>

        {message && (
          <p className="forgot-password-message">{message}</p>
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