import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { useAccessibility } from "../context/AccessibilityContext";
import { Sparkles, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import GlassButton from "../components/glass/GlassButton";
import ShaderCanvas from "../components/glass/ShaderCanvas";

export default function Register() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { announce } = useAccessibility();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password || !fullName.trim()) {
      setError("Please fill in all required fields.");
      announce("Please fill in all required fields.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters long.");
      announce("Password must be at least 4 characters.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await authApi.register(username.trim(), password, fullName.trim(), "student");
      announce("Account created. Logging in...");
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Failed to create account. Username might already be taken.");
      announce("Account registration failed.");
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
          maxWidth: "460px",
          padding: "2.5rem 2rem",
          position: "relative",
          zIndex: 10,
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevation-high)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
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
            Create Student Account
          </h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            Access personalized AI vision, OCR, and assistive tutoring
          </p>
        </div>

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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="fullName"
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
                color: "var(--text-primary)",
              }}
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              className="glass-input"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

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
              Choose Username
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
                placeholder="Unique username"
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
                autoComplete="new-password"
                className="glass-input"
                style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
                placeholder="Create a password"
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
            <span>{submitting ? "Creating account..." : "Register & Start"}</span>
            <ArrowRight size={16} />
          </GlassButton>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem" }}>
          <span style={{ color: "var(--text-secondary)" }}>Already registered? </span>
          <Link
            to="/login"
            style={{ color: "var(--accent-primary)", fontWeight: 600, textDecoration: "none" }}
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
