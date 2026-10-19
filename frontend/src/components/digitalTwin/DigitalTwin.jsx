import React from "react";
import { Compass, MapPin, Volume2, Sparkles, CheckCircle2, User } from "lucide-react";
import { useVoice } from "../../context/VoiceContext";

/**
 * Unified Spatial Environment Overview
 * Replaces the obsolete 3-zone desk layout with:
 * 1. An organic 2D Top-Down Spatial Field Map plotting actual detected objects
 * 2. A unified list of detected items with precise spatial bearings (Left, Center, Right)
 * 3. Accessibility voice triggers for visually impaired students
 */
export default function DigitalTwin({ detections = [], narration = "" }) {
  const { speak } = useVoice();

  const handleSpeakItem = (item) => {
    const label = item.label ? item.label.replace(/_/g, " ") : "object";
    const pos = item.position || "center";
    const posDesc =
      pos === "left"
        ? "to your left"
        : pos === "right"
        ? "to your right"
        : "directly in front of you";
    const conf = item.confidence ? Math.round(item.confidence * 100) : 80;
    speak(`${label} ${posDesc}, ${conf} percent confidence.`);
  };

  const handleSpeakOverview = () => {
    if (narration && narration.trim()) {
      speak(narration);
    } else if (detections.length === 0) {
      speak("Your surroundings appear clear. No objects detected in front of you.");
    } else {
      const names = detections.map((d) => d.label.replace(/_/g, " ")).join(", ");
      speak(`Detected in your environment: ${names}.`);
    }
  };

  return (
    <section
      aria-label="Detected Environment and Spatial Overview"
      className="glass-panel"
      style={{
        padding: "1.25rem",
        borderRadius: "var(--radius-xl)",
        position: "relative",
        boxShadow: "var(--shadow-elevation-medium)",
      }}
    >
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
            <Compass size={18} />
          </div>
          <div>
            <h2
              style={{
                fontWeight: 650,
                fontSize: "1.05rem",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Detected Environment
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
              Spatial Overview & 2D Environment Map
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            className="glass-pill primary"
            style={{
              fontSize: "0.75rem",
              fontWeight: 650,
              padding: "0.3rem 0.65rem",
              borderRadius: "999px",
            }}
          >
            {detections.length} {detections.length === 1 ? "Object Detected" : "Objects Detected"}
          </div>

          <button
            onClick={handleSpeakOverview}
            className="glass-btn"
            style={{
              padding: "0.4rem 0.75rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              borderRadius: "999px",
              cursor: "pointer",
            }}
            title="Read environment spatial overview aloud"
            aria-label="Announce surrounding objects aloud"
          >
            <Volume2 size={15} />
            <span>Announce Environment</span>
          </button>
        </div>
      </div>

      {/* 2D Spatial Environment Map (Radar-Style Top-Down Projection) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "170px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "rgba(10, 15, 25, 0.75)",
          border: "1px solid var(--glass-border-subtle)",
          overflow: "hidden",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      >
        {/* Spatial Field Lines & FOV Arc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at bottom center, rgba(0, 113, 227, 0.12) 0%, rgba(0,0,0,0) 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Subtle Perspective Grid Lines */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "50%",
            width: "1px",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            transform: "translateX(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "50%",
            width: "180px",
            height: "180px",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
            borderRadius: "50%",
            transform: "translate(-50%, 50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "50%",
            width: "320px",
            height: "320px",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
            borderRadius: "50%",
            transform: "translate(-50%, 50%)",
          }}
        />

        {/* Left / Center / Right Ambient Labels */}
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            left: "1rem",
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Left
        </div>
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          In Front
        </div>
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "1rem",
            fontSize: "0.7rem",
            color: "var(--text-tertiary)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Right
        </div>

        {/* Plotted Spatial Object Nodes */}
        {detections.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              color: "var(--text-tertiary)",
              fontSize: "0.82rem",
              zIndex: 2,
            }}
          >
            <CheckCircle2 size={18} style={{ color: "var(--accent-green)", opacity: 0.8 }} />
            <span>Environment Clear — No obstacles detected</span>
          </div>
        ) : (
          detections.map((item, idx) => {
            // Determine X coordinate: left (15-30%), center (40-60%), right (70-85%)
            let plotX = 50;
            if (item.normalized_box && item.normalized_box.length === 4) {
              const [nx1, , nx2] = item.normalized_box;
              const ncx = (nx1 + nx2) / 2;
              plotX = Math.max(10, Math.min(90, Math.round(ncx * 100)));
            } else if (item.center && Array.isArray(item.center)) {
              plotX = Math.max(10, Math.min(90, Math.round(item.center[0] * 100)));
            } else if (item.position === "left") {
              plotX = 22 + (idx % 2) * 12;
            } else if (item.position === "right") {
              plotX = 78 - (idx % 2) * 12;
            } else {
              plotX = 48 + ((idx % 3) - 1) * 10;
            }

            // Determine Y coordinate (distance from observer): closer objects appear lower
            let plotY = 40;
            if (item.normalized_box && item.normalized_box.length === 4) {
              const [, ny1, , ny2] = item.normalized_box;
              const boxHeight = ny2 - ny1;
              // Larger bounding box = closer to camera = higher percentage Y from top
              plotY = Math.max(18, Math.min(75, Math.round(80 - boxHeight * 70)));
            } else {
              plotY = 35 + (idx % 3) * 15;
            }

            const isLeft = item.position === "left";
            const isRight = item.position === "right";
            const nodeColor = isLeft
              ? "var(--accent-green)"
              : isRight
              ? "var(--accent-amber)"
              : "var(--accent-primary)";

            return (
              <button
                key={item.id || idx}
                onClick={() => handleSpeakItem(item)}
                style={{
                  position: "absolute",
                  left: `${plotX}%`,
                  top: `${plotY}%`,
                  transform: "translate(-50%, -50%)",
                  background: "rgba(15, 23, 42, 0.88)",
                  border: `1.5px solid ${nodeColor}`,
                  borderRadius: "999px",
                  padding: "0.25rem 0.55rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#ffffff",
                  fontSize: "0.72rem",
                  fontWeight: 650,
                  cursor: "pointer",
                  boxShadow: `0 0 12px ${nodeColor}40`,
                  transition: "all var(--motion-fast)",
                  zIndex: 10,
                  whiteSpace: "nowrap",
                }}
                title={`Click to hear ${item.label}`}
                aria-label={`${item.label} ${item.position}`}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: nodeColor,
                  }}
                />
                <span>{item.label ? item.label.replace(/_/g, " ") : "Object"}</span>
              </button>
            );
          })
        )}

        {/* Student / Observer Anchor at Bottom Center */}
        <div
          style={{
            position: "absolute",
            bottom: "0.35rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "0.2rem 0.6rem",
            borderRadius: "999px",
            fontSize: "0.68rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            letterSpacing: "0.03em",
          }}
        >
          <User size={11} />
          <span>You (Observer Anchor)</span>
        </div>
      </div>

      {/* Unified Detected Objects List */}
      <div>
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 650,
            color: "var(--text-secondary)",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Surrounding Objects</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Tap object for spatial bearing
          </span>
        </div>

        {detections.length === 0 ? (
          <div
            style={{
              padding: "0.85rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--glass-bg-subtle)",
              border: "1px solid var(--glass-border-subtle)",
              textAlign: "center",
              fontSize: "0.85rem",
              color: "var(--text-tertiary)",
            }}
          >
            No objects currently in camera view.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {detections.map((item, idx) => {
              const pos = item.position || "center";
              const isLeft = pos === "left";
              const isRight = pos === "right";
              const posColor = isLeft
                ? "var(--accent-green)"
                : isRight
                ? "var(--accent-amber)"
                : "var(--accent-primary)";
              const posLabel = isLeft
                ? "On your Left"
                : isRight
                ? "On your Right"
                : "Directly in Front";

              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleSpeakItem(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--glass-bg-subtle)",
                    border: "1px solid var(--glass-border-subtle)",
                    borderLeft: `3px solid ${posColor}`,
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all var(--motion-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--glass-bg-base)";
                    e.currentTarget.style.transform = "translateX(2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--glass-bg-subtle)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                  title="Click to speak location"
                  aria-label={`${item.label} ${posLabel}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin size={15} style={{ color: posColor, flexShrink: 0 }} />
                    <div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 650,
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.label ? item.label.replace(/_/g, " ") : "Object"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        {posLabel}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      backgroundColor: "var(--glass-bg-base)",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      border: "1px solid var(--glass-border-subtle)",
                    }}
                  >
                    {item.confidence ? Math.round(item.confidence * 100) : 80}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
