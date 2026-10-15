export default function PizzaCard({
  pizza,
  isFavorite,
  onFavorite,
  onAddToCart,
}) {
  const isVeg = pizza.category === "veg";

  return (
    <article className="pizza-card">
      <div className="pizza-image-wrap">
        <img
          className="pizza-image"
          src={pizza.image}
          alt={pizza.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />

        <button
          className={`favorite-button ${isFavorite ? "favorited" : ""}`}
          onClick={onFavorite}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove favorite" : "Add favorite"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>

        <span className={`food-indicator ${isVeg ? "veg" : "non-veg"}`}>
          <span />
        </span>
      </div>

      <div className="pizza-info">
        <div className="pizza-name-row">
          <h3>{pizza.name}</h3>
          {[
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
          ].includes(pizza.name) && (
            <span className="premium-label">SPECIAL</span>
          )}
        </div>

        <p className="pizza-description">{pizza.description}</p>

        <div className="pizza-bottom">
          <strong className="pizza-price">₹{pizza.price}</strong>
          <button className="add-cart-button" onClick={onAddToCart}>
            <span aria-hidden="true">🛒</span>
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}