import React from "react";
import { X, Keyboard } from "lucide-react";
import { GlassPanel } from "../glass/GlassPanel";
import { GlassButton } from "../glass/GlassButton";

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "V", desc: "Activate Voice Assistant (Listen / Enter Command)" },
    { key: "P", desc: "Toggle Pause / Resume Environmental Detection" },
    { key: "S", desc: "Stop Audio Narration Immediately (Cancel TTS)" },
    { key: "R", desc: "Repeat Last Spoken Announcement" },
    { key: "?", desc: "Toggle this Keyboard Shortcuts guide" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.5rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassPanel
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "2rem",
          background: "var(--glass-bg-elevated)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-blue-subtle)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Keyboard size={20} />
            </div>
            <h2 id="shortcuts-title" style={{ fontSize: "1.3rem" }}>Keyboard Accessibility</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts modal"
            style={{
              padding: "6px",
              borderRadius: "var(--radius-full)",
              color: "var(--text-secondary)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ marginBottom: "1.5rem", fontSize: "0.92rem" }}>
          This assistive platform provides tactile single-key shortcuts to enable full non-visual control:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "2rem" }}>
          {shortcuts.map((s) => (
            <div
              key={s.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 500 }}>
                {s.desc}
              </span>
              <kbd
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-strong)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-blue)",
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <GlassButton variant="primary" onClick={onClose}>
            Got It
          </GlassButton>
        </div>
      </GlassPanel>
    </div>
  );
}

export default KeyboardShortcutsModal;
