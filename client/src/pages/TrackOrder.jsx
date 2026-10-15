import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMyOrderById, getMyOrders } from "../services/orderService";

const steps = [
  { key: "confirmed", label: "Order Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing Your Pizza", icon: "🍕" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "🛵" },
  { key: "delivered", label: "Delivered", icon: "🏠" },
];

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get("orderId") || "";

  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(requestedId);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the customer's orders when the page opens.
  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const data = await getMyOrders();

        if (!active) return;

        setOrders(data);

        const id =
          requestedId && data.some((item) => item._id === requestedId)
            ? requestedId
            : data[0]?._id || "";

        setSelectedId(id);

        if (id) {
          const selectedOrder = await getMyOrderById(id);

          if (active) {
            setOrder(selectedOrder);
          }
        } else {
          setOrder(null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load order.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [requestedId]);

  // Automatically refresh the selected order every 5 seconds.
  useEffect(() => {
    if (!selectedId) return;

    let active = true;

    async function refreshOrder() {
      try {
        const latestOrder = await getMyOrderById(selectedId);

        if (active) {
          setOrder(latestOrder);
          setError("");
        }
      } catch (err) {
        // Keep the existing order visible if a temporary refresh fails.
        console.error("Order status refresh failed:", err.message);
      }
    }

    const intervalId = setInterval(refreshOrder, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [selectedId]);

  // Load another order when the customer selects it.
  async function handleSelect(event) {
    const id = event.target.value;

    setSelectedId(id);
    setOrder(null);
    setError("");

    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const selectedOrder = await getMyOrderById(id);
      setOrder(selectedOrder);
    } catch (err) {
      setError(err.message || "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }

  const status = order?.orderStatus || "";
  const currentStep = steps.findIndex((step) => step.key === status);

  return (
    <main className="shop-page">
      <section className="shop-content">
        <Link to="/" className="back-link">
          ← Back to Pizzas
        </Link>

        <h1>Track Your Order</h1>

        <p className="shop-subtitle">
          Follow your pizza from confirmation to delivery.
        </p>

        <p className="shop-subtitle">
          <span aria-hidden="true">🔄 </span>
          Order status refreshes automatically every 5 seconds.
        </p>

        {orders.length > 1 && (
          <label>
            Select an order
            <select value={selectedId} onChange={handleSelect}>
              <option value="">Choose an order</option>

              {orders.map((item) => (
                <option key={item._id} value={item._id}>
                  #{item._id.slice(-6).toUpperCase()} —{" "}
                  {item.orderStatus?.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        )}

        {loading && <p>Loading order details...</p>}

        {error && <p role="alert">{error}</p>}

        {!loading && !error && !order && (
          <div className="empty-cart">
            <h2>No order selected</h2>
            <p>
              Place an order or open tracking from your order history.
            </p>
            <Link to="/order-history">View My Orders</Link>
          </div>
        )}

        {!loading && !error && order && (
          <div className="empty-cart">
            <h2>Order #{order._id.slice(-6).toUpperCase()}</h2>

            <p>
              Payment status: <strong>{order.paymentStatus}</strong>
            </p>

            <p>
              Current status:{" "}
              <strong>
                {order.orderStatus?.replaceAll("_", " ")}
              </strong>
            </p>

            {status === "cancelled" ? (
              <p>This order has been cancelled.</p>
            ) : status === "pending_payment" ? (
              <p>
                Payment is still pending. Please check your payment status.
              </p>
            ) : (
              <ol className="tracking-steps">
                {steps.map((step, index) => {
                  const completed =
                    currentStep >= index && currentStep >= 0;

                  return (
                    <li
                      key={step.key}
                      aria-current={
                        currentStep === index ? "step" : undefined
                      }
                    >
                      <span>{completed ? "✅" : step.icon}</span>{" "}
                      <strong>{step.label}</strong>
                      <span>
                        {completed ? " — Completed" : " — Pending"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <h3>Items</h3>

            <ul>
              {order.items?.map((item, index) => (
                <li key={item._id || index}>
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>

            <Link to="/order-history" className="back-link">
              View all orders →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}