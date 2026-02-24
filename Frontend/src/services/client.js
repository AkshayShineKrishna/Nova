export const API = import.meta.env.PROD ? "http://localhost:8090" : "/api";

// ─── Silent Refresh Interceptor ──────────────────────────────────────────────
// Wraps every protected fetch. On a 401:
//   1. Calls POST /auth/refresh to rotate tokens (sets new cookies server-side)
//   2. Retries the original request once
//   3. If refresh also fails → throws "Not authenticated" → App shows login screen

export async function fetchWithRefresh(url, options = {}) {
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
