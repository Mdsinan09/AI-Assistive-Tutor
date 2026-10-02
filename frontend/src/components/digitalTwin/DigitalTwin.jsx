import React from "react";
import { Layers, MapPin, Volume2, Sparkles, CheckCircle2 } from "lucide-react";
import { useVoice } from "../../context/VoiceContext";

export default function DigitalTwin({ detections = [], narration = "" }) {
  const { speak } = useVoice();

  const leftItems = detections.filter((d) => d.position === "left");
  const centerItems = detections.filter((d) => d.position === "center");
  const rightItems = detections.filter((d) => d.position === "right");

  const handleSpeakItem = (item) => {
    speak(`${item.label.replace(/_/g, " ")} located in the ${item.position} area of your desk.`);
  };

  const handleSpeakZone = (zoneName, items) => {
    if (items.length === 0) {
      speak(`The ${zoneName} zone of your desk is clear.`);
    } else {
      const names = items.map((i) => i.label.replace(/_/g, " ")).join(", ");
      speak(`The ${zoneName} zone contains: ${names}.`);
    }
  };

  const renderZoneCard = (title, items, zoneKey, accentColor) => (
    <div
      style={{
        flex: "1 1 140px",
        minWidth: "120px",
        backgroundColor: "var(--glass-bg-subtle)",
        border: `1px solid var(--glass-border-subtle)`,
        borderTop: `3px solid ${accentColor}`,
        borderRadius: "var(--radius-md)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div style={{ fontWeight: 650, fontSize: "0.95rem", color: "var(--text-primary)" }}>
            {title}
          </div>
          <button
            onClick={() => handleSpeakZone(title, items)}
            aria-label={`Hear summary for ${title}`}
            className="btn-icon"
            style={{
              padding: "4px",
              color: accentColor,
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
            title="Read zone aloud"
          >
            <Volume2 size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: "1.5rem 0.5rem",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "0.85rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <CheckCircle2 size={20} style={{ opacity: 0.5 }} />
            <span>Zone Clear</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSpeakItem(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--glass-bg-base)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--glass-border-subtle)",
                  cursor: "pointer",
                  transition: "all var(--motion-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = accentColor;
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--glass-border-subtle)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
                title="Click to announce position"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={14} style={{ color: accentColor }} />
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.label.replace(/_/g, " ")}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    backgroundColor: "var(--glass-bg-subtle)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--text-tertiary)",
          borderTop: "1px solid var(--glass-border-subtle)",
          paddingTop: "0.4rem",
        }}
      >
        {items.length} {items.length === 1 ? "item detected" : "items detected"}
      </div>
    </div>
  );

  return (
    <div className="glass-panel" style={{ padding: "1.25rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "var(--accent-primary-subtle)",
              color: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 650, fontSize: "1.05rem", color: "var(--text-primary)" }}>
              Desk Digital Twin
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              2D Spatial Classroom Workspace Map
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="glass-pill primary" style={{ fontSize: "0.75rem" }}>
            {detections.length} Total Objects
          </div>
          {narration && (
            <button
              onClick={() => speak(narration)}
              className="glass-btn"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
              title="Hear desk spatial overview"
            >
              <Volume2 size={15} />
              <span>Announce Layout</span>
            </button>
          )}
        </div>
      </div>

      {/* Desk Schematic: Left | Center | Right */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {renderZoneCard("Left Desk", leftItems, "left", "var(--accent-green)")}
        {renderZoneCard("Center Workspace", centerItems, "center", "var(--accent-primary)")}
        {renderZoneCard("Right Desk", rightItems, "right", "var(--accent-amber)")}
      </div>

      {/* User Student Desk Anchor Footprint */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.6rem",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "var(--glass-bg-subtle)",
          textAlign: "center",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          border: "1px dashed var(--glass-border-subtle)",
        }}
      >
        ▼ Student Seating Position & Keyboard Anchor ▼
      </div>
    </div>
  );
}
