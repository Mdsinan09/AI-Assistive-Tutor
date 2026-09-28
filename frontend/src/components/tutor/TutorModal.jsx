import React, { useState, useEffect, useRef } from "react";
import { tutorApi } from "../../api/tutorApi";
import { useVoice } from "../../context/VoiceContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import { Bot, Send, Volume2, VolumeX, X, Sparkles, BookOpen } from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function TutorModal({ isOpen, onClose, initialContext = "" }) {
  const [question, setQuestion] = useState("");
  const [contextText, setContextText] = useState(initialContext);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { speak, stopSpeaking } = useVoice();
  const { announce } = useAccessibility();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setContextText(initialContext);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setAnswer("");
      setError("");
      setQuestion("");
    }
  }, [isOpen, initialContext]);

  if (!isOpen) return null;

  const handleAsk = async (e) => {
    e?.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");
    stopSpeaking();

    try {
      const res = await tutorApi.ask(question.trim(), contextText.trim());
      const reply = res.answer || "No response received from tutor.";
      setAnswer(reply);
      announce("AI Tutor has answered your question.");
      speak(reply);
    } catch (err) {
      console.error("Tutor error:", err);
      setError(err.message || "Failed to contact AI Tutor.");
      announce("Error communicating with AI Tutor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutor-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9990,
        padding: "1.5rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "1.75rem",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--accent-amber-subtle)",
                color: "var(--accent-amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <h2 id="tutor-modal-title" style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Gemini AI Assistive Tutor
              </h2>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Coursework questions, chapter explanations, and concept hints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-icon"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              padding: "0.5rem",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Optional Context Preview */}
        {contextText && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "var(--glass-bg-subtle)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--glass-border-subtle)",
              fontSize: "0.82rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--accent-amber)",
                fontWeight: 650,
                marginBottom: "0.25rem",
              }}
            >
              <BookOpen size={13} /> Active Document Context Attached
            </div>
            <div
              style={{
                color: "var(--text-secondary)",
                maxHeight: "60px",
                overflowY: "auto",
                lineHeight: 1.4,
              }}
            >
              "{contextText.slice(0, 220)}
              {contextText.length > 220 ? "..." : ""}"
            </div>
          </div>
        )}

        {/* Answer Output Viewport */}
        {answer && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "var(--glass-bg-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--glass-border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 650,
                  textTransform: "uppercase",
                  color: "var(--accent-amber)",
                }}
              >
                Tutor Explanation
              </span>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <GlassButton
                  variant="secondary"
                  onClick={() => speak(answer)}
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  <Volume2 size={13} /> Speak
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={stopSpeaking}
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  <VolumeX size={13} /> Stop
                </GlassButton>
              </div>
            </div>

            <div
              tabIndex={0}
              aria-label="Tutor response"
              style={{
                fontSize: "0.95rem",
                lineHeight: 1.6,
                color: "var(--text-primary)",
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              {answer}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: "center", padding: "1.5rem" }}>
            <div
              className="animate-spin"
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid var(--glass-border-subtle)",
                borderTopColor: "var(--accent-amber)",
                borderRadius: "50%",
                margin: "0 auto 0.5rem",
              }}
            />
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              Gemini is reasoning through your question...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Question Input Form */}
        <form onSubmit={handleAsk} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              ref={inputRef}
              type="text"
              className="glass-input"
              style={{
                width: "100%",
                padding: "0.85rem 3rem 0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.95rem",
              }}
              placeholder="e.g. 'Can you summarize this page in 2 sentences?'"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              aria-label="Ask the AI Tutor a question"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              style={{
                position: "absolute",
                right: "0.5rem",
                background: question.trim() ? "var(--accent-amber)" : "transparent",
                color: question.trim() ? "#000000" : "var(--text-tertiary)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "0.5rem",
                cursor: question.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Send question"
            >
              <Send size={16} />
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <GlassButton variant="secondary" onClick={onClose}>
              Done
            </GlassButton>
            <GlassButton variant="primary" onClick={handleAsk} disabled={!question.trim() || loading}>
              Ask Tutor
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}
