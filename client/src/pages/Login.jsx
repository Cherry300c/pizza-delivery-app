
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import "../Auth.css";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await loginUser({
        email: form.email.trim(),
        password: form.password,
      });

      const user = data.user;

      if (!data.token || !user) {
        throw new Error(
          "Login response is missing your account details. Please try again."
        );
      }

      if (user.role !== "admin" && user.role !== "user") {
        throw new Error(
          "Your account role is invalid. Please contact support."
        );
      }

      // Save the latest user details returned by the backend.
      localStorage.setItem("pizzaToken", data.token);
      localStorage.setItem("pizzaUser", JSON.stringify(user));

      // Tell App.jsx that authentication has changed.
      window.dispatchEvent(new Event("pizzaAuthUpdated"));

      setMessage(data.message || "Login successful!");

      // Navigate according to the role returned by the backend.
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      // Do not leave a partial or stale login session after failure.
      localStorage.removeItem("pizzaToken");
      localStorage.removeItem("pizzaUser");

      window.dispatchEvent(new Event("pizzaAuthUpdated"));

      const errorMessage =
        err.message || "Login failed. Please try again.";

      setError(errorMessage);

      if (errorMessage.toLowerCase().includes("verify your email")) {
        setMessage(
          "Please verify your email before logging in. You can request another verification email."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          🍕 Pizza<span>House</span>
        </Link>

        <p className="auth-eyebrow">WELCOME BACK</p>

        <h1>Login to your account</h1>

        <p className="auth-subtitle">
          Your favourite pizza is just a few clicks away.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="login-email">Email address</label>

          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={updateForm}
            required
          />

          <label htmlFor="login-password">Password</label>

          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={updateForm}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="auth-links">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-success" role="status">
              {message}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to PizzaHouse
        </Link>
      </section>
    </main>
  );
}
