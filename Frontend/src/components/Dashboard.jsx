import { useState } from "react";
import { apiLogout } from "../services/api";
import { useChat } from "../hooks/useChat";
import Sidebar from "./dashboard/Sidebar";
import ChatArea from "./dashboard/ChatArea";
import RenameModal from "./dashboard/RenameModal";

export default function Dashboard({ userEmail, onLogout }) {
    const {
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
    } = useChat();

    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Rename Modal State
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameSessionName, setRenameSessionName] = useState("");

    const initials = userEmail ? userEmail[0].toUpperCase() : "U";

    const handleLogout = async () => {
        await apiLogout().catch(() => { });
        onLogout();
    };

    const handleOpenRenameModal = (currentName) => {
        setRenameSessionName(currentName);
        setIsRenaming(true);
    };

    const handleRename = async (newName) => {
        const success = await renameActiveSession(newName);
        if (success) setIsRenaming(false);
    };

    return (
        <div className="dashboard">
            <Sidebar
                userEmail={userEmail}
                initials={initials}
                sessions={sessions}
                activeSessionId={activeSessionId}
                mobileSidebarOpen={mobileSidebarOpen}
                setMobileSidebarOpen={setMobileSidebarOpen}
                newChat={newChat}
                openSession={openSession}
                deleteSession={deleteSession}
                onLogout={handleLogout}
            />

            <ChatArea
                activeSessionId={activeSessionId}
                messages={messages}
                input={input}
                setInput={setInput}
                streaming={streaming}
                loadingSession={loadingSession}
                send={send}
                initials={initials}
                mobileSidebarOpen={mobileSidebarOpen}
                setMobileSidebarOpen={setMobileSidebarOpen}
                sessions={sessions}
                deleteActiveSession={deleteActiveSession}
                onOpenRenameModal={handleOpenRenameModal}
            />

            {isRenaming && (
                <RenameModal
                    initialName={renameSessionName}
                    onRename={handleRename}
                    onClose={() => setIsRenaming(false)}
                />
            )}
        </div>
    );
}
