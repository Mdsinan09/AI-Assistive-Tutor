import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import GlassSidebar from "../navigation/GlassSidebar";
import ShaderCanvas from "../glass/ShaderCanvas";
import VoiceCommandPromptModal from "../accessibility/VoiceCommandPromptModal";
import KeyboardShortcutsModal from "../accessibility/KeyboardShortcutsModal";
import { useVoice } from "../../context/VoiceContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import { Menu, HelpCircle, Mic } from "lucide-react";

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { startListening, stopSpeaking, repeatLast } = useVoice();
  const { announce } = useAccessibility();

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger hotkeys if user is focused inside an input, textarea, or contentEditable
      const tag = e.target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) {
        return;
      }

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        startListening();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        stopSpeaking();
        announce("Speech stopped.");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        repeatLast();
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startListening, stopSpeaking, repeatLast, announce]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-canvas)",
        color: "var(--text-primary)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Dynamic Background Shader / Mesh */}
      <ShaderCanvas />

      {/* Primary Left Liquid Glass Sidebar */}
      <GlassSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile Top Header (hidden on desktop via CSS) */}
      <header
        className="mobile-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 35,
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: "var(--glass-bg-base)",
          borderBottom: "1px solid var(--glass-border-subtle)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
          style={{
            background: "none",
            border: "none",
            color: "var(--text-primary)",
            padding: "0.5rem",
            cursor: "pointer",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ fontWeight: 600, fontSize: "1rem" }}>Assistive Tutor</div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => startListening()}
            aria-label="Activate voice command"
            style={{
              background: "var(--accent-primary-subtle)",
              border: "none",
              color: "var(--accent-primary)",
              padding: "0.5rem",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          >
            <Mic size={18} />
          </button>
          <button
            onClick={() => setShortcutsOpen(true)}
            aria-label="Show keyboard shortcuts"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              padding: "0.5rem",
              cursor: "pointer",
            }}
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div
        className="app-main-wrapper"
        style={{
          marginLeft: "280px",
          minHeight: "100vh",
          transition: "margin-left var(--motion-normal)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <main
          className="app-main-content"
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Accessibility Voice Command Modal */}
      <VoiceCommandPromptModal />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
