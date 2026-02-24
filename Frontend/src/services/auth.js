import { API, fetchWithRefresh } from "./client";

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
