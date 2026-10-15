
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const CART_KEY = "pizzaCart";

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getCartItemId(item) {
  return item.isCustomized
    ? item.customId
    : item._id || item.id;
}

function getQuantity(item) {
  const quantity = Number(item.quantity);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

function getPrice(item) {
  const price = Number(item.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(readCart);

  // IMPORTANT: persist changes without dispatching another cart event.
  // This prevents the setState -> event -> setState infinite loop.
  const updateCart = useCallback((nextCart) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
      setCart(nextCart);
      window.dispatchEvent(new Event("pizzaCartUpdated"));
    } catch (error) {
      console.error("Unable to update cart:", error);
      alert("Could not update your cart. Please try again.");
    }
  }, []);

  // Listen to changes made by other components or browser tabs.
  useEffect(() => {
    function syncCart() {
      setCart(readCart());
    }

    window.addEventListener("pizzaCartUpdated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("pizzaCartUpdated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const changeQuantity = (id, amount) => {
    const nextCart = cart
      .map((item) => {
        if (getCartItemId(item) !== id) return item;

        return {
          ...item,
          quantity: getQuantity(item) + amount,
        };
      })
      .filter((item) => Number(item.quantity) > 0);

    updateCart(nextCart);
  };

  const removeItem = (id) => {
    updateCart(
      cart.filter((item) => getCartItemId(item) !== id)
    );
  };

  const clearCart = () => {
    updateCart([]);
  };

  const totalItems = cart.reduce(
    (sum, item) => sum + getQuantity(item),
    0
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + getPrice(item) * getQuantity(item),
    0
  );

  const deliveryFee = cart.length > 0 ? 40 : 0;
  const totalPrice = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Your cart is empty. Add some pizzas first!");
      return;
    }

    navigate("/payment");
  };

  return (
    <main className="cart-page">
      <div className="cart-container">
        <header className="cart-header">
          <div>
            <h1>Your Cart</h1>
            <p>
              {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
            </p>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              className="clear-cart-btn"
              onClick={clearCart}
            >
              Clear Cart
            </button>
          )}
        </header>

        {cart.length === 0 ? (
          <section className="empty-cart">
            <div className="empty-cart-icon">🍕</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any delicious pizzas yet.</p>

            <button
              type="button"
              className="continue-shopping-btn"
              onClick={() => navigate("/dashboard")}
            >
              Browse Pizzas
            </button>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-items">
              {cart.map((item, index) => {
                const itemId = getCartItemId(item);
                const quantity = getQuantity(item);
                const price = getPrice(item);

                return (
                  <article
                    className="cart-item"
                    key={itemId || `cart-${index}`}
                  >
                    <div className="cart-item-image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name || "Pizza"}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span>🍕</span>
                      )}
                    </div>

                    <div className="cart-item-info">
                      <h3>{item.name || "Pizza"}</h3>

                      {item.isCustomized && (
                        <div className="custom-cart-details">
                          <p>Type: {item.pizzaType}</p>
                          <p>Base: {item.base}</p>
                          <p>Sauce: {item.sauce}</p>
                          <p>Cheese: {item.cheese}</p>
                          <p>Size: {item.size}</p>
                          <p>Crust: {item.crust}</p>
                          <p>
                            Toppings: {item.toppings?.length
                              ? item.toppings.join(", ")
                              : "None"}
                          </p>
                          <p>
                            Extra cheese: {item.extraCheese ? "Yes" : "No"}
                          </p>
                        </div>
                      )}

                      <p className="cart-item-price">
                        ₹{price.toFixed(2)} each
                      </p>

                      <div className="cart-item-actions">
                        <div className="quantity-control">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => changeQuantity(itemId, -1)}
                          >
                            −
                          </button>

                          <span>{quantity}</span>

                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => changeQuantity(itemId, 1)}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() => removeItem(itemId)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-total">
                      ₹{(price * quantity).toFixed(2)}
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="cart-summary">
              <h2>Order Summary</h2>

              <div className="summary-row">
                <span>Items ({totalItems})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>

              <div className="summary-divider" />

              <div className="summary-row summary-total">
                <span>Total</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="checkout-btn"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </button>

              <button
                type="button"
                className="continue-shopping-link"
                onClick={() => navigate("/dashboard")}
              >
                Continue Shopping
              </button>

              <p className="cart-payment-note">
                Final payment and order confirmation happen at checkout.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
