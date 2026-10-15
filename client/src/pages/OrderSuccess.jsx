import { Link, useLocation } from "react-router-dom";
import "../App.css";

export default function OrderSuccess() {
  const { state } = useLocation();

  return (
    <main className="payment-page">
      <section className="payment-card order-success-card">
        <div className="success-icon">✓</div>
        <h1>Payment Successful!</h1>
        <p>Your payment has been verified.</p>

        {state?.orderId && (
          <p>
            Order ID: <strong>{state.orderId}</strong>
          </p>
        )}

        <Link to="/order-history" className="payment-submit success-link">
          View My Orders
        </Link>
        <Link to="/" className="payment-back">
          Continue Shopping
        </Link>
      </section>
    </main>
  );
}