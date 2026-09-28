import React from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { useVoice } from "../context/VoiceContext";
import {
  Sun,
  Moon,
  Type,
  Volume2,
  Gauge,
  Sliders,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import GlassButton from "../components/glass/GlassButton";

export default function Settings() {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    speechRate,
    setSpeechRate,
    speechVolume,
    setSpeechVolume,
    reducedMotion,
    setReducedMotion,
    announce,
  } = useAccessibility();

  const { speak } = useVoice();

  const handleTestSpeech = () => {
    const sample = "This is a speech synthesis test at your chosen volume and rate.";
    speak(sample);
    announce(sample);
  };

  const handleResetDefaults = () => {
    setTheme("white");
    setFontSize("normal");
    setSpeechRate(1.0);
    setSpeechVolume(1.0);
    setReducedMotion(false);
    announce("Accessibility settings restored to defaults.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "880px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 750, margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
            Accessibility & Preferences
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Customize display contrast, auditory feedback, and interaction speed
          </p>
        </div>

        <GlassButton
          variant="secondary"
          onClick={handleResetDefaults}
          style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
        >
          <RotateCcw size={15} />
          <span>Reset Defaults</span>
        </GlassButton>
      </div>

      {/* 1. Theme Selection: White Mode vs OLED Black Mode */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
          <Sun size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
            Visual Color Theme
          </h2>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Choose between clean Apple White Mode and pure deep OLED Black Mode.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {/* White Mode Card */}
          <button
            onClick={() => setTheme("white")}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: theme === "white" ? "#f8fafc" : "var(--glass-bg-subtle)",
              color: "#0f172a",
              border: `2px solid ${theme === "white" ? "var(--accent-primary)" : "var(--glass-border-subtle)"}`,
              cursor: "pointer",
              textAlign: "left",
              transition: "all var(--motion-fast)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <Sun size={22} color="#0071e3" />
              {theme === "white" && (
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0071e3" }}>ACTIVE</span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>White Mode</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>
              Frosted glass with crisp daylight clarity
            </div>
          </button>

          {/* OLED Black Mode Card */}
          <button
            onClick={() => setTheme("black")}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: theme === "black" ? "#09090b" : "var(--glass-bg-subtle)",
              color: "#ffffff",
              border: `2px solid ${theme === "black" ? "var(--accent-primary)" : "var(--glass-border-subtle)"}`,
              cursor: "pointer",
              textAlign: "left",
              transition: "all var(--motion-fast)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <Moon size={22} color="#60a5fa" />
              {theme === "black" && (
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#60a5fa" }}>ACTIVE</span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>OLED Black Mode</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              True #000000 black surface with zero glare
            </div>
          </button>
        </div>
      </div>

      {/* 2. Typography Scaling */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
          <Type size={20} color="var(--accent-green)" />
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
            Font Size Scaling
          </h2>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Dynamically scale root typography for low-vision comfort.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { key: "normal", label: "Standard (100%)", desc: "16px base font" },
            { key: "large", label: "Large (115%)", desc: "18px comfortable scale" },
            { key: "xlarge", label: "Extra Large (130%)", desc: "21px maximum legibility" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFontSize(f.key)}
              style={{
                flex: 1,
                minWidth: "160px",
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: fontSize === f.key ? "var(--glass-bg-base)" : "var(--glass-bg-subtle)",
                border: `2px solid ${fontSize === f.key ? "var(--accent-green)" : "var(--glass-border-subtle)"}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 650, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                {f.label}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
                {f.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Speech Rate & Volume Controls */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Volume2 size={20} color="var(--accent-amber)" />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
              Auditory Feedback & Narration
            </h2>
          </div>
          <GlassButton
            variant="secondary"
            onClick={handleTestSpeech}
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
          >
            <Volume2 size={14} />
            <span>Test Voice</span>
          </GlassButton>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Fine-tune the voice speed and output volume for text-to-speech feedback.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Speech Rate Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Speech Speed</span>
              <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-amber)", cursor: "pointer" }}
              aria-label="Speech speed rate"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
              <span>0.6x (Slow)</span>
              <span>1.0x (Standard)</span>
              <span>1.8x (Fast)</span>
            </div>
          </div>

          {/* Speech Volume Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Speech Volume</span>
              <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                {Math.round(speechVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={speechVolume}
              onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent-amber)", cursor: "pointer" }}
              aria-label="Speech volume"
            />
          </div>
        </div>
      </div>

      {/* 4. Motion & Animation */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 650, fontSize: "1rem", color: "var(--text-primary)" }}>
              Reduced Motion
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Disable background shader shifts and floating animations for vestibular comfort
            </div>
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "var(--accent-primary)" }}
              aria-label="Toggle reduced motion"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
