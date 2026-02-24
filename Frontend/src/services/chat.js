import { API, fetchWithRefresh } from "./client";

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
