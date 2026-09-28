import React, { useState, useEffect, useRef } from "react";
import { useVoice } from "../../context/VoiceContext";
import { Mic, Send, X, Sparkles } from "lucide-react";
import GlassButton from "../glass/GlassButton";

const PRESET_COMMANDS = [
  "What is on my desk?",
  "Read document",
  "Pause detection",
  "Resume detection",
  "Switch to black mode",
  "Switch to white mode",
  "Read faster",
  "Repeat that",
];

export default function VoiceCommandPromptModal() {
  const { isPromptOpen, setIsPromptOpen, processTextCommand, voiceState } = useVoice();
  const [inputText, setInputText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isPromptOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setInputText("");
    }
  }, [isPromptOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isPromptOpen) {
        setIsPromptOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPromptOpen, setIsPromptOpen]);

  if (!isPromptOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const cmd = inputText.trim();
    setIsPromptOpen(false);
    processTextCommand(cmd);
  };

  const handleSelectPreset = (preset) => {
    setIsPromptOpen(false);
    processTextCommand(preset);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      onClick={() => setIsPromptOpen(false)}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevation-high)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--accent-primary-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-primary)",
              }}
            >
              <Mic size={18} />
            </div>
            <div>
              <h2 id="voice-modal-title" style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
                Voice Command Assistant
              </h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Speak or type an assistive command
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPromptOpen(false)}
            aria-label="Close dialog"
            className="btn-icon"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              ref={inputRef}
              type="text"
              className="glass-input"
              style={{
                width: "100%",
                padding: "0.85rem 3rem 0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "1rem",
              }}
              placeholder="e.g. 'What is on my desk?' or 'Read this book'"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              aria-label="Type your assistive voice command"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || voiceState === "PROCESSING"}
              style={{
                position: "absolute",
                right: "0.5rem",
                background: inputText.trim() ? "var(--accent-primary)" : "transparent",
                color: inputText.trim() ? "#ffffff" : "var(--text-tertiary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "0.5rem",
                cursor: inputText.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all var(--motion-fast)",
              }}
              aria-label="Send command"
            >
              <Send size={16} />
            </button>
          </div>
        </form>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-tertiary)",
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} /> Quick Shortcuts
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {PRESET_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                onClick={() => handleSelectPreset(cmd)}
                style={{
                  background: "var(--glass-bg-subtle)",
                  border: "1px solid var(--glass-border-subtle)",
                  borderRadius: "999px",
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all var(--motion-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                  e.currentTarget.style.background = "var(--accent-primary-subtle)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--glass-border-subtle)";
                  e.currentTarget.style.background = "var(--glass-bg-subtle)";
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <GlassButton variant="secondary" onClick={() => setIsPromptOpen(false)}>
            Cancel
          </GlassButton>
          <GlassButton variant="primary" onClick={handleSubmit} disabled={!inputText.trim()}>
            Execute Command
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
