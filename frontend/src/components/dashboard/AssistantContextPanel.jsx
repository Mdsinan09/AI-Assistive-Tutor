import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVoice } from "../../context/VoiceContext";
import {
  Volume2,
  VolumeX,
  FileText,
  Eye,
  Bot,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function AssistantContextPanel({
  activeContext,
  onClearContext,
  detections = [],
  narration = "",
}) {
  const navigate = useNavigate();
  const {
    voiceState,
    transcript,
    lastSpokenResponse,
    speak,
    stopSpeaking,
  } = useVoice();

  const [isCopied, setIsCopied] = useState(false);

  // Determine what content to display
  // 1. If user has an OCR result or selected text
  const selectedText = activeContext?.selectedText || "";
  const rawOcrText = activeContext?.ocrResult?.text || "";
  const targetText = selectedText || rawOcrText;

  const handleCopy = () => {
    if (!targetText) return;
    try {
      navigator.clipboard?.writeText(targetText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {}
  };
  const hasOcr = Boolean(targetText);

  // 2. Active voice conversation or assistant answer
  const hasVoice = Boolean(transcript || lastSpokenResponse);

  // 3. Fallback to detection spatial narration
  const displayNarration = narration || "FieldNet V3 is actively monitoring your workspace.";

  const handleReadAloud = (textToRead) => {
    const text = textToRead || targetText || lastSpokenResponse || displayNarration;
    if (!text) return;
    stopSpeaking();
    speak(text);
  };

  const handleAskTutor = () => {
    if (!targetText) return;
    navigate("/assistive-tutor", {
      state: {
        initialContext: targetText,
        source: "ocr",
      },
    });
  };

  return (
    <section
      aria-label="Live Assistant Context and Responses"
      className="glass-panel"
      style={{
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.85rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: hasOcr
                ? "var(--accent-amber-subtle)"
                : hasVoice
                ? "var(--accent-primary-subtle)"
                : "var(--accent-green-subtle)",
              color: hasOcr
                ? "var(--accent-amber)"
                : hasVoice
                ? "var(--accent-primary)"
                : "var(--accent-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {hasOcr ? <FileText size={18} /> : hasVoice ? <MessageSquare size={18} /> : <Eye size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: 650, fontSize: "1rem", color: "var(--text-primary)" }}>
              {selectedText
                ? "Selected Text Context"
                : hasOcr
                ? "Scanned Document Context"
                : hasVoice
                ? "Voice Dialogue"
                : "Live Spatial Awareness"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              {selectedText
                ? `${selectedText.split(/\s+/).length} words selected`
                : hasOcr
                ? `${activeContext?.ocrResult?.word_count || targetText.split(/\s+/).length} words extracted from camera`
                : hasVoice
                ? "Context-aware response"
                : `${detections.length} objects currently tracked`}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <GlassButton
            variant="secondary"
            onClick={() => handleReadAloud()}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
          >
            <Volume2 size={14} />
            <span>Read Aloud</span>
          </GlassButton>

          <GlassButton
            variant="secondary"
            onClick={stopSpeaking}
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
          >
            <VolumeX size={14} />
            <span>Stop</span>
          </GlassButton>

          {hasOcr && (
            <GlassButton
              variant="primary"
              onClick={handleAskTutor}
              style={{
                padding: "0.35rem 0.85rem",
                fontSize: "0.8rem",
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-blue-deep, #1d4ed8))",
                color: "#fff",
              }}
            >
              <span>Ask Tutor</span>
              <ArrowRight size={14} />
            </GlassButton>
          )}
        </div>
      </div>

      {/* Main Dynamic Viewport */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "var(--glass-bg-subtle)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--glass-border-subtle)",
          minHeight: "85px",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
        aria-live="polite"
      >
        {/* User Query if recently spoken */}
        {transcript && (
          <div
            style={{
              fontSize: "0.82rem",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Bot size={13} />
            <span>You asked: "{transcript}"</span>
          </div>
        )}

        {hasOcr ? (
          /* Display OCR Text from Camera / Selection */
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem", flexWrap: "wrap", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selectedText ? "var(--accent-primary)" : "var(--accent-amber)", textTransform: "uppercase" }}>
                {selectedText ? "Selected Text" : "Captured Textbook Text"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={handleCopy}
                  style={{
                    background: isCopied ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: isCopied ? "var(--accent-green)" : "var(--text-secondary)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Copy text to clipboard"
                >
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
                {activeContext?.ocrResult?.confidence_score > 0 && !selectedText && (
                  <span className="glass-pill success" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                    Confidence: {activeContext.ocrResult.confidence_score}%
                  </span>
                )}
              </div>
            </div>
            <div
              tabIndex={0}
              aria-label={selectedText ? "Selected text from camera" : "Recognized text from camera"}
              style={{
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                lineHeight: 1.65,
                maxHeight: "340px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                userSelect: "text",
                background: selectedText ? "rgba(99, 102, 241, 0.08)" : "rgba(0, 0, 0, 0.2)",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                borderLeft: selectedText ? "3px solid var(--accent-primary)" : "none",
                border: "1px solid var(--glass-border-subtle)",
              }}
            >
              {targetText}
            </div>
          </div>
        ) : lastSpokenResponse ? (
          /* Display Last Voice Assistant Answer */
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-green)", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Assistant Response
            </div>
            <div style={{ fontSize: "1rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
              {lastSpokenResponse}
            </div>
          </div>
        ) : (
          /* Fallback / Guidance */
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "0.2rem", textTransform: "uppercase" }}>
                Spatial Narration
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
                {displayNarration}
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", fontStyle: "italic", whiteSpace: "nowrap" }}>
              Tip: Tap "Read Text" on camera to scan textbook
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
