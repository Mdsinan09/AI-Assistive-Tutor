import React from "react";
import { useVoice } from "../../context/VoiceContext";
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Keyboard, AlertCircle, Sparkles } from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function VoiceHero() {
  const {
    voiceState,
    transcript,
    interimTranscript,
    lastAction,
    errorMessage,
    startListening,
    stopListening,
    stopSpeaking,
    repeatLast,
    isSpeaking,
    setIsPromptOpen,
  } = useVoice();

  const isListening =
    voiceState === "listening" ||
    voiceState === "requesting_permission" ||
    voiceState === "LISTENING";
  const isSpeakingState =
    voiceState === "responding" ||
    voiceState === "speaking" ||
    voiceState === "SPEAKING" ||
    isSpeaking;
  const isProcessing =
    voiceState === "processing" ||
    voiceState === "processing_speech" ||
    voiceState === "thinking" ||
    voiceState === "PROCESSING";
  const isPermissionDenied = voiceState === "permission_denied";
  const isNoSpeech = voiceState === "no_speech";
  const isError =
    voiceState === "error" ||
    voiceState === "network_error" ||
    voiceState === "recognition_error" ||
    voiceState === "unsupported_browser";

  const getStatusBadge = () => {
    if (voiceState === "requesting_permission") {
      return { text: "Requesting microphone permission...", color: "var(--accent-amber)", pulse: true };
    }
    if (isListening) {
      return { text: "Listening to your voice... (Tap to finish)", color: "var(--accent-green, #10b981)", pulse: true };
    }
    if (isProcessing) {
      return { text: "Understanding & routing AI query...", color: "var(--accent-amber)", pulse: true };
    }
    if (isSpeakingState) {
      return { text: "Speaking response aloud...", color: "var(--accent-green)", pulse: true };
    }
    if (isPermissionDenied) {
      return { text: "Microphone blocked (Click lock in address bar)", color: "var(--accent-rose)", pulse: false };
    }
    if (isNoSpeech) {
      return { text: "No words heard. Tap to try again.", color: "var(--accent-amber)", pulse: false };
    }
    if (isError) {
      return { text: errorMessage || "Voice error occurred", color: "var(--accent-rose)", pulse: false };
    }
    return { text: "Voice Assistant Ready (Press 'V' to speak)", color: "var(--text-tertiary)", pulse: false };
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
          onClick={() => (isListening ? stopListening() : startListening())}
          aria-label={isListening ? "Finish speaking and submit" : "Start speaking voice command. Shortcut: V"}
          style={{
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            background: isListening
              ? "var(--accent-green, #10b981)"
              : isSpeakingState
              ? "var(--accent-green)"
              : "var(--glass-bg-base)",
            border: `3px solid ${
              isListening
                ? "var(--accent-green, #10b981)"
                : isSpeakingState
                ? "var(--accent-green)"
                : "var(--glass-border-subtle)"
            }`,
            color: isListening || isSpeakingState ? "#ffffff" : "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: isListening
              ? "0 0 35px rgba(16, 185, 129, 0.75)"
              : isSpeakingState
              ? "0 0 30px var(--accent-green)"
              : "var(--shadow-elevation-low)",
            transition: "all var(--motion-normal)",
          }}
        >
          {isListening ? (
            <Mic size={36} className="animate-pulse" />
          ) : isSpeakingState ? (
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
              height: isListening || isSpeakingState ? `${height}px` : "6px",
              backgroundColor: isListening
                ? "var(--accent-green, #10b981)"
                : isSpeakingState
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

      {/* Recognized Transcript or Error (Priority 2 Live Transcription) */}
      <div style={{ maxWidth: "680px", zIndex: 5, width: "100%" }}>
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
        ) : transcript || interimTranscript ? (
          <div
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.5,
              padding: "0.6rem 1.1rem",
              backgroundColor: "var(--glass-bg-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--glass-border-subtle)",
              textAlign: "center",
            }}
          >
            {transcript && (
              <span style={{ fontWeight: 650, color: "var(--text-primary)" }}>
                "{transcript}"{" "}
              </span>
            )}
            {interimTranscript && (
              <span style={{ fontStyle: "italic", color: "var(--accent-blue, #60a5fa)", opacity: 0.9 }}>
                {interimTranscript}
                <span className="animate-pulse">|</span>
              </span>
            )}
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
          variant={isListening ? "primary" : "secondary"}
          onClick={() => (isListening ? stopListening() : startListening())}
          style={{
            padding: "0.45rem 0.9rem",
            fontSize: "0.85rem",
            background: isListening ? "var(--accent-green, #10b981)" : undefined,
            color: isListening ? "#fff" : undefined,
          }}
        >
          <Mic size={15} />
          <span>{isListening ? "Finish & Submit" : "Speak (V)"}</span>
        </GlassButton>

        <GlassButton
          variant="secondary"
          onClick={stopSpeaking}
          disabled={!isSpeakingState}
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
