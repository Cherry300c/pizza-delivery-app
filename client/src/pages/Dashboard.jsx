
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getPizzas } from "../services/pizzaService";
import PizzaCard from "../components/PizzaCard";
import ThemeToggle from "../components/ThemeToggle";

import "../App.css";

const categories = [
  { label: "All Pizzas", icon: "▦", value: "all" },
  { label: "Veg", icon: "🌿", value: "veg" },
  { label: "Non-Veg", icon: "🍗", value: "non-veg" },
  { label: "Cheese Lover", icon: "🧀", value: "cheese" },
  { label: "Classic", icon: "🍕", value: "classic" },
  { label: "Spicy", icon: "🌶️", value: "spicy" },
  { label: "Supreme", icon: "👑", value: "supreme" },
  { label: "Special", icon: "⭐", value: "special" },
];

const premiumNames = [
  "Cheese Overload",
  "Four Cheese",
  "Meat Lovers",
  "Ultimate Supreme",
  "Mexican Fiesta",
  "Italian Special",
  "Smoky BBQ",
  "Spicy Inferno",
  "Chef's Special",
  "Signature Pizza",
];

function readCart() {
  try {
    return JSON.parse(localStorage.getItem("pizzaCart") || "[]");
  } catch {
    return [];
  }
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("pizzaUser") || "null");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(readUser);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("pizzaToken"))
  );

  const [pizzas, setPizzas] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState(readCart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPizzas() {
      try {
        const data = await getPizzas();

        if (active) {
          setPizzas(data);
          setError("");
        }
      } catch {
        if (active) {
          setError(
            "Unable to load pizzas. Please check that your backend is running."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPizzas();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("pizzaCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const syncCart = () => setCart(readCart());

    window.addEventListener("pizzaCartUpdated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("pizzaCartUpdated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  // Keep the header synchronized with login/logout changes.
  useEffect(() => {
    function syncUser() {
      setIsLoggedIn(Boolean(localStorage.getItem("pizzaToken")));
      setUser(readUser());
    }

    window.addEventListener("storage", syncUser);
    window.addEventListener("pizzaAuthUpdated", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("pizzaAuthUpdated", syncUser);
    };
  }, []);

  const filteredPizzas = useMemo(() => {
    let result = pizzas.filter((pizza) => {
      const name = (pizza.name || "").toLowerCase();
      const description = (pizza.description || "").toLowerCase();
      const query = search.toLowerCase();

      const matchesSearch =
        name.includes(query) || description.includes(query);

      let matchesCategory = true;

      if (category === "veg") {
        matchesCategory = pizza.category === "veg";
      } else if (category === "non-veg") {
        matchesCategory = pizza.category === "non-veg";
      } else if (category === "cheese") {
        matchesCategory = /cheese|margherita/i.test(
          `${pizza.name} ${pizza.description || ""}`
        );
      } else if (category === "classic") {
        matchesCategory = /margherita|farmhouse|paneer tikka/i.test(name);
      } else if (category === "spicy") {
        matchesCategory = /spicy|inferno|jalapeño|mexican|chilli/i.test(
          `${pizza.name} ${pizza.description || ""}`
        );
      } else if (category === "supreme") {
        matchesCategory = /supreme|dominator/i.test(name);
      } else if (category === "special") {
        matchesCategory =
          premiumNames.some((item) => item.toLowerCase() === name) ||
          /special|signature/i.test(name);
      }

      return matchesSearch && matchesCategory;
    });

    if (sort === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "premium") {
      result.sort(
        (a, b) =>
          Number(
            premiumNames.some(
              (name) => name.toLowerCase() === b.name.toLowerCase()
            )
          ) -
          Number(
            premiumNames.some(
              (name) => name.toLowerCase() === a.name.toLowerCase()
            )
          )
      );
    }

    return result;
  }, [pizzas, search, category, sort]);

  function toggleFavorite(id) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function addToCart(pizza) {
    if (!localStorage.getItem("pizzaToken")) {
      navigate("/login");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item._id === pizza._id);

      if (existing) {
        return current.map((item) =>
          item._id === pizza._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...pizza, quantity: 1 }];
    });
  }

  function handleLogout() {
    localStorage.removeItem("pizzaToken");
    localStorage.removeItem("pizzaUser");

    setIsLoggedIn(false);
    setUser(null);
    setAccountMenuOpen(false);

    window.dispatchEvent(new Event("pizzaAuthUpdated"));

    navigate("/", { replace: true });
  }

  const cartCount = cart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  return (
    <main className="pizza-app">
      <header className="topbar">
        <Link to="/dashboard" className="brand">
          <span className="brand-icon">🍕</span>
          <span>
            <strong>
              Pizza<span>House</span>
            </strong>
            <small>HOT · FRESH · DELICIOUS</small>
          </span>
        </Link>

        <nav className="main-nav">
          <a href="#pizzas">Pizzas</a>
          <Link to="/cart">
            Cart <span className="cart-count">{cartCount}</span>
          </Link>
          <Link to="/track-order">Track Order</Link>
          <Link to="/order-history">Order History</Link>
        </nav>

        <div className="header-actions">
          <ThemeToggle />

          {isLoggedIn ? (
            <div className="account-area" style={{ position: "relative" }}>
              <button
                type="button"
                className="login-button"
                aria-label="Open account menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <span aria-hidden="true">👤</span>{" "}
                {user?.name || "My Account"} ▾
              </button>

              {accountMenuOpen && (
                <div
                  className="account-dropdown"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: "180px",
                    padding: "10px",
                    borderRadius: "12px",
                    background: "var(--surface, #fff)",
                    color: "var(--text, #222)",
                    border: "1px solid var(--border, #ddd)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    zIndex: 1000,
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <Link
                    to="/order-history"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    My Orders
                  </Link>

                  {user?.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <button type="button" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="login-button">
                Login
              </Link>
              <Link to="/register" className="signup-button">
                Sign Up
              </Link>
              <Link to="/admin-login" className="login-button">
                Admin
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">FRESHLY BAKED</span>

            <h1>
              Pizzas You’ll
              <br />
              <span>Crave Again!</span>
            </h1>

            <p>
              Delicious pizzas, fresh ingredients, delivered to your doorstep.
            </p>

            <label className="hero-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search for pizzas, toppings..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>

            <div className="hero-benefits">
              <div>
                <span>🛵</span>
                <p>
                  <strong>Fast Delivery</strong>
                  <small>30–45 mins</small>
                </p>
              </div>

              <div>
                <span>🌿</span>
                <p>
                  <strong>Fresh Ingredients</strong>
                  <small>Always fresh</small>
                </p>
              </div>

              <div>
                <span>🏅</span>
                <p>
                  <strong>Best Quality</strong>
                  <small>Premium taste</small>
                </p>
              </div>

              <div>
                <span>❤️</span>
                <p>
                  <strong>Loved by Many</strong>
                  <small>4.8+ Rating</small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="menu-section" id="pizzas">
        <div className="category-list">
          {categories.map((item) => (
            <button
              type="button"
              key={item.value}
              className={`category-chip ${
                category === item.value ? "selected" : ""
              }`}
              onClick={() => setCategory(item.value)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}

          <Link
            to="/customize-pizza"
            className="category-chip customize-pizza-chip"
          >
            <span>🍕</span> Customize Pizza
          </Link>
        </div>

        <div className="section-heading">
          <div>
            <h2>Our Pizzas</h2>
            <p>Handcrafted with love, using the freshest ingredients.</p>
          </div>

          <div className="sort-area">
            <label htmlFor="pizza-sort">Sort by</label>
            <select
              id="pizza-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="popular">Popular</option>
              <option value="premium">Premium first</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name</option>
            </select>

            <span>{filteredPizzas.length} pizzas</span>
          </div>
        </div>

        {loading ? (
          <div className="state-message">
            Preparing your pizza menu… 🍕
          </div>
        ) : error ? (
          <div className="state-message error">{error}</div>
        ) : filteredPizzas.length === 0 ? (
          <div className="state-message">
            No pizzas found. Try another search or category.
          </div>
        ) : (
          <div className="pizza-grid">
            {filteredPizzas.map((pizza) => (
              <PizzaCard
                key={pizza._id}
                pizza={pizza}
                isFavorite={favorites.includes(pizza._id)}
                onFavorite={() => toggleFavorite(pizza._id)}
                onAddToCart={() => addToCart(pizza)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">
          🍕 Pizza<span>House</span>
        </a>

        <p>Hot, fresh and made just for you.</p>

        <span>© {new Date().getFullYear()} PizzaHouse</span>
      </footer>
    </main>
  );
}
