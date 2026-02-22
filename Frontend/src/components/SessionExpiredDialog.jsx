import { useEffect, useState } from "react";

export default function SessionExpiredDialog({ onExpired }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = () => setVisible(true);
        window.addEventListener("session-expired", handler);
        return () => window.removeEventListener("session-expired", handler);
    }, []);

    if (!visible) return null;

    function handleLogin() {
        setVisible(false);
        onExpired();
    }

    return (
        <div style={styles.backdrop}>
            <div style={styles.card}>
                {/* Lock icon */}
                <div style={styles.iconWrap}>
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#c9a96e"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>

                <h2 style={styles.heading}>Session Expired</h2>
                <p style={styles.subtitle}>
                    Your session has timed out for security. Please log in again to continue.
                </p>

                <button style={styles.btn} onClick={handleLogin}>
                    Log in again
                </button>
            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(12, 12, 14, 0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
    },
    card: {
        background: "#141416",
        border: "1px solid rgba(201, 169, 110, 0.2)",
        borderRadius: "20px",
        padding: "40px 36px",
        maxWidth: "380px",
        width: "90%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
        boxShadow: "0 0 60px rgba(201, 169, 110, 0.08), 0 24px 48px rgba(0,0,0,0.6)",
        animation: "slideUp 0.25s ease",
    },
    iconWrap: {
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "rgba(201, 169, 110, 0.1)",
        border: "1px solid rgba(201, 169, 110, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "6px",
    },
    heading: {
        fontFamily: "'Syne', sans-serif",
        fontWeight: 700,
        fontSize: "22px",
        color: "#f0ede8",
        margin: 0,
        textAlign: "center",
    },
    subtitle: {
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "14px",
        color: "rgba(240, 237, 232, 0.45)",
        textAlign: "center",
        lineHeight: 1.6,
        margin: 0,
    },
    btn: {
        marginTop: "10px",
        padding: "11px 32px",
        background: "linear-gradient(135deg, #c9a96e, #a0743a)",
        border: "none",
        borderRadius: "10px",
        color: "#000",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        fontSize: "14px",
        cursor: "pointer",
        letterSpacing: "0",
        transition: "opacity 0.15s ease, transform 0.15s ease",
    },
};
