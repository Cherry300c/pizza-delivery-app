import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, logoutUser } from "../services/authService";
import "../Auth.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Do not leave a previous customer/admin session active during role checking.
      logoutUser();
      const data = await loginUser({ email: email.trim(), password });
      if (data.user?.role !== "admin") {
        logoutUser();
        throw new Error("This account is not an administrator. Use your admin email or ask the system owner to grant admin access.");
      }
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">🍕 Pizza<span>House</span></Link>
        <p className="auth-eyebrow">RESTRICTED ACCESS</p>
        <h1>Administrator Login</h1>
        <p className="auth-subtitle">Sign in with your authorized admin account to manage orders, products and customers.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="admin-email">Admin email</label>
          <input id="admin-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
          <label htmlFor="admin-password">Password</label>
          <div className="password-field">
            <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" required />
            <button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Checking access..." : "Sign in as Admin"}</button>
        </form>
        <Link to="/login" className="back-home">Customer login</Link>
        <Link to="/" className="back-home">← Back to PizzaHouse</Link>
      </section>
    </main>
  );
}
