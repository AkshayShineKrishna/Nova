import { useState } from "react";
import { apiLogin, apiRegister } from "../services/api";
import { EyeIcon, EyeOffIcon } from "./Icons";

export default function AuthPage({ onLogin }) {
    const [mode, setMode] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!email) errs.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email";
        if (!password) errs.password = "Password is required";
        else if (password.length < 6) errs.password = "At least 6 characters";
        return errs;
    };

    const submit = async () => {
        setError("");
        const errs = validate();
        setFieldErrors(errs);
        if (Object.keys(errs).length) return;

        setLoading(true);
        try {
            if (mode === "login") {
                await apiLogin(email, password);
            } else {
                await apiRegister(email, password);
            }
            onLogin(email);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter") submit();
    };

    return (
        <div className="auth-root">
            <div className="auth-left">
                <div className="brand-logo fade-up">
                    <div className="brand-mark">N</div>
                    <span className="brand-name">Nova</span>
                </div>

                <h1 className="auth-headline fade-up fade-up-1">
                    Think faster.<br />
                    Build <em>smarter.</em>
                </h1>

                <p className="auth-sub fade-up fade-up-2">
                    An intelligent assistant that understands context, crafts ideas, and helps you work at the speed of thought — without the friction.
                </p>
            </div>

            <div className="auth-right">
                <div className="grid-bg" />

                <div className="form-card">
                    <div className="form-header fade-up">
                        <div className="tab-row">
                            <button
                                className={`tab-btn ${mode === "login" ? "active" : ""}`}
                                onClick={() => {
                                    setMode("login");
                                    setError("");
                                    setFieldErrors({});
                                }}
                            >
                                Sign in
                            </button>
                            <button
                                className={`tab-btn ${mode === "register" ? "active" : ""}`}
                                onClick={() => {
                                    setMode("register");
                                    setError("");
                                    setFieldErrors({});
                                }}
                            >
                                Create account
                            </button>
                        </div>
                    </div>

                    {error && <div className="global-error fade-up">{error}</div>}

                    <div className="field-group fade-up fade-up-1">
                        <label className="field-label">Email address</label>
                        <input
                            type="email"
                            className={`field-input ${fieldErrors.email ? "error" : ""}`}
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setFieldErrors((f) => ({ ...f, email: "" }));
                            }}
                            onKeyDown={handleKey}
                            autoComplete="email"
                        />
                        {fieldErrors.email && <div className="error-msg">{fieldErrors.email}</div>}
                    </div>

                    <div className="field-group fade-up fade-up-2">
                        <label className="field-label">Password</label>
                        <div className="field-wrap">
                            <input
                                type={showPass ? "text" : "password"}
                                className={`field-input ${fieldErrors.password ? "error" : ""}`}
                                placeholder={mode === "register" ? "Min. 6 characters" : "Enter your password"}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setFieldErrors((f) => ({ ...f, password: "" }));
                                }}
                                onKeyDown={handleKey}
                                autoComplete={mode === "login" ? "current-password" : "new-password"}
                                style={{ paddingRight: "44px" }}
                            />
                            <button className="field-eye" type="button" onClick={() => setShowPass((s) => !s)}>
                                {showPass ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {fieldErrors.password && <div className="error-msg">{fieldErrors.password}</div>}
                    </div>

                    <button className="submit-btn fade-up fade-up-3" onClick={submit} disabled={loading}>
                        {loading ? <span className="spinner" /> : null}
                        {loading
                            ? mode === "login"
                                ? "Signing in…"
                                : "Creating account…"
                            : mode === "login"
                                ? "Sign in"
                                : "Create account"}
                    </button>
                </div>
            </div>
        </div>
    );
}
