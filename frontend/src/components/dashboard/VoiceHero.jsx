import React from "react";
import { useVoice } from "../../context/VoiceContext";
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Keyboard, AlertCircle, Sparkles } from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function VoiceHero() {
  const {
    voiceState,
    transcript,
    lastAction,
    errorMessage,
    startListening,
    stopSpeaking,
    repeatLast,
    setIsPromptOpen,
  } = useVoice();

  const isListening = voiceState === "LISTENING";
  const isSpeaking = voiceState === "SPEAKING";
  const isProcessing = voiceState === "PROCESSING";

  const getStatusBadge = () => {
    switch (voiceState) {
      case "LISTENING":
        return { text: "Listening to your voice...", color: "var(--accent-primary)", pulse: true };
      case "PROCESSING":
        return { text: "Analyzing query & AI intent...", color: "var(--accent-amber)", pulse: true };
      case "SPEAKING":
        return { text: "Speaking response aloud...", color: "var(--accent-green)", pulse: true };
      case "ERROR":
        return { text: "Voice error occurred", color: "var(--accent-rose)", pulse: false };
      default:
        return { text: "Voice Assistant Ready (Press 'V' to speak)", color: "var(--text-tertiary)", pulse: false };
    }
  };

  const status = getStatusBadge();

  return (
    <div
      className="glass-panel"
      style={{
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "1.25rem",
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-xl)",
      }}
    >
      {/* Background Ambient Orb */}
      <div
        className="ambient-glow"
        style={{
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "300px",
          height: "140px",
          background: isListening
            ? "radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)"
            : isSpeaking
            ? "radial-gradient(circle, var(--accent-green) 0%, transparent 70%)"
            : "radial-gradient(circle, var(--accent-primary-subtle) 0%, transparent 70%)",
          transition: "all var(--motion-normal)",
        }}
      />

      {/* Central Animated Mic Orb */}
      <div style={{ position: "relative", zIndex: 5 }}>
        <button
          onClick={() => startListening()}
          aria-label={isListening ? "Stop listening" : "Start speaking voice command. Shortcut: V"}
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: isListening
              ? "var(--accent-primary)"
              : isSpeaking
              ? "var(--accent-green)"
              : "var(--glass-bg-base)",
            border: `3px solid ${
              isListening ? "var(--accent-primary)" : isSpeaking ? "var(--accent-green)" : "var(--glass-border-subtle)"
            }`,
            color: isListening || isSpeaking ? "#ffffff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: isListening
              ? "0 0 35px var(--accent-primary)"
              : isSpeaking
              ? "0 0 30px var(--accent-green)"
              : "var(--shadow-elevation-low)",
            transition: "all var(--motion-normal)",
          }}
        >
          {isListening ? (
            <Mic size={36} className="animate-pulse" />
          ) : isSpeaking ? (
            <Volume2 size={36} className="animate-bounce" />
          ) : (
            <Mic size={36} />
          )}
        </button>
      </div>

      {/* Dynamic Waveform Bars */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          height: "28px",
          zIndex: 5,
        }}
        aria-hidden="true"
      >
        {[20, 36, 16, 44, 28, 48, 22, 40, 18, 32].map((height, idx) => (
          <span
            key={idx}
            style={{
              width: "4px",
              height: isListening || isSpeaking ? `${height}px` : "6px",
              backgroundColor: isListening
                ? "var(--accent-primary)"
                : isSpeaking
                ? "var(--accent-green)"
                : "var(--glass-border-subtle)",
              borderRadius: "999px",
              transition: "height 0.18s ease-in-out",
            }}
          />
        ))}
      </div>

      {/* Voice Status Badge */}
      <div style={{ zIndex: 5 }}>
        <div
          className="glass-pill"
          style={{
            fontSize: "0.85rem",
            color: status.color,
            borderColor: status.color,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: status.color,
              display: "inline-block",
            }}
          />
          <span>{status.text}</span>
        </div>
      </div>

      {/* Recognized Transcript or Error */}
      <div style={{ maxWidth: "680px", zIndex: 5 }}>
        {errorMessage ? (
          <div
            style={{
              color: "var(--accent-rose)",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        ) : transcript ? (
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 550,
              color: "var(--text-primary)",
              lineHeight: 1.5,
              padding: "0.5rem 1rem",
              backgroundColor: "var(--glass-bg-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--glass-border-subtle)",
            }}
          >
            "{transcript}"
          </div>
        ) : (
          <div style={{ fontSize: "0.92rem", color: "var(--text-secondary)" }}>
            Try asking: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>"What is on my desk?"</span> or{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>"Read this paragraph"</span>
          </div>
        )}
      </div>

      {/* Voice Controls Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexWrap: "wrap",
          justifyContent: "center",
          zIndex: 5,
        }}
      >
        <GlassButton
          variant="secondary"
          onClick={() => startListening()}
          style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
        >
          <Mic size={15} />
          <span>{isListening ? "Stop Listening" : "Speak (V)"}</span>
        </GlassButton>

        <GlassButton
          variant="secondary"
          onClick={stopSpeaking}
          disabled={!isSpeaking}
          style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
        >
          <VolumeX size={15} />
          <span>Silence (S)</span>
        </GlassButton>

        <GlassButton
          variant="secondary"
          onClick={repeatLast}
          style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
        >
          <RotateCcw size={15} />
          <span>Repeat (R)</span>
        </GlassButton>

        <GlassButton
          variant="secondary"
          onClick={() => setIsPromptOpen(true)}
          style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
        >
          <Keyboard size={15} />
          <span>Type Command</span>
        </GlassButton>
      </div>
    </div>
  );
}
