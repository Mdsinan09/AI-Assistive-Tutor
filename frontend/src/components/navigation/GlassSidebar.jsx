import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  History,
  Settings,
  Info,
  LogOut,
  User,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useVoice } from "../../context/VoiceContext";

export default function GlassSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { voiceState, stopSpeaking } = useVoice();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/statistics", label: "Statistics", icon: BarChart3 },
    { to: "/recent-activity", label: "Recent Activity", icon: History },
  ];

  const secondaryNavItems = [
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/about", label: "About System", icon: Info },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 40,
            display: "block",
          }}
        />
      )}

      <aside
        className={`glass-sidebar ${isOpen ? "open" : ""}`}
        style={{
          width: "280px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 45,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "1.5rem 1rem",
          transition: "transform var(--motion-normal)",
        }}
        aria-label="Primary navigation sidebar"
      >
        {/* Top Header & Branding */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0.75rem 1.5rem 0.75rem",
              borderBottom: "1px solid var(--glass-border-subtle)",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px var(--accent-primary-subtle)",
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                Assistive Tutor
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>
                Vision & Voice AI v3
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                padding: "0.5rem 0.75rem 0.25rem",
                fontWeight: 600,
              }}
            >
              Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.95rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    backgroundColor: isActive ? "var(--glass-bg-subtle)" : "transparent",
                    border: isActive ? "1px solid var(--glass-border-subtle)" : "1px solid transparent",
                    textDecoration: "none",
                    transition: "all var(--motion-fast)",
                  })}
                >
                  <Icon size={18} style={{ color: "var(--accent-primary)" }} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                padding: "1rem 0.75rem 0.25rem",
                fontWeight: 600,
              }}
            >
              Preferences
            </div>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.95rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    backgroundColor: isActive ? "var(--glass-bg-subtle)" : "transparent",
                    border: isActive ? "1px solid var(--glass-border-subtle)" : "1px solid transparent",
                    textDecoration: "none",
                    transition: "all var(--motion-fast)",
                  })}
                >
                  <Icon size={18} style={{ color: "var(--text-tertiary)" }} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Pill & Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Audio Quick Stop Pill if speaking */}
          {voiceState === "SPEAKING" && (
            <button
              onClick={stopSpeaking}
              className="glass-panel"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--accent-rose)",
                borderColor: "var(--accent-rose)",
                cursor: "pointer",
                borderRadius: "var(--radius-md)",
              }}
              title="Stop current speech (Press S)"
            >
              <VolumeX size={16} />
              <span>Silence Speech (S)</span>
            </button>
          )}

          {/* User Profile Pill */}
          <div
            className="glass-panel"
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-lg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "var(--glass-bg-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                <User size={16} />
              </div>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.full_name || user?.username || "Student"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                  {user?.role || "Active Session"}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-icon"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--accent-rose)",
                cursor: "pointer",
                padding: "0.4rem",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity var(--motion-fast)",
              }}
              aria-label="Logout of session"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
