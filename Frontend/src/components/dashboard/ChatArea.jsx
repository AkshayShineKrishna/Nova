import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { SendIcon } from "../Icons";
import { SUGGESTIONS } from "../../constants";

export default function ChatArea({
    activeSessionId,
    messages,
    input,
    setInput,
    streaming,
    loadingSession,
    send,
    initials,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    sessions,
    deleteActiveSession,
    onOpenRenameModal
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streaming]);

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(input, textareaRef);
        }
    };

    return (
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
                                            onOpenRenameModal(currentSess?.name || "");
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
                                    onClick={() => send(s.title, textareaRef)}
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
                    <button className="send-btn" disabled={!input.trim() || streaming} onClick={() => send(input, textareaRef)}>
                        <SendIcon />
                    </button>
                </div>
                <div className="input-hint">Nova can make mistakes. Verify important information.</div>
            </div>
        </main>
    );
}
