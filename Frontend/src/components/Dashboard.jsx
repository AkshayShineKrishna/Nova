import { useState, useCallback, useRef, useEffect } from "react";
import { apiLogout, apiAskStream, apiListSessions, apiGetSession, apiDeleteSession, apiRenameSession } from "../services/api";
import { PlusIcon, LogOutIcon, SendIcon } from "./Icons";
import { SUGGESTIONS } from "../constants";
import ReactMarkdown from "react-markdown";

export default function Dashboard({ userEmail, onLogout }) {
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [sessions, setSessions] = useState([]);         // [{ id, name, created_at }]
    const [messages, setMessages] = useState([]);         // [{ role: "user"|"ai", text }]
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [loadingSession, setLoadingSession] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const streamControllerRef = useRef(null);
    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);

    const initials = userEmail ? userEmail[0].toUpperCase() : "U";

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streaming]);

    // ── Load sessions on mount ────────────────────────────────────────────────
    useEffect(() => {
        apiListSessions()
            .then(setSessions)
            .catch(() => { });
    }, []);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLogout = async () => {
        await apiLogout().catch(() => { });
        onLogout();
    };

    const newChat = () => {
        streamControllerRef.current?.abort();
        setActiveSessionId(null);
        setMessages([]);
    };

    const openSession = async (id) => {
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
    };

    const deleteSession = async (e, id) => {
        e.stopPropagation();
        await apiDeleteSession(id).catch(() => { });
        setSessions((s) => s.filter((x) => x.id !== id));
        if (activeSessionId === id) {
            setActiveSessionId(null);
            setMessages([]);
        }
    };

    const deleteActiveSession = async () => {
        if (!activeSessionId) return;
        await apiDeleteSession(activeSessionId).catch(() => { });
        setSessions((s) => s.filter((x) => x.id !== activeSessionId));
        setActiveSessionId(null);
        setMessages([]);
        setMenuOpen(false);
    };

    const renameActiveSession = async (newName) => {
        if (!activeSessionId || !newName.trim()) return;
        try {
            const updated = await apiRenameSession(activeSessionId, newName);
            setSessions((s) => s.map((x) => x.id === activeSessionId ? { ...x, name: updated.name } : x));
            setIsRenaming(false);
        } catch (err) {
            console.error(err);
        }
    };

    // ── Send (SSE stream) ─────────────────────────────────────────────────────
    const send = useCallback(
        async (text) => {
            const trimmed = (text || input).trim();
            if (!trimmed || streaming) return;
            setInput("");
            if (textareaRef.current) textareaRef.current.style.height = "auto";

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

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="dashboard">
            {/* ── Sidebar ── */}
            {mobileSidebarOpen && (
                <div
                    className="mobile-sidebar-overlay"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}
            <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-top">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-mark">N</div>
                        <span className="sidebar-brand-name">Nova</span>
                    </div>
                    <button className="new-chat-btn" onClick={() => {
                        newChat();
                        setMobileSidebarOpen(false);
                    }}>
                        <PlusIcon />
                        New conversation
                    </button>
                </div>

                <div className="sidebar-section-label">Recents</div>

                <div className="sidebar-list">
                    {sessions.length === 0 && (
                        <div className="sidebar-empty">No conversations yet</div>
                    )}
                    {sessions.map((s, i) => (
                        <div
                            key={s.id}
                            className={`chat-item ${activeSessionId === s.id ? "active" : ""}`}
                            style={{ animationDelay: `${i * 0.04}s` }}
                            onClick={() => {
                                openSession(s.id);
                                setMobileSidebarOpen(false);
                            }}
                            title={s.name || "Untitled"}
                        >
                            <span className="chat-item-dot" />
                            <span className="chat-item-title">{s.name || "New conversation"}</span>
                            <button
                                className="chat-item-delete"
                                title="Delete"
                                onClick={(e) => deleteSession(e, s.id)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                <div className="sidebar-bottom">
                    <div className="user-row">
                        <div className="user-avatar">{initials}</div>
                        <div className="user-info">
                            <div className="user-email">{userEmail}</div>
                            <div className="user-plan">Free plan</div>
                        </div>
                        <button className="logout-btn" title="Sign out" onClick={handleLogout}>
                            <LogOutIcon />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Chat area ── */}
            <main className="chat-area">
                <header className={`chat-header ${!activeSessionId ? "empty" : ""}`}>
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div style={{ flex: 1 }} />
                    {activeSessionId && (
                        <div className="chat-header-actions">
                            <button
                                className={`icon-btn ${menuOpen ? "active" : ""}`}
                                onClick={() => setMenuOpen(!menuOpen)}
                                title="Options"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                </svg>
                            </button>

                            {menuOpen && (
                                <>
                                    <div className="dropdown-overlay" onClick={() => setMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
                                    <div className="dropdown-menu">
                                        <button
                                            className="dropdown-item"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                const currentSess = sessions.find(s => s.id === activeSessionId);
                                                setRenameValue(currentSess?.name || "");
                                                setIsRenaming(true);
                                            }}
                                        >
                                            Rename
                                        </button>
                                        <button
                                            className="dropdown-item text-danger"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                deleteActiveSession();
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </header>

                <div className="chat-messages">
                    {messages.length === 0 && !loadingSession ? (
                        <div className="empty-state">
                            <div className="empty-logo">N</div>
                            <h2 className="empty-title">What can I help with?</h2>
                            <p className="empty-subtitle">
                                Ask me anything — I'm here to think, write, code, and explore ideas with you.
                            </p>
                            <div className="suggestion-grid">
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        className="suggestion-card"
                                        style={{ animationDelay: `${0.15 + i * 0.06}s` }}
                                        onClick={() => send(s.title)}
                                    >
                                        <div className="suggestion-icon">{s.icon}</div>
                                        <div className="suggestion-title">{s.title}</div>
                                        <div className="suggestion-sub">{s.sub}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : loadingSession ? (
                        <div className="empty-state">
                            <div className="spinner" style={{ borderTopColor: "#c9a96e", borderColor: "rgba(201,169,110,0.2)", width: "24px", height: "24px" }} />
                        </div>
                    ) : (
                        <div className="messages-wrap">
                            {messages.map((m, i) => (
                                <div key={i} className={`message-row ${m.role === "user" ? "user" : ""}`}>
                                    <div className={`msg-avatar ${m.role === "ai" ? "ai" : "human"}`}>
                                        {m.role === "ai" ? "N" : initials}
                                    </div>
                                    <div className="msg-content">
                                        {m.role === "ai" && (
                                            <div className="msg-name">
                                                Nova
                                                {m.source && (
                                                    <span className={`source-badge source-badge--${m.source}`}>
                                                        {m.source === "mcp_joke" ? "🎭 MCP Joke"
                                                            : m.source === "mcp_math" ? "🔢 MCP Math"
                                                                : "💬 Chat"}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="msg-text">
                                            {m.text ? (
                                                <ReactMarkdown>{m.text}</ReactMarkdown>
                                            ) : (streaming && i === messages.length - 1 ? (
                                                <div className="typing-indicator">
                                                    <span className="typing-dot" />
                                                    <span className="typing-dot" />
                                                    <span className="typing-dot" />
                                                </div>
                                            ) : "")}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <div className="chat-input-area">
                    <div className="input-box">
                        <textarea
                            ref={textareaRef}
                            className="chat-textarea"
                            placeholder="Message Nova…"
                            value={input}
                            rows={1}
                            onChange={(e) => {
                                setInput(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                            }}
                            onKeyDown={handleKey}
                        />
                        <button className="send-btn" disabled={!input.trim() || streaming} onClick={() => send()}>
                            <SendIcon />
                        </button>
                    </div>
                    <div className="input-hint">Nova can make mistakes. Verify important information.</div>
                </div>
            </main>

            {/* Rename Modal */}
            {isRenaming && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Rename Conversation</h3>
                        <input
                            autoFocus
                            className="modal-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") renameActiveSession(renameValue);
                                if (e.key === "Escape") setIsRenaming(false);
                            }}
                        />
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setIsRenaming(false)}>Cancel</button>
                            <button className="btn-primary" onClick={() => renameActiveSession(renameValue)}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
