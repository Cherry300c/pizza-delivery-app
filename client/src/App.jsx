
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import OrderHistory from "./pages/OrderHistory";
import TrackOrder from "./pages/TrackOrder";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import CustomizePizza from "./components/CustomizePizza";

function readToken() {
  return localStorage.getItem("pizzaToken");
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("pizzaUser") || "null");
  } catch {
    return null;
  }
}

function WelcomePage() {
  const token = readToken();
  const user = readUser();

  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <div className="welcome-logo">🍕</div>

        <h1>Welcome to PizzaHouse</h1>

        <p>
          Hot, fresh and delicious pizza delivered to your doorstep.
        </p>

        {token && user ? (
          <div className="welcome-buttons">
            <Link
              to={user.role === "admin" ? "/admin" : "/dashboard"}
            >
              Continue as {user.role === "admin" ? "Admin" : "Customer"}
            </Link>

            {user.role === "user" && (
              <>
                <Link to="/customize-pizza">
                  🍕 Customize Your Pizza
                </Link>

                <Link to="/cart">🛒 View Cart</Link>
                <Link to="/order-history">📦 My Orders</Link>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("pizzaToken");
                localStorage.removeItem("pizzaUser");

                window.dispatchEvent(new Event("pizzaAuthUpdated"));
                window.location.href = "/";
              }}
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="welcome-buttons">
            <Link to="/login">Customer Login</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/admin-login">Admin Login</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function CustomerRoute({ token, user, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user || user.role !== "user") {
    return (
      <Navigate
        to={user?.role === "admin" ? "/admin" : "/login"}
        replace
      />
    );
  }

  return children;
}

function AdminRoute({ token, user }) {
  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminDashboard />;
}

function AppRoutes() {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(readUser);

  useEffect(() => {
    function syncAuth() {
      setToken(readToken());
      setUser(readUser());
    }

    window.addEventListener("storage", syncAuth);
    window.addEventListener("pizzaAuthUpdated", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("pizzaAuthUpdated", syncAuth);
    };
  }, []);

  return (
    <Routes>
      {/* Welcome page */}
      <Route path="/" element={<WelcomePage />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/reset-password/:token"
        element={<ResetPassword />}
      />

      {/* Customer pages */}
      <Route
        path="/dashboard"
        element={
          <CustomerRoute token={token} user={user}>
            <Dashboard />
          </CustomerRoute>
        }
      />

      <Route
        path="/cart"
        element={
          <CustomerRoute token={token} user={user}>
            <Cart />
          </CustomerRoute>
        }
      />

      <Route
        path="/payment"
        element={
          <CustomerRoute token={token} user={user}>
            <Payment />
          </CustomerRoute>
        }
      />

      <Route
        path="/order-success"
        element={
          <CustomerRoute token={token} user={user}>
            <OrderSuccess />
          </CustomerRoute>
        }
      />

      <Route
        path="/track-order"
        element={
          <CustomerRoute token={token} user={user}>
            <TrackOrder />
          </CustomerRoute>
        }
      />

      <Route
        path="/order-history"
        element={
          <CustomerRoute token={token} user={user}>
            <OrderHistory />
          </CustomerRoute>
        }
      />

      {/* Custom pizza builder */}
      <Route
        path="/customize-pizza"
        element={
          <CustomerRoute token={token} user={user}>
            <CustomizePizza />
          </CustomerRoute>
        }
      />

      {/* Admin page */}
      <Route
        path="/admin"
        element={<AdminRoute token={token} user={user} />}
      />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
