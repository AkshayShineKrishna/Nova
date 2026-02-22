import { useState, useCallback, useRef, useEffect } from "react";
import { apiLogout, apiAsk } from "../services/api";
import { PlusIcon, LogOutIcon, SendIcon } from "./Icons";
import { MOCK_CHATS, SUGGESTIONS } from "../constants";

export default function Dashboard({ userEmail, onLogout }) {
    const [activeChat, setActiveChat] = useState(null);
    const [chats, setChats] = useState(MOCK_CHATS);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [typing, setTyping] = useState(false);
    const textareaRef = useRef(null);
    const messagesEndRef = useRef(null);

    const initials = userEmail ? userEmail[0].toUpperCase() : "U";

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typing]);

    const handleLogout = async () => {
        await apiLogout().catch(() => { });
        onLogout();
    };

    const newChat = () => {
        setActiveChat(null);
        setMessages([]);
    };

    const openChat = (id) => {
        setActiveChat(id);
        setMessages([]);
    };

    const send = useCallback(
        async (text) => {
            const trimmed = (text || input).trim();
            if (!trimmed) return;
            setInput("");

            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }

            if (!activeChat) {
                const newId = Date.now();
                const newChatItem = { id: newId, title: trimmed.slice(0, 40) };
                setChats((c) => [newChatItem, ...c]);
                setActiveChat(newId);
            }

            const userMsg = { role: "user", text: trimmed };
            setMessages((m) => [...m, userMsg]);
            setTyping(true);

            try {
                const data = await apiAsk(trimmed);
                setMessages((m) => [...m, { role: "ai", text: data.answer }]);
            } catch {
                setMessages((m) => [
                    ...m,
                    { role: "ai", text: "Something went wrong. Please try again." },
                ]);
            } finally {
                setTyping(false);
            }
        },
        [input, activeChat]
    );

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-top">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-mark">N</div>
                        <span className="sidebar-brand-name">Nova</span>
                    </div>
                    <button className="new-chat-btn" onClick={newChat}>
                        <PlusIcon />
                        New conversation
                    </button>
                </div>

                <div className="sidebar-section-label">Recents</div>

                <div className="sidebar-list">
                    {chats.map((c, i) => (
                        <div
                            key={c.id}
                            className={`chat-item ${activeChat === c.id ? "active" : ""}`}
                            style={{ animationDelay: `${i * 0.04}s` }}
                            onClick={() => openChat(c.id)}
                        >
                            <span className="chat-item-dot" />
                            {c.title}
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

            <main className="chat-area">
                <header className="chat-header">
                    <div className="chat-model-badge">
                        <span className="model-dot" />
                        Nova 1.5
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-dim)" }}>
                        {messages.length} message{messages.length !== 1 ? "s" : ""}
                    </div>
                </header>

                <div className="chat-messages">
                    {messages.length === 0 ? (
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
                    ) : (
                        <div className="messages-wrap">
                            {messages.map((m, i) => (
                                <div key={i} className={`message-row ${m.role === "user" ? "user" : ""}`}>
                                    <div className={`msg-avatar ${m.role === "ai" ? "ai" : "human"}`}>
                                        {m.role === "ai" ? "N" : initials}
                                    </div>
                                    <div className="msg-content">
                                        {m.role === "ai" && <div className="msg-name">Nova</div>}
                                        <div className="msg-text">{m.text}</div>
                                    </div>
                                </div>
                            ))}
                            {typing && (
                                <div className="message-row">
                                    <div className="msg-avatar ai">N</div>
                                    <div className="msg-content">
                                        <div className="msg-name">Nova</div>
                                        <div className="typing-indicator">
                                            <span className="typing-dot" />
                                            <span className="typing-dot" />
                                            <span className="typing-dot" />
                                        </div>
                                    </div>
                                </div>
                            )}
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
                        <button className="send-btn" disabled={!input.trim() || typing} onClick={() => send()}>
                            <SendIcon />
                        </button>
                    </div>
                    <div className="input-hint">Nova can make mistakes. Verify important information.</div>
                </div>
            </main>
        </div>
    );
}
