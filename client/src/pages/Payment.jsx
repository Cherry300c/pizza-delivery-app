
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const DELIVERY_FEE = 40;
const MAX_QUANTITY = 20;

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem("pizzaCart") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getQuantity(item) {
  const quantity = Number(item.quantity ?? 1);
  return Number.isInteger(quantity) && quantity >= 1
    ? quantity
    : 0;
}

function getPrice(item) {
  const price = Number(item.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

function getCartItemKey(item, index) {
  if (item.isCustomized) {
    return item.customId || `custom-${index}`;
  }

  return item._id || item.id || `pizza-${index}`;
}

function validateCartItem(item) {
  const quantity = getQuantity(item);

  if (quantity < 1 || quantity > MAX_QUANTITY) {
    return "Each pizza quantity must be between 1 and 20.";
  }

  if (item.isCustomized) {
    const requiredFields = [
      "pizzaType",
      "base",
      "sauce",
      "cheese",
      "size",
      "crust",
    ];

    for (const field of requiredFields) {
      if (
        typeof item[field] !== "string" ||
        !item[field].trim()
      ) {
        return `Your custom pizza is missing ${field}. Please edit or add it again.`;
      }
    }

    if (
      !Array.isArray(item.toppings) ||
      typeof item.extraCheese !== "boolean"
    ) {
      return "Your custom pizza configuration is invalid.";
    }

    return null;
  }

  const pizzaId = String(item._id || item.id || "");

  if (!/^[a-f\d]{24}$/i.test(pizzaId)) {
    return "A regular pizza has an invalid database ID. Remove it and add it again.";
  }

  return null;
}

function buildCheckoutItems(cart) {
  return cart.map((item) => {
    const quantity = getQuantity(item);

    if (item.isCustomized) {
      return {
        isCustomized: true,
        customPizza: {
          pizzaType: item.pizzaType,
          base: item.base,
          sauce: item.sauce,
          cheese: item.cheese,
          size: item.size,
          crust: item.crust,
          toppings: item.toppings,
          extraCheese: item.extraCheese,
        },
        quantity,
      };
    }

    return {
      pizzaId: item._id || item.id,
      quantity,
    };
  });
}

export default function Payment() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(readCart);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function updateCart() {
      setCart(readCart());
    }

    window.addEventListener("pizzaCartUpdated", updateCart);
    window.addEventListener("storage", updateCart);

    return () => {
      window.removeEventListener("pizzaCartUpdated", updateCart);
      window.removeEventListener("storage", updateCart);
    };
  }, []);

  // These totals are estimates for display only.
  // The backend calculates the authoritative order amount.
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + getPrice(item) * getQuantity(item),
        0
      ),
    [cart]
  );

  const deliveryFee = cart.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (cart.length === 0) {
      setMessage("Your cart is empty. Add pizzas before proceeding.");
    } else {
      setMessage("");
    }
  }, [cart]);

  async function handlePayment(event) {
    event.preventDefault();
    setMessage("");

    if (loading) return;

    const token = localStorage.getItem("pizzaToken");

    if (!token) {
      setMessage("Please log in before placing your order.");
      navigate("/login");
      return;
    }

    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanCity = city.trim();
    const cleanPincode = pincode.trim();

    if (
      cleanName.length < 2 ||
      !/^[6-9]\d{9}$/.test(cleanPhone) ||
      cleanAddress.length < 5 ||
      cleanCity.length < 2 ||
      !/^\d{6}$/.test(cleanPincode)
    ) {
      setMessage(
        "Enter a valid name, 10-digit Indian mobile number, address, city and 6-digit PIN code."
      );
      return;
    }

    for (const item of cart) {
      const validationError = validateCartItem(item);

      if (validationError) {
        setMessage(validationError);
        return;
      }
    }

    if (!window.Razorpay) {
      setMessage(
        "Razorpay Checkout is not loaded. Check your internet connection and refresh."
      );
      return;
    }

    setLoading(true);

    try {
      const items = buildCheckoutItems(cart);

      const orderResponse = await fetch(
        `${API_URL}/payment/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items,
            customer: {
              name: cleanName,
              phone: cleanPhone,
              address: cleanAddress,
              city: cleanCity,
              pincode: cleanPincode,
            },
          }),
        }
      );

      const orderData = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok || !orderData.order) {
        if (orderResponse.status === 401) {
          localStorage.removeItem("pizzaToken");
          localStorage.removeItem("pizzaUser");
          navigate("/login");
        }

        throw new Error(
          orderData.message || "Could not create the payment order."
        );
      }

      if (!orderData.keyId || !orderData.order.id) {
        throw new Error(
          "Razorpay credentials or payment order ID are missing."
        );
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency || "INR",
        name: "PizzaHouse",
        description: "Pizza delivery order",
        order_id: orderData.order.id,

        prefill: {
          name: cleanName,
          contact: cleanPhone,
        },

        notes: {
          deliveryAddress: `${cleanAddress}, ${cleanCity} - ${cleanPincode}`,
        },

        theme: {
          color: "#f4511e",
        },

        handler: async function (response) {
          try {
            const verifyResponse = await fetch(
              `${API_URL}/payment/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse
              .json()
              .catch(() => ({}));

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(
                verifyData.message ||
                  "Payment verification failed. Check your order status before retrying."
              );
            }

            // Clear the cart only after backend verification succeeds.
            localStorage.removeItem("pizzaCart");
            window.dispatchEvent(new Event("pizzaCartUpdated"));
            setCart([]);

            navigate("/order-success", {
              state: {
                orderId: verifyData.orderId || orderData.appOrderId,
              },
            });
          } catch (error) {
            console.error("Payment verification error:", error);

            setMessage(
              error.message ||
                "Unable to verify payment. Check your order status before retrying."
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", function () {
        setMessage("Payment failed. Please try again.");
        setLoading(false);
      });

      checkout.open();
    } catch (error) {
      console.error("Payment initialization error:", error);

      setMessage(
        error.message || "Unable to start payment. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <main className="payment-page">
      <div className="payment-container">
        <Link to="/cart" className="payment-back">
          ← Back to Cart
        </Link>

        <h1>Checkout</h1>

        <p className="payment-subtitle">
          Enter your delivery details and complete your payment.
        </p>

        <div className="payment-layout">
          <form className="payment-card" onSubmit={handlePayment}>
            <h2>Delivery Details</h2>

            <label htmlFor="customer-name">Full name</label>
            <input
              id="customer-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              minLength={2}
              required
            />

            <label htmlFor="customer-phone">Phone number</label>
            <input
              id="customer-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              placeholder="Enter your 10-digit phone number"
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number"
              required
            />

            <label htmlFor="delivery-address">Street address</label>
            <textarea
              id="delivery-address"
              autoComplete="street-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="House number, street, area"
              rows={3}
              minLength={5}
              required
            />

            <div className="payment-fields-row">
              <div>
                <label htmlFor="delivery-city">City</label>
                <input
                  id="delivery-city"
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City"
                  minLength={2}
                  required
                />
              </div>

              <div>
                <label htmlFor="delivery-pincode">PIN code</label>
                <input
                  id="delivery-pincode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={pincode}
                  onChange={(event) =>
                    setPincode(
                      event.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="6-digit PIN"
                  pattern="[0-9]{6}"
                  title="Enter a 6-digit PIN code"
                  required
                />
              </div>
            </div>

            <h2 className="payment-method-heading">
              Payment Method
            </h2>

            <div className="razorpay-method">
              <span>💳</span>

              <div>
                <strong>Razorpay Checkout</strong>
                <small>UPI, cards and other supported methods</small>
              </div>

              <span className="payment-secure">Secure</span>
            </div>

            {message && (
              <p className="payment-message" role="alert">
                {message}
              </p>
            )}

            <button
              className="payment-submit"
              type="submit"
              disabled={loading || cart.length === 0}
            >
              {loading ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
            </button>

            <p className="payment-disclaimer">
              Razorpay Test Mode is for testing only. Use test payment
              details, not your real debit card.
            </p>
          </form>

          <aside className="payment-card payment-summary">
            <h2>Your Order</h2>

            {cart.map((item, index) => (
              <div
                className="payment-item"
                key={getCartItemKey(item, index)}
              >
                <div>
                  <span>
                    {item.name || "Pizza"} × {getQuantity(item)}
                  </span>

                  {item.isCustomized && (
                    <div className="custom-cart-details">
                      <p>Type: {item.pizzaType}</p>
                      <p>Base: {item.base}</p>
                      <p>Sauce: {item.sauce}</p>
                      <p>Cheese: {item.cheese}</p>
                      <p>Size: {item.size}</p>
                      <p>Crust: {item.crust}</p>
                      <p>
                        Toppings:{" "}
                        {item.toppings?.length
                          ? item.toppings.join(", ")
                          : "None"}
                      </p>
                      <p>
                        Extra cheese: {item.extraCheese ? "Yes" : "No"}
                      </p>
                    </div>
                  )}
                </div>

                <strong>
                  ₹
                  {(
                    getPrice(item) * getQuantity(item)
                  ).toFixed(2)}
                </strong>
              </div>
            ))}

            <div className="payment-total-row">
              <span>Subtotal (estimated)</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="payment-total-row">
              <span>Delivery fee</span>
              <span>₹{deliveryFee.toFixed(2)}</span>
            </div>

            <div className="payment-grand-total">
              <span>Estimated total</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>

            <p className="payment-disclaimer">
              The final payable amount is calculated and validated by
              the server when your order is created.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
