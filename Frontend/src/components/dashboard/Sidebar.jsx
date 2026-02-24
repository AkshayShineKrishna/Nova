import { PlusIcon, LogOutIcon } from "../Icons";

export default function Sidebar({
    userEmail,
    initials,
    sessions,
    activeSessionId,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    newChat,
    openSession,
    deleteSession,
    onLogout
}) {
    return (
        <>
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
                        <button className="logout-btn" title="Sign out" onClick={onLogout}>
                            <LogOutIcon />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
