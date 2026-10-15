import { useState } from "react";
import { Link } from "react-router-dom";
import { registerUser,resendVerificationEmail} from "../services/authService";
import "../Auth.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [registered, setRegistered] = useState(false);

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setRegistered(true);
      setMessage(data.message || "Account created. Please verify your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const data = await resendVerificationEmail(form.email.trim());
      setMessage(data.message || "Verification email sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          🍕 Pizza<span>House</span>
        </Link>

        <p className="auth-eyebrow">JOIN PIZZAHOUSE</p>
        <h1>Create your account</h1>
        <p className="auth-subtitle">
          Sign up for delicious pizzas and easy ordering.
        </p>

        {!registered ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              name="name"
              autoComplete="name"
              placeholder="Your full name"
              value={form.name}
              onChange={updateForm}
              required
            />

            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={updateForm}
              required
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="At least 6 characters"
              value={form.password}
              onChange={updateForm}
              required
            />

            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Enter password again"
              value={form.confirmPassword}
              onChange={updateForm}
              required
            />

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        ) : (
          <div className="verification-notice">
            <div className="verification-icon">✉</div>
            <h2>Check your inbox</h2>
            <p>{message}</p>
            <p>
              Open the verification link in your email before logging in.
              Check your spam folder too.
            </p>

            <button
              type="button"
              className="auth-submit"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend verification email"}
            </button>
          </div>
        )}

        {error && registered && <p className="auth-error">{error}</p>}
        {message && registered && <p className="auth-success">{message}</p>}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">← Back to PizzaHouse</Link>
      </section>
    </main>
  );
}