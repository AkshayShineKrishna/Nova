import { API, fetchWithRefresh } from "./client";

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

export async function apiRenameSession(sessionId, name) {
    const res = await fetchWithRefresh(`${API}/ask/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to rename session");
    return res.json(); // { id, name, created_at }
}
