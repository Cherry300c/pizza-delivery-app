const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "") + "/pizzas";

// Get all available pizzas
export const getPizzas = async () => {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Failed to fetch pizzas");
    }

    const data = await response.json();

    return data.pizzas;
  } catch (error) {
    console.error("Pizza API error:", error);
    throw error;
  }
};