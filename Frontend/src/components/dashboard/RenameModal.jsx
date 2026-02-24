import { useState, useEffect } from "react";

export default function RenameModal({ initialName, onRename, onClose }) {
    const [renameValue, setRenameValue] = useState(initialName || "");

    useEffect(() => {
        setRenameValue(initialName || "");
    }, [initialName]);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Rename Conversation</h3>
                <input
                    autoFocus
                    className="modal-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onRename(renameValue);
                        if (e.key === "Escape") onClose();
                    }}
                />
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={() => onRename(renameValue)}>Save</button>
                </div>
            </div>
        </div>
    );
}
