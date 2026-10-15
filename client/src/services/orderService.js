const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "") + "/orders";

function getAuthHeaders() {
  const token = localStorage.getItem("pizzaToken");

  if (!token) {
    throw new Error("Please log in to view your orders.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function request(path = "") {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Unable to load orders.");
  }

  return data;
}

export async function getMyOrders() {
  const data = await request("/my-orders");
  return data.orders || [];
}

export async function getMyOrderById(orderId) {
  if (!orderId) {
    throw new Error("Order ID is required.");
  }

  const data = await request(`/${encodeURIComponent(orderId)}`);
  return data.order;
}