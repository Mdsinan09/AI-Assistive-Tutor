import React from "react";
import { Eye, BookOpen, Bot, ArrowRight, Zap } from "lucide-react";

export default function FeatureCards({ onTriggerScan, onTriggerOcr, onOpenTutor }) {
  const cards = [
    {
      title: "FieldNet V3 Vision",
      tag: "Spatial Awareness",
      desc: "Instant obstacle identification and 2D spatial desk twin mapping with voice feedback.",
      icon: Eye,
      color: "var(--accent-primary)",
      action: onTriggerScan,
      actionLabel: "Analyze View",
    },
    {
      title: "Document OCR",
      tag: "Textbook Reading",
      desc: "Adaptive CLAHE thresholding & deskewing to read print documents and books aloud.",
      icon: BookOpen,
      color: "var(--accent-green)",
      action: onTriggerOcr,
      actionLabel: "Scan Page",
    },
    {
      title: "Gemini AI Tutor",
      tag: "Academic Reasoning",
      desc: "Voice-guided multimodal tutoring for coursework questions, textbook explanations, and hints.",
      icon: Bot,
      color: "var(--accent-amber)",
      action: onOpenTutor,
      actionLabel: "Ask Tutor",
    },
  ];

  return (
    <div className="grid-3" style={{ marginTop: "1rem" }}>
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="glass-card interactive"
            style={{
              padding: "1.35rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "1rem",
              cursor: "pointer",
            }}
            onClick={card.action}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.85rem",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    backgroundColor: "var(--glass-bg-subtle)",
                    border: "1px solid var(--glass-border-subtle)",
                    color: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={20} />
                </div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: card.color,
                    backgroundColor: "var(--glass-bg-subtle)",
                    padding: "3px 8px",
                    borderRadius: "999px",
                  }}
                >
                  {card.tag}
                </span>
              </div>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.35rem 0" }}>
                {card.title}
              </h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.45, margin: 0 }}>
                {card.desc}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: card.color,
                paddingTop: "0.5rem",
                borderTop: "1px solid var(--glass-border-subtle)",
              }}
            >
              <span>{card.actionLabel}</span>
              <ArrowRight size={14} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
