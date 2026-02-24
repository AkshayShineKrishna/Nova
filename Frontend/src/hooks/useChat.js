import { useState, useCallback, useRef, useEffect } from "react";
import {
    apiAskStream,
    apiListSessions,
    apiGetSession,
    apiDeleteSession,
    apiRenameSession,
} from "../services/api";

export function useChat() {
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [sessions, setSessions] = useState([]);         // [{ id, name, created_at }]
    const [messages, setMessages] = useState([]);         // [{ role: "user"|"ai", text }]
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [loadingSession, setLoadingSession] = useState(false);

    const streamControllerRef = useRef(null);

    // ── Load sessions on mount ────────────────────────────────────────────────
    useEffect(() => {
        apiListSessions()
            .then(setSessions)
            .catch(() => { });
    }, []);

    const newChat = useCallback(() => {
        streamControllerRef.current?.abort();
        setActiveSessionId(null);
        setMessages([]);
    }, []);

    const openSession = useCallback(async (id) => {
        if (id === activeSessionId) return;
        streamControllerRef.current?.abort();
        setActiveSessionId(id);
        setMessages([]);
        setLoadingSession(true);
        try {
            const msgs = await apiGetSession(id);
            setMessages(msgs.map((m) => ({
                role: m.role === "human" ? "user" : "ai",
                text: m.content,
                source: m.source ?? null,
            })));
        } catch {
            setMessages([{ role: "ai", text: "Failed to load conversation." }]);
        } finally {
            setLoadingSession(false);
        }
    }, [activeSessionId]);

    const deleteSession = useCallback(async (e, id) => {
        e?.stopPropagation();
        await apiDeleteSession(id).catch(() => { });
        setSessions((s) => s.filter((x) => x.id !== id));
        if (activeSessionId === id) {
            setActiveSessionId(null);
            setMessages([]);
        }
    }, [activeSessionId]);

    const deleteActiveSession = useCallback(async () => {
        if (!activeSessionId) return;
        await apiDeleteSession(activeSessionId).catch(() => { });
        setSessions((s) => s.filter((x) => x.id !== activeSessionId));
        setActiveSessionId(null);
        setMessages([]);
    }, [activeSessionId]);

    const renameActiveSession = useCallback(async (newName) => {
        if (!activeSessionId || !newName.trim()) return false;
        try {
            const updated = await apiRenameSession(activeSessionId, newName);
            setSessions((s) => s.map((x) => x.id === activeSessionId ? { ...x, name: updated.name } : x));
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }, [activeSessionId]);

    // ── Send (SSE stream) ─────────────────────────────────────────────────────
    const send = useCallback(
        async (textToSubmit, textareaRef = null) => {
            const trimmed = (textToSubmit || input).trim();
            if (!trimmed || streaming) return;
            setInput("");
            if (textareaRef && textareaRef.current) textareaRef.current.style.height = "auto";

            // Optimistically add the user message
            setMessages((m) => [...m, { role: "user", text: trimmed }]);
            setStreaming(true);

            let resolvedSessionId = activeSessionId;
            // Placeholder for the streaming AI message
            setMessages((m) => [...m, { role: "ai", text: "", source: null }]);

            const controller = apiAskStream(trimmed, resolvedSessionId, {
                onSession: (sid, sname) => {
                    resolvedSessionId = sid;
                    setActiveSessionId(sid);
                    // Add or update session in sidebar
                    setSessions((prev) => {
                        const exists = prev.find((s) => s.id === sid);
                        if (exists) return prev;
                        return [{ id: sid, name: sname, created_at: new Date().toISOString() }, ...prev];
                    });
                },
                onToken: (token) => {
                    setMessages((m) => {
                        const copy = [...m];
                        const last = copy[copy.length - 1];
                        if (last?.role === "ai") {
                            copy[copy.length - 1] = { ...last, text: last.text + token };
                        }
                        return copy;
                    });
                },
                onSource: (src) => {
                    setMessages((m) => {
                        const copy = [...m];
                        const last = copy[copy.length - 1];
                        if (last?.role === "ai") {
                            copy[copy.length - 1] = { ...last, source: src };
                        }
                        return copy;
                    });
                },
                onDone: () => {
                    setStreaming(false);
                    // Refresh session name (title may have been generated)
                    apiListSessions()
                        .then(setSessions)
                        .catch(() => { });
                },
                onError: (err) => {
                    setStreaming(false);
                    if (err === "session_expired") return; // global handler fires
                    setMessages((m) => {
                        const copy = [...m];
                        const last = copy[copy.length - 1];
                        if (last?.role === "ai" && last.text === "") {
                            copy[copy.length - 1] = { role: "ai", text: "Something went wrong. Please try again." };
                        }
                        return copy;
                    });
                },
            });

            streamControllerRef.current = controller;
        },
        [input, activeSessionId, streaming]
    );

    return {
        activeSessionId,
        sessions,
        messages,
        input,
        setInput,
        streaming,
        loadingSession,
        newChat,
        openSession,
        deleteSession,
        deleteActiveSession,
        renameActiveSession,
        send
    };
}
