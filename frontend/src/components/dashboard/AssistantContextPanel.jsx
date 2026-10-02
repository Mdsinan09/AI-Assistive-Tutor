import React, { useState } from "react";
import { useVoice } from "../../context/VoiceContext";
import {
  Sparkles,
  Volume2,
  VolumeX,
  FileText,
  RotateCcw,
  BookOpen,
  Eye,
  Bot,
  MessageSquare,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";
import { tutorApi } from "../../api/tutorApi";

export default function AssistantContextPanel({
  activeContext,
  onClearContext,
  detections = [],
  narration = "",
}) {
  const {
    voiceState,
    transcript,
    lastSpokenResponse,
    speak,
    stopSpeaking,
  } = useVoice();

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationText, setExplanationText] = useState("");

  // Determine what content to display
  // 1. If user recently received an OCR result
  const hasOcr = Boolean(activeContext?.ocrResult?.text);
  const ocrText = activeContext?.ocrResult?.text || "";

  // 2. Active voice conversation or assistant answer
  const hasVoice = Boolean(transcript || lastSpokenResponse);

  // 3. Fallback to detection spatial narration
  const displayNarration = narration || "FieldNet V3 is actively monitoring your workspace.";

  const handleReadAloud = (textToRead) => {
    stopSpeaking();
    speak(textToRead);
  };

  const handleSummarize = async () => {
    const sourceText = ocrText || lastSpokenResponse || displayNarration;
    if (!sourceText) return;

    setIsSummarizing(true);
    setExplanationText("");
    stopSpeaking();

    try {
      const res = await tutorApi.ask(
        "Please provide a clear and concise 2-sentence summary of this text for a student.",
        sourceText
      );
      const sum = res.answer || "Could not generate summary.";
      setSummaryText(sum);
      speak(sum);
    } catch {
      const fallbackSum = sourceText.slice(0, 180) + "...";
      setSummaryText(fallbackSum);
      speak(fallbackSum);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExplain = async () => {
    const sourceText = ocrText || lastSpokenResponse || displayNarration;
    if (!sourceText) return;

    setIsExplaining(true);
    setSummaryText("");
    stopSpeaking();

    try {
      const res = await tutorApi.ask(
        "Explain the key concepts and meaning of this study material clearly and simply.",
        sourceText
      );
      const exp = res.answer || "Could not generate explanation.";
      setExplanationText(exp);
      speak(exp);
    } catch {
      setExplanationText("Explanation unavailable right now.");
    } finally {
      setIsExplaining(false);
    }
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
              {hasOcr ? "OCR Document Context" : hasVoice ? "Voice Dialogue" : "Live Spatial Awareness"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              {hasOcr
                ? `${activeContext?.ocrResult?.word_count || 0} words extracted from camera`
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
            onClick={() => handleReadAloud(summaryText || explanationText || ocrText || lastSpokenResponse || displayNarration)}
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

          <GlassButton
            variant="secondary"
            onClick={handleExplain}
            disabled={isExplaining || (!ocrText && !lastSpokenResponse && detections.length === 0)}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
          >
            <Sparkles size={14} color="var(--accent-primary)" />
            <span>{isExplaining ? "Explaining..." : "Explain"}</span>
          </GlassButton>

          <GlassButton
            variant="secondary"
            onClick={handleSummarize}
            disabled={isSummarizing || (!ocrText && !lastSpokenResponse && detections.length === 0)}
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
          >
            <BookOpen size={14} color="var(--accent-amber)" />
            <span>{isSummarizing ? "Summarizing..." : "Summarize"}</span>
          </GlassButton>
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

        {/* Display Explanation if triggered */}
        {explanationText ? (
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Explanation
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
              {explanationText}
            </div>
          </div>
        ) : summaryText ? (
          /* Display Summary if triggered */
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Summary
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
              {summaryText}
            </div>
          </div>
        ) : hasOcr ? (
          /* Display OCR Text from Camera */
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-amber)", textTransform: "uppercase" }}>
                Captured Textbook Text
              </span>
              {activeContext?.ocrResult?.confidence_score > 0 && (
                <span className="glass-pill success" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                  Confidence: {activeContext.ocrResult.confidence_score}%
                </span>
              )}
            </div>
            <div
              tabIndex={0}
              aria-label="Recognized text from camera"
              style={{
                fontSize: "0.95rem",
                color: "var(--text-primary)",
                lineHeight: 1.6,
                maxHeight: "220px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {ocrText}
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
          /* Fallback: Live Spatial Narration */
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "0.2rem", textTransform: "uppercase" }}>
              Spatial Narration
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
              {displayNarration}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
