const API = import.meta.env.PROD ? "http://localhost:8090" : "/api";

// ─── Silent Refresh Interceptor ──────────────────────────────────────────────
// Wraps every protected fetch. On a 401:
//   1. Calls POST /auth/refresh to rotate tokens (sets new cookies server-side)
//   2. Retries the original request once
//   3. If refresh also fails → throws "Not authenticated" → App shows login screen

async function fetchWithRefresh(url, options = {}) {
    const res = await fetch(url, { credentials: "include", ...options });

    if (res.status !== 401) return res;

    // Try a silent token refresh
    const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });

    if (!refreshRes.ok) {
        const body = await refreshRes.json().catch(() => ({}));
        if (body.detail === "token_expired") {
            window.dispatchEvent(new CustomEvent("session-expired"));
            throw new Error("session_expired");
        }
        throw new Error("Not authenticated");
    }

    // Retry original request with the fresh cookies now set
    return fetch(url, { credentials: "include", ...options });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(email, password) {
    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Invalid credentials");
    }
    return res.json();
}

export async function apiRegister(email, password) {
    const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Registration failed");
    }
    return res.json();
}

export async function apiMe() {
    const res = await fetchWithRefresh(`${API}/auth/me`);
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
}

export async function apiLogout() {
    await fetchWithRefresh(`${API}/auth/logout`, { method: "POST", credentials: "include" });
}

// ─── Ask ──────────────────────────────────────────────────────────────────────

export async function apiAsk(query) {
    const res = await fetchWithRefresh(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Request failed");
    }
    return res.json();
}
