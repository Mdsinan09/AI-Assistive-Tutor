import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { Sparkles, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import GlassButton from "../components/glass/GlassButton";
import ShaderCanvas from "../components/glass/ShaderCanvas";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { announce } = useAccessibility();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError("Please provide both username and password.");
      announce("Please provide both username and password.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      announce("Logged in successfully. Welcome to your assistive dashboard.");
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failure:", err);
      setError(err.message || "Invalid credentials. Please verify your username and password.");
      announce("Login failed. Please check credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError("");
    setSubmitting(true);
    try {
      await login("student", "assistive123");
      announce("Logged in with Demo Student account.");
      navigate("/dashboard");
    } catch (err) {
      try {
        await authApi.register("student", "assistive123", "Demo Student", "student");
        await login("student", "assistive123");
        announce("Demo Student created and logged in.");
        navigate("/dashboard");
      } catch (innerErr) {
        setError("Could not launch demo account. Please register a new account.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
        backgroundColor: "var(--bg-canvas)",
      }}
    >
      <ShaderCanvas />

      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2.5rem 2rem",
          position: "relative",
          zIndex: 10,
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevation-high)",
        }}
      >
        {/* App Logo & Heading */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "var(--accent-primary)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 24px var(--accent-primary-subtle)",
            }}
          >
            <Sparkles size={28} />
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 750, margin: "0 0 0.4rem 0" }}>
            Assistive Tutor
          </h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Multimodal Vision & Voice Accessibility for Students
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "1.25rem",
            }}
            role="alert"
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label
              htmlFor="username"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                color: "var(--text-primary)",
              }}
            >
              Username
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <User
                size={17}
                style={{ position: "absolute", left: "1rem", color: "var(--text-tertiary)" }}
              />
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="glass-input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                color: "var(--text-primary)",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock
                size={17}
                style={{ position: "absolute", left: "1rem", color: "var(--text-tertiary)" }}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="glass-input"
                style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "0.85rem",
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <GlassButton
            variant="primary"
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}
          >
            <span>{submitting ? "Signing in..." : "Sign In to Tutor"}</span>
            <ArrowRight size={16} />
          </GlassButton>
        </form>

        {/* Demo Fast-Track Button */}
        <div style={{ margin: "1.25rem 0", textAlign: "center" }}>
          <div
            style={{
              position: "relative",
              textAlign: "center",
              margin: "1rem 0",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "50% 0",
                borderTop: "1px solid var(--glass-border-subtle)",
              }}
            />
            <span
              style={{
                position: "relative",
                backgroundColor: "var(--glass-bg-base)",
                padding: "0 0.5rem",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
              Or quick test
            </span>
          </div>

          <GlassButton
            variant="secondary"
            onClick={handleDemoSignIn}
            disabled={submitting}
            style={{ width: "100%", padding: "0.65rem", fontSize: "0.88rem" }}
          >
            <Sparkles size={16} color="var(--accent-primary)" />
            <span>1-Click Student Demo</span>
          </GlassButton>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>Don't have an account? </span>
          <Link
            to="/register"
            style={{ color: "var(--accent-primary)", fontWeight: 600, textDecoration: "none" }}
          >
            Create one here
          </Link>
        </div>
      </div>
    </div>
  );
}
