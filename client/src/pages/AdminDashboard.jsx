import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";
import "../App.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "") + "/admin";
const STATUSES = [
  ["pending_payment", "Pending Payment"], ["confirmed", "Order Confirmed"],
  ["preparing", "Preparing Your Pizza"], ["out_for_delivery", "Out for Delivery"],
  ["delivered", "Delivered"], ["cancelled", "Cancelled"],
];
const emptyPizza = { name: "", description: "", price: "", image: "/images/pizza/Margherita.jpg", category: "veg", available: true };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pizzas, setPizzas] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pizzaForm, setPizzaForm] = useState(emptyPizza);
  const [editingPizza, setEditingPizza] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem("pizzaToken");
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      logoutUser();
      navigate("/admin-login", { replace: true });
      throw new Error(data.message || "Admin access required. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status}).`);
    return data;
  }, [navigate]);

  const loadDashboard = useCallback(async (includeAll = true) => {
    setLoading(true); setError("");
    try {
      const [statsData, ordersData] = await Promise.all([
        request("/stats"), request("/orders?limit=100"),
      ]);
      setStats(statsData.stats); setOrders(ordersData.orders || []);
      if (includeAll) {
        const [pizzaData, customerData] = await Promise.all([request("/pizzas"), request("/customers")]);
        setPizzas(pizzaData.pizzas || []); setCustomers(customerData.customers || []);
      }
    } catch (err) { setError(err.message || "Unable to load admin dashboard."); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  async function updateStatus(orderId, orderStatus) {
    setError(""); setNotice("");
    try {
      const data = await request(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ orderStatus }) });
      setNotice(data.message || "Order status updated.");
      await loadDashboard(false);
    } catch (err) { setError(err.message); await loadDashboard(false); }
  }

  function editPizza(pizza) {
    setEditingPizza(pizza._id);
    setPizzaForm({ name: pizza.name || "", description: pizza.description || "", price: String(pizza.price ?? ""), image: pizza.image || "", category: pizza.category || "veg", available: pizza.available !== false });
    setTab("pizzas");
  }

  async function savePizza(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const path = editingPizza ? `/pizzas/${editingPizza}` : "/pizzas";
      const data = await request(path, { method: editingPizza ? "PATCH" : "POST", body: JSON.stringify({ ...pizzaForm, price: Number(pizzaForm.price) }) });
      setNotice(data.message || "Pizza saved."); setPizzaForm(emptyPizza); setEditingPizza(null);
      const refreshed = await request("/pizzas"); setPizzas(refreshed.pizzas || []);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function deletePizza(pizza) {
    if (!window.confirm(`Delete ${pizza.name}? Existing order snapshots will remain, but this pizza will be removed from the menu.`)) return;
    setError(""); setNotice("");
    try {
      const data = await request(`/pizzas/${pizza._id}`, { method: "DELETE" });
      setPizzas(previous => previous.filter(item => item._id !== pizza._id)); setNotice(data.message || "Pizza deleted.");
    } catch (err) { setError(err.message); }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
  }

  if (loading) return <main className="admin-page"><p>Loading admin dashboard...</p></main>;

  return <main className="admin-page">
    <header className="admin-header">
      <div><span className="admin-eyebrow">PIZZAHOUSE MANAGEMENT</span><h1>Admin Dashboard 🍕</h1><p>Manage orders, menu products and customer records.</p></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link to="/" className="login-button">View Website ↗</Link>
        <button type="button" className="admin-refresh" onClick={() => { logoutUser(); navigate("/admin-login", { replace: true }); }}>Log out</button>
      </div>
    </header>
    {error && <div className="admin-error" role="alert">{error}</div>}
    {notice && <div className="admin-notice" role="status">{notice}</div>}
    {stats && <section className="admin-stats">
      <article className="admin-stat-card"><span>Total Orders</span><strong>{stats.totalOrders}</strong></article>
      <article className="admin-stat-card"><span>Paid Orders</span><strong>{stats.paidOrders}</strong></article>
      <article className="admin-stat-card"><span>Pending Payment</span><strong>{stats.pendingOrders}</strong></article>
      <article className="admin-stat-card"><span>Paid Revenue</span><strong>{formatMoney(stats.revenue)}</strong></article>
    </section>}

    <nav className="admin-tabs" aria-label="Admin sections">
      {[["orders", "Orders & Tracking"], ["pizzas", "Manage Pizzas"], ["customers", "Customers"]].map(([key, label]) => <button key={key} type="button" className={tab === key ? "admin-tab active" : "admin-tab"} onClick={() => setTab(key)}>{label}</button>)}
      <button type="button" className="admin-refresh" onClick={() => loadDashboard()}>Refresh data</button>
    </nav>

    {tab === "orders" && <>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Order Tracking Control</h2><p>Change a paid order's status; the customer tracker refreshes within five seconds.</p></div></div>
        {orders.length === 0 ? <p className="admin-empty">No orders found.</p> : <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Current status</th><th>Change status</th></tr></thead><tbody>{orders.map(order => <tr key={order._id}>
          <td>#{order._id.slice(-6).toUpperCase()}<small>{new Date(order.createdAt).toLocaleString()}</small></td>
          <td><strong>{order.customer?.name || "Customer"}</strong><small>{order.customer?.phone || ""}</small><small>{order.customer?.email || ""}</small></td>
          <td>{formatMoney(order.totalAmount)}</td><td>{order.paymentStatus}</td><td>{STATUSES.find(([key]) => key === order.orderStatus)?.[1] || order.orderStatus}</td>
          <td><select value={order.orderStatus} onChange={e => updateStatus(order._id, e.target.value)} disabled={order.paymentStatus !== "paid" || order.orderStatus === "cancelled"} aria-label={`Update status for order ${order._id}`}>{STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{order.paymentStatus !== "paid" && <small>Payment must be confirmed first.</small>}</td>
        </tr>)}</tbody></table></div>}
      </section>
      <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Sales Report</h2><p>Revenue from paid orders only.</p></div></div>{stats?.dailySales?.length ? <div className="admin-sales-list">{stats.dailySales.map(day => <div className="admin-sales-row" key={day._id}><span>{day._id}</span><span>{day.orders} paid orders</span><strong>{formatMoney(day.revenue)}</strong></div>)}</div> : <p className="admin-empty">No paid sales to report yet.</p>}</section>
    </>}

    {tab === "pizzas" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Pizza Menu Management</h2><p>Add, edit, remove or temporarily disable menu items.</p></div></div>
      <form className="admin-pizza-form" onSubmit={savePizza}>
        <h3>{editingPizza ? "Edit pizza" : "Add a pizza"}</h3>
        <label>Pizza name<input value={pizzaForm.name} onChange={e => setPizzaForm({ ...pizzaForm, name: e.target.value })} required maxLength={100} /></label>
        <label>Description<textarea value={pizzaForm.description} onChange={e => setPizzaForm({ ...pizzaForm, description: e.target.value })} required rows={2} /></label>
        <label>Price (₹)<input type="number" min="0" step="0.01" value={pizzaForm.price} onChange={e => setPizzaForm({ ...pizzaForm, price: e.target.value })} required /></label>
        <label>Image path or URL<input value={pizzaForm.image} onChange={e => setPizzaForm({ ...pizzaForm, image: e.target.value })} required placeholder="/images/pizza/Margherita.jpg" /></label>
        <label>Category<select value={pizzaForm.category} onChange={e => setPizzaForm({ ...pizzaForm, category: e.target.value })}><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option></select></label>
        <label className="admin-checkbox"><input type="checkbox" checked={pizzaForm.available} onChange={e => setPizzaForm({ ...pizzaForm, available: e.target.checked })} /> Available for customers</label>
        <div className="admin-form-actions"><button className="admin-refresh" disabled={saving}>{saving ? "Saving..." : editingPizza ? "Save changes" : "Add pizza"}</button>{editingPizza && <button type="button" className="admin-refresh" onClick={() => { setEditingPizza(null); setPizzaForm(emptyPizza); }}>Cancel edit</button>}</div>
      </form>
      <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Pizza</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{pizzas.map(pizza => <tr key={pizza._id}><td><strong>{pizza.name}</strong><small>{pizza.description}</small></td><td>{pizza.category}</td><td>{formatMoney(pizza.price)}</td><td>{pizza.available ? "Available" : "Hidden"}</td><td><div className="admin-form-actions"><button type="button" className="admin-refresh" onClick={() => editPizza(pizza)}>Edit</button><button type="button" className="admin-refresh" onClick={() => deletePizza(pizza)}>Delete</button></div></td></tr>)}</tbody></table></div>
    </section>}

    {tab === "customers" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Registered Customers</h2><p>Read-only customer records; passwords are never returned by this API.</p></div></div>{customers.length === 0 ? <p className="admin-empty">No customers found.</p> : <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Email verified</th><th>Registered</th></tr></thead><tbody>{customers.map(customer => <tr key={customer._id}><td>{customer.name}</td><td>{customer.email}</td><td>{customer.isVerified ? "Verified" : "Not verified"}</td><td>{new Date(customer.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</section>}
  </main>;
}
