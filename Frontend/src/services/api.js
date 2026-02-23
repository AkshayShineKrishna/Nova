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

// ─── Ask (JSON, session-aware) ────────────────────────────────────────────────

export async function apiAsk(query, sessionId = null) {
    const res = await fetchWithRefresh(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id: sessionId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Request failed");
    }
    return res.json(); // { answer, session_id, session_name }
}

// ─── Ask Stream (SSE via fetch so cookies are forwarded) ──────────────────────
//
// Calls the backend GET /ask/stream endpoint and parses the SSE events:
//   { type: "session",  session_id, session_name }
//   { type: "token",   token }
//   { type: "done" }
//   { type: "error",   error }
//
// Callbacks:
//   onSession(sessionId, sessionName) — fired once at stream start
//   onToken(token)                    — fired for each streamed token
//   onDone()                          — fired when streaming is complete
//   onError(message)                  — fired on error
//
// Returns an AbortController so the caller can cancel the stream.

export function apiAskStream(query, sessionId, { onSession, onToken, onDone, onError, onSource }) {
    const controller = new AbortController();

    const params = new URLSearchParams({ query });
    if (sessionId) params.set("session_id", sessionId);
    const url = `${API}/ask/stream?${params}`;

    (async () => {
        try {
            const res = await fetch(url, {
                credentials: "include",
                signal: controller.signal,
            });

            // Handle auth: try a silent refresh then retry once
            if (res.status === 401) {
                const refreshRes = await fetch(`${API}/auth/refresh`, {
                    method: "POST",
                    credentials: "include",
                });
                if (!refreshRes.ok) {
                    window.dispatchEvent(new CustomEvent("session-expired"));
                    onError?.("Not authenticated");
                    return;
                }
                // Retry stream after refresh
                const retryRes = await fetch(url, {
                    credentials: "include",
                    signal: controller.signal,
                });
                if (!retryRes.ok) { onError?.("Request failed"); return; }
                await _readSSEStream(retryRes.body, { onSession, onToken, onDone, onError, onSource });
                return;
            }

            if (!res.ok) { onError?.("Request failed"); return; }
            await _readSSEStream(res.body, { onSession, onToken, onDone, onError, onSource });

        } catch (err) {
            if (err.name !== "AbortError") onError?.(err.message);
        }
    })();

    return controller;
}

async function _readSSEStream(body, { onSession, onToken, onDone, onError, onSource }) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event;
            try { event = JSON.parse(raw); }
            catch { continue; }

            if (event.type === "session") onSession?.(event.session_id, event.session_name);
            else if (event.type === "token") onToken?.(event.token);
            else if (event.type === "source") onSource?.(event.source);
            else if (event.type === "done") onDone?.();
            else if (event.type === "error") onError?.(event.error);
        }
    }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function apiListSessions() {
    const res = await fetchWithRefresh(`${API}/ask/sessions`);
    if (!res.ok) throw new Error("Failed to load sessions");
    return res.json(); // [{ id, name, created_at }]
}

export async function apiGetSession(sessionId) {
    const res = await fetchWithRefresh(`${API}/ask/sessions/${sessionId}`);
    if (!res.ok) throw new Error("Failed to load session");
    return res.json(); // [{ id, role, content, created_at }]
}

export async function apiDeleteSession(sessionId) {
    const res = await fetchWithRefresh(`${API}/ask/sessions/${sessionId}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete session");
    return res.json();
}
