import React, { useState, useEffect } from "react";
import { statisticsApi } from "../api/statisticsApi";
import { useVoice } from "../context/VoiceContext";
import { useAccessibility } from "../context/AccessibilityContext";
import {
  BarChart3,
  Eye,
  FileText,
  Bot,
  Zap,
  RefreshCw,
  Volume2,
  TrendingUp,
  Activity,
} from "lucide-react";
import GlassButton from "../components/glass/GlassButton";

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { speak } = useVoice();
  const { announce } = useAccessibility();

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await statisticsApi.getStatistics();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
      setError(err.message || "Failed to load assistive statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleReadAloud = () => {
    if (!stats) return;
    const summary = `Assistive Learning Analytics: Total interactions recorded: ${stats.total_actions}. Environmental detections: ${stats.detections_count}. OCR documents processed: ${stats.ocr_count}. AI Tutor questions answered: ${stats.qa_count}.`;
    speak(summary);
    announce(summary);
  };

  const kpis = [
    {
      title: "Total Actions",
      value: stats?.total_actions ?? 0,
      icon: Activity,
      color: "var(--accent-primary)",
      desc: "Combined assistive telemetry across all modules",
    },
    {
      title: "Vision Detections",
      value: stats?.detections_count ?? 0,
      icon: Eye,
      color: "var(--accent-green)",
      desc: "Obstacles and study items classified by FieldNet",
    },
    {
      title: "OCR Readings",
      value: stats?.ocr_count ?? 0,
      icon: FileText,
      color: "var(--accent-amber)",
      desc: "Textbook pages digitized by Tesseract",
    },
    {
      title: "Tutor Dialogues",
      value: stats?.qa_count ?? 0,
      icon: Bot,
      color: "var(--accent-rose)",
      desc: "Coursework explanations answered by Gemini",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 750, margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
            Assistive Analytics & Insights
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Real-time tracking from SQLite database telemetry
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <GlassButton
            variant="secondary"
            onClick={handleReadAloud}
            disabled={!stats}
            style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
          >
            <Volume2 size={15} />
            <span>Read Summary</span>
          </GlassButton>

          <GlassButton
            variant="primary"
            onClick={loadStats}
            disabled={loading}
            style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </GlassButton>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 650, color: "var(--text-secondary)" }}>
                  {kpi.title}
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "var(--glass-bg-subtle)",
                    color: kpi.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} />
                </div>
              </div>

              <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                {loading ? "..." : kpi.value.toLocaleString()}
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                {kpi.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Frequent Detected Objects & Session Stats */}
      <div className="grid-2">
        {/* Frequent Objects */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <TrendingUp size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
              Top Detected Workspace Objects
            </h2>
          </div>

          {!stats?.top_objects || stats.top_objects.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
              No objects detected yet. Start the camera on Dashboard to populate.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {stats.top_objects.map((obj, i) => {
                const maxCount = stats.top_objects[0]?.count || 1;
                const percentage = Math.round((obj.count / maxCount) * 100);

                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {obj.label.replace(/_/g, " ")}
                      </span>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 550 }}>
                        {obj.count} {obj.count === 1 ? "time" : "times"}
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        backgroundColor: "var(--glass-bg-subtle)",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: "100%",
                          backgroundColor: "var(--accent-primary)",
                          borderRadius: "999px",
                          transition: "width var(--motion-normal)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Telemetry & Hardware Profile */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
            <Zap size={20} color="var(--accent-amber)" />
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
              System Health & Pipeline
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--glass-border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Object Detection Engine</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>FieldNet V3 (ResNet34)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--glass-border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>OCR Text Engine</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Tesseract v5 + CLAHE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--glass-border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>AI Tutor Agent</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Gemini 1.5 Flash</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--glass-border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Speech Synthesis</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Web Speech API / Native</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0" }}>
              <span style={{ color: "var(--text-secondary)" }}>Database Storage</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>SQLite3 (app.db)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
