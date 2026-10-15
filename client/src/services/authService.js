const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const API_URL = `${API_BASE_URL}/auth`;

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to PizzaHouse server. Start the backend in the server folder (npm run dev) and check that it is running on port 5000."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

export async function registerUser({ name, email, password }) {
  return request("/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function resendVerificationEmail(email) {
  return request("/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function loginUser({ email, password }) {
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!data.token || !data.user) {
    throw new Error("The server returned an incomplete login response.");
  }

  localStorage.setItem("pizzaToken", data.token);
  localStorage.setItem("pizzaUser", JSON.stringify(data.user));
  window.dispatchEvent(new Event("pizzaAuthUpdated"));

  return data;
}

export async function getCurrentUser() {
  const token = localStorage.getItem("pizzaToken");
  if (!token) return null;

  try {
    const data = await request("/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.user;
  } catch {
    localStorage.removeItem("pizzaToken");
    localStorage.removeItem("pizzaUser");
    window.dispatchEvent(new Event("pizzaAuthUpdated"));
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem("pizzaToken");
  localStorage.removeItem("pizzaUser");
  window.dispatchEvent(new Event("pizzaAuthUpdated"));
}

export async function forgotPassword(email) {
  return request("/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token, password) {
  return request(`/reset-password/${encodeURIComponent(token)}`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}
