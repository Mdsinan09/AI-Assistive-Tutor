import React from "react";
import { Sparkles, Eye, FileText, Bot, Volume2, Cpu, Database, Heart, Layers } from "lucide-react";

export default function About() {
  const architectures = [
    {
      title: "FieldNet V3 Spatial Vision",
      icon: Eye,
      color: "var(--accent-primary)",
      tech: "PyTorch 2.x • ResNet34 • Custom Anchor-Free Heads",
      details:
        "Trained on collegiate classroom and desk environments. Predicts spatial heatmaps, bounding box coordinates, and class IDs with peak kernel decode and 0.60 IoU non-maximum suppression. Automatically maps detected objects into Left, Center, and Right desk spatial zones.",
    },
    {
      title: "OCR Document Digitization",
      icon: FileText,
      color: "var(--accent-green)",
      tech: "Tesseract v5 • OpenCV CLAHE • Minimum Area Deskew",
      details:
        "Corrects text skew (-30° to +30°), calculates Laplacian blur variance and mean brightness, normalizes glyph scales, and applies adaptive thresholding with Otsu fallback to extract printed textbook pages into speech-ready text.",
    },
    {
      title: "Gemini 1.5 Multimodal Tutor",
      icon: Bot,
      color: "var(--accent-amber)",
      tech: "Google Gemini 1.5 Flash • Contextual Prompting",
      details:
        "Academic companion agent that accepts both raw student inquiries and OCR-extracted textbook excerpts. Formulates concise, pedagogical explanations, step-by-step math breakdowns, and conceptual analogies.",
    },
    {
      title: "Tactile Voice & Intent Router",
      icon: Volume2,
      color: "var(--accent-rose)",
      tech: "Web Speech Recognition & Synthesis • Hotkey Matrix",
      details:
        "Full hands-free conversational interface with single-letter accessibility hotkeys (V: Voice, P: Pause, S: Silence, R: Repeat, ?: Help) and fallback modal prompt for maximum accessibility compliance.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "960px" }}>
      {/* Title */}
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 12px",
            borderRadius: "999px",
            backgroundColor: "var(--accent-primary-subtle)",
            color: "var(--accent-primary)",
            fontSize: "0.8rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          <Sparkles size={14} /> College Major Engineering Project
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>
          AI Assistive Tutor for Visually Impaired Students
        </h1>
        <p style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          An integrated multimodal system uniting real-time PyTorch computer vision, high-precision document OCR,
          gemini reasoning, and bidirectional speech synthesis to empower independent collegiate learning.
        </p>
      </div>

      {/* Engineering Pillars */}
      <div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 750, marginBottom: "1rem", color: "var(--text-primary)" }}>
          Deep-Tech Architecture & Pipeline
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {architectures.map((arch, idx) => {
            const Icon = arch.icon;
            return (
              <div
                key={idx}
                className="glass-card"
                style={{
                  padding: "1.5rem",
                  display: "flex",
                  gap: "1.25rem",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    backgroundColor: "var(--glass-bg-subtle)",
                    border: "1px solid var(--glass-border-subtle)",
                    color: arch.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                      {arch.title}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                        backgroundColor: "var(--glass-bg-subtle)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {arch.tech}
                    </span>
                  </div>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {arch.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accessibility Mission Banner */}
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderLeft: "4px solid var(--accent-primary)",
        }}
      >
        <Heart size={28} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
            Universal Classroom Inclusivity
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "0.2rem", lineHeight: 1.5 }}>
            Designed in accordance with WCAG 2.2 Level AAA contrast principles, screen-reader live regions,
            focus management, and zero mouse dependency for low-vision and blind learners.
          </div>
        </div>
      </div>
    </div>
  );
}
