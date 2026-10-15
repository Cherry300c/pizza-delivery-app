const API_URL = "http://localhost:5000/api/auth";

export async function registerUser({ name, email, password }) {
  return request("/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginUser({ email, password }) {
  const data = await request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("pizzaToken", data.token);
  localStorage.setItem("pizzaUser", JSON.stringify(data.user));

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
    return null;
  }
}

export async function logoutUser() {
  localStorage.removeItem("pizzaToken");
  localStorage.removeItem("pizzaUser");
}

export async function resendVerificationEmail(email) {
  return request("/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
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

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}