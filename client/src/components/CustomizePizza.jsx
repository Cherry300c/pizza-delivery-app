
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomizePizza.css";

const options = {
  bases: [
    { name: "Classic Pan", price: 0 },
    { name: "Thin & Crispy", price: 20 },
    { name: "Whole Wheat", price: 30 },
    { name: "Cheese Stuffed", price: 60 },
    { name: "Gluten-Free", price: 50 },
  ],

  sauces: [
    { name: "Classic Tomato", price: 0 },
    { name: "Spicy Marinara", price: 10 },
    { name: "BBQ Sauce", price: 15 },
    { name: "Pesto", price: 25 },
    { name: "White Garlic Sauce", price: 20 },
  ],

  cheeses: [
    { name: "Mozzarella", price: 0 },
    { name: "Cheddar", price: 20 },
    { name: "Parmesan", price: 25 },
    { name: "Four Cheese Blend", price: 40 },
  ],

  sizes: [
    { name: "Small", price: 149 },
    { name: "Medium", price: 249 },
    { name: "Large", price: 349 },
    { name: "Extra Large", price: 449 },
  ],

  crusts: [
    { name: "Thin Crust", price: 0 },
    { name: "Classic Hand-Tossed", price: 0 },
    { name: "Thick Crust", price: 30 },
    { name: "Cheese Burst", price: 50 },
  ],

  vegetables: [
    { name: "Onion", price: 15 },
    { name: "Capsicum", price: 15 },
    { name: "Mushroom", price: 20 },
    { name: "Olives", price: 20 },
    { name: "Sweet Corn", price: 15 },
    { name: "Jalapenos", price: 15 },
    { name: "Tomato", price: 15 },
    { name: "Spinach", price: 20 },
  ],

  nonVeg: [
    { name: "Chicken", price: 40 },
    { name: "Pepperoni", price: 45 },
    { name: "Sausage", price: 35 },
    { name: "Bacon", price: 45 },
  ],
};

function CustomizePizza({ onAddToCart }) {
  const navigate = useNavigate();

  const [pizzaType, setPizzaType] = useState("Veg");
  const [base, setBase] = useState(options.bases[0].name);
  const [sauce, setSauce] = useState(options.sauces[0].name);
  const [cheese, setCheese] = useState(options.cheeses[0].name);
  const [size, setSize] = useState("Medium");
  const [crust, setCrust] = useState("Classic Hand-Tossed");
  const [toppings, setToppings] = useState([]);
  const [extraCheese, setExtraCheese] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  const selectedBase = options.bases.find((x) => x.name === base);
  const selectedSauce = options.sauces.find((x) => x.name === sauce);
  const selectedCheese = options.cheeses.find((x) => x.name === cheese);
  const selectedSize = options.sizes.find((x) => x.name === size);
  const selectedCrust = options.crusts.find((x) => x.name === crust);

  const availableToppings =
    pizzaType === "Veg"
      ? options.vegetables
      : [...options.vegetables, ...options.nonVeg];

  const toppingsPrice = availableToppings
    .filter((item) => toppings.includes(item.name))
    .reduce((sum, item) => sum + item.price, 0);

  const unitPrice =
    selectedSize.price +
    selectedBase.price +
    selectedSauce.price +
    selectedCheese.price +
    selectedCrust.price +
    toppingsPrice +
    (extraCheese ? 40 : 0);

  const totalPrice = unitPrice * quantity;

  function changePizzaType(type) {
    setPizzaType(type);

    // Remove meat toppings when switching to vegetarian.
    if (type === "Veg") {
      const vegetableNames = options.vegetables.map(
        (item) => item.name
      );

      setToppings((current) =>
        current.filter((item) => vegetableNames.includes(item))
      );
    }

    setMessage("");
  }

  function toggleTopping(name) {
    setToppings((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );

    setMessage("");
  }

  function addPizzaToCart() {
    setMessage("");

    const customPizza = {
      customId: `custom-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,

      isCustomized: true,
      name: `Custom ${pizzaType} Pizza`,
      pizzaType,
      base,
      sauce,
      cheese,
      size,
      crust,
      toppings: [...toppings],
      extraCheese,
      quantity,
      price: unitPrice,
      totalPrice,
    };

    try {
      if (typeof onAddToCart === "function") {
        // Use the parent cart handler when one is supplied.
        onAddToCart(customPizza);
      } else {
        // Otherwise, save directly to the shared localStorage cart.
        const existingCart = JSON.parse(
          localStorage.getItem("pizzaCart") || "[]"
        );

        if (!Array.isArray(existingCart)) {
          throw new Error("Invalid cart data.");
        }

        existingCart.push(customPizza);

        localStorage.setItem(
          "pizzaCart",
          JSON.stringify(existingCart)
        );

        window.dispatchEvent(new Event("pizzaCartUpdated"));
      }

      navigate("/cart");
    } catch (error) {
      console.error("Failed to add custom pizza:", error);
      setMessage(
        "Could not add your pizza to the cart. Please try again."
      );
    }
  }

  function renderSelect(label, value, setter, items) {
    return (
      <>
        <h2>{label}</h2>

        <select
          value={value}
          onChange={(event) => setter(event.target.value)}
        >
          {items.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
              {item.price ? ` (+₹${item.price})` : ""}
            </option>
          ))}
        </select>
      </>
    );
  }

  return (
    <main className="custom-pizza-page">
      <header className="custom-pizza-header">
        <h1>🍕 Customize Your Pizza</h1>
        <p>
          Choose your base, sauce, cheese, and favorite toppings.
        </p>
      </header>

      <div className="custom-pizza-layout">
        <section className="custom-pizza-form">
          <h2>1. Choose Pizza Type</h2>

          <div className="option-buttons">
            {["Veg", "Non-Veg"].map((type) => (
              <button
                key={type}
                type="button"
                className={pizzaType === type ? "selected" : ""}
                onClick={() => changePizzaType(type)}
              >
                {type === "Veg"
                  ? "🟢 Vegetarian"
                  : "🔴 Non-Vegetarian"}
              </button>
            ))}
          </div>

          {renderSelect(
            "2. Choose Pizza Base",
            base,
            setBase,
            options.bases
          )}

          {renderSelect(
            "3. Choose Sauce",
            sauce,
            setSauce,
            options.sauces
          )}

          {renderSelect(
            "4. Choose Cheese Type",
            cheese,
            setCheese,
            options.cheeses
          )}

          {renderSelect(
            "5. Choose Size",
            size,
            setSize,
            options.sizes
          )}

          {renderSelect(
            "6. Choose Crust",
            crust,
            setCrust,
            options.crusts
          )}

          <h2>7. Choose Vegetables / Toppings</h2>

          <div className="toppings-grid">
            {availableToppings.map((item) => (
              <label key={item.name} className="topping-card">
                <input
                  type="checkbox"
                  checked={toppings.includes(item.name)}
                  onChange={() => toggleTopping(item.name)}
                />

                <span>{item.name}</span>
                <strong>+₹{item.price}</strong>
              </label>
            ))}
          </div>

          <h2>8. Extra Cheese</h2>

          <label className="option-card">
            <input
              type="checkbox"
              checked={extraCheese}
              onChange={(event) =>
                setExtraCheese(event.target.checked)
              }
            />

            <span>Add extra cheese</span>
            <strong>+₹40</strong>
          </label>

          <h2>9. Quantity</h2>

          <div className="quantity-controls">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
            >
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              disabled={quantity >= 10}
              onClick={() => setQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>
        </section>

        <aside className="custom-pizza-summary">
          <div className="pizza-preview">🍕</div>

          <h2>Your Custom Pizza</h2>

          <p>Type: {pizzaType}</p>
          <p>Base: {base}</p>
          <p>Sauce: {sauce}</p>
          <p>Cheese: {cheese}</p>
          <p>Size: {size}</p>
          <p>Crust: {crust}</p>

          <p>
            Toppings:{" "}
            {toppings.length ? toppings.join(", ") : "None"}
          </p>

          <p>Extra cheese: {extraCheese ? "Yes" : "No"}</p>
          <p>Quantity: {quantity}</p>

          <hr />

          <p>Price per pizza: ₹{unitPrice}</p>
          <h2>Total: ₹{totalPrice}</h2>

          {message && (
            <p className="payment-message" role="alert">
              {message}
            </p>
          )}

          <button
            type="button"
            className="add-custom-pizza"
            onClick={addPizzaToCart}
          >
            Add to Cart · ₹{totalPrice}
          </button>
        </aside>
      </div>
    </main>
  );
}

export default CustomizePizza;
