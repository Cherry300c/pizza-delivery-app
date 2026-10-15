import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOrders } from "../services/orderService";

export default function OrderHistory() {
const [orders, setOrders] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
let active = true;

getMyOrders()
  .then((data) => {
    if (active) setOrders(data);
  })
  .catch((err) => {
    if (active) setError(err.message || "Unable to load orders.");
  })
  .finally(() => {
    if (active) setLoading(false);
  });

return () => {
  active = false;
};

}, []);

const formatDate = (date) =>
date ? new Date(date).toLocaleString() : "Date unavailable";

const formatMoney = (amount) =>
new Intl.NumberFormat("en-IN", {
style: "currency",
currency: "INR",
}).format(amount || 0);

return (
<main className="shop-page">
<section className="shop-content">
<Link to="/" className="back-link">← Back to Pizzas</Link>

    <h1>My Orders</h1>
    <p className="shop-subtitle">
      View your previous orders and check their status.
    </p>

    {loading && <p>Loading your orders...</p>}

    {error && (
      <div className="empty-cart">
        <h2>Could not load orders</h2>
        <p>{error}</p>
        <Link to="/login">Log in again</Link>
      </div>
    )}

    {!loading && !error && orders.length === 0 && (
      <div className="empty-cart">
        <div>🍕</div>
        <h2>No orders yet</h2>
        <p>Your completed orders will appear here.</p>
        <Link to="/">Browse Pizzas</Link>
      </div>
    )}

    {!loading && !error && orders.length > 0 && (
      <div className="order-list">
        {orders.map((order) => (
          <article className="empty-cart" key={order._id}>
            <h2>Order #{order._id.slice(-6).toUpperCase()}</h2>
            <p>Placed: {formatDate(order.createdAt)}</p>
            <p>
              Payment: <strong>{order.paymentStatus}</strong>
            </p>
            <p>
              Order status: <strong>{order.orderStatus?.replaceAll("_", " ")}</strong>
            </p>
            <p>Total: <strong>{formatMoney(order.totalAmount)}</strong></p>

            <ul>
              {order.items?.map((item, index) => (
                <li key={item._id || index}>
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>

            <Link
              to={`/track-order?orderId=${encodeURIComponent(order._id)}`}
              className="back-link"
            >
              Track this order →
            </Link>
          </article>
        ))}
      </div>
    )}
  </section>
</main>

);
}