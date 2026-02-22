import { useState, useEffect } from "react";
import { apiMe } from "./services/api";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import SessionExpiredDialog from "./components/SessionExpiredDialog";
import "./styles/global.css";
import "./styles/animations.css";
import "./styles/auth.css";
import "./styles/form.css";
import "./styles/dashboard.css";
import "./styles/chat.css";
import "./styles/responsive.css";

export default function App() {
  const [authState, setAuthState] = useState("loading");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    apiMe()
      .then((data) => {
        setUserEmail(data.email || "");
        setAuthState("authed");
      })
      .catch(() => setAuthState("guest"));
  }, []);

  if (authState === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "linear-gradient(135deg, #c9a96e, #a0743a)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: "20px",
              color: "#000",
            }}
          >
            N
          </div>
          <div
            className="spinner"
            style={{
              borderTopColor: "#c9a96e",
              borderColor: "rgba(201,169,110,0.2)",
              width: "20px",
              height: "20px",
            }}
          />
        </div>
      </div>
    );
  }

  if (authState === "guest") {
    return (
      <AuthPage
        onLogin={(email) => {
          setUserEmail(email);
          setAuthState("authed");
        }}
      />
    );
  }

  return (
    <>
      <SessionExpiredDialog
        onExpired={() => {
          setUserEmail("");
          setAuthState("guest");
        }}
      />
      <Dashboard
        userEmail={userEmail}
        onLogout={() => {
          setUserEmail("");
          setAuthState("guest");
        }}
      />
    </>
  );
}
