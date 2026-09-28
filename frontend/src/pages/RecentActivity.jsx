import React, { useState, useEffect } from "react";
import { activityApi } from "../api/activityApi";
import { useAccessibility } from "../context/AccessibilityContext";
import {
  History,
  Eye,
  FileText,
  Bot,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  Filter,
} from "lucide-react";
import GlassButton from "../components/glass/GlassButton";

export default function RecentActivity() {
  const [historyData, setHistoryData] = useState({ detections: [], ocr_history: [], qa_history: [] });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'detection', 'ocr', 'qa'
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const { announce } = useAccessibility();

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await activityApi.getHistory();
      setHistoryData(data || { detections: [], ocr_history: [], qa_history: [] });
    } catch (err) {
      console.error("Failed to load activity history:", err);
      setError(err.message || "Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    try {
      await activityApi.clearHistory();
      setHistoryData({ detections: [], ocr_history: [], qa_history: [] });
      setConfirmClear(false);
      announce("Activity history successfully cleared.");
    } catch (err) {
      setError("Failed to clear activity records.");
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(historyData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `assistive_tutor_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    announce("Activity history exported as JSON file.");
  };

  // Compile unified timeline
  const timelineItems = [
    ...(historyData.detections || []).map((d) => ({
      id: `det-${d.id}`,
      rawId: d.id,
      type: "detection",
      title: `Detected: ${d.label?.replace(/_/g, " ")}`,
      detail: `Confidence score: ${(d.confidence * 100).toFixed(0)}%`,
      timestamp: d.timestamp || "Recent",
    })),
    ...(historyData.ocr_history || []).map((o) => ({
      id: `ocr-${o.id}`,
      rawId: o.id,
      type: "ocr",
      title: "Scanned Document Page",
      detail: o.extracted_text?.slice(0, 180) + (o.extracted_text?.length > 180 ? "..." : ""),
      timestamp: o.timestamp || "Recent",
    })),
    ...(historyData.qa_history || []).map((q) => ({
      id: `qa-${q.id}`,
      rawId: q.id,
      type: "qa",
      title: `Question: ${q.question}`,
      detail: `Answer: ${q.answer?.slice(0, 180)}${q.answer?.length > 180 ? "..." : ""}`,
      timestamp: q.timestamp || "Recent",
    })),
  ].sort((a, b) => b.rawId - a.rawId);

  const filteredItems = timelineItems.filter((item) => {
    if (activeFilter === "all") return true;
    return item.type === activeFilter;
  });

  const getIconForType = (type) => {
    switch (type) {
      case "detection":
        return <Eye size={16} color="var(--accent-green)" />;
      case "ocr":
        return <FileText size={16} color="var(--accent-amber)" />;
      case "qa":
        return <Bot size={16} color="var(--accent-rose)" />;
      default:
        return <Clock size={16} />;
    }
  };

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
            Recent Activity Log
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Chronological log of spatial scans, OCR extractions, and tutor consultations
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <GlassButton
            variant="secondary"
            onClick={handleExportJson}
            disabled={timelineItems.length === 0}
            style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
          >
            <Download size={15} />
            <span>Export JSON</span>
          </GlassButton>

          {confirmClear ? (
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <GlassButton
                variant="primary"
                onClick={handleClearHistory}
                style={{ padding: "0.5rem 0.8rem", fontSize: "0.85rem", backgroundColor: "var(--accent-rose)" }}
              >
                Confirm Delete
              </GlassButton>
              <GlassButton
                variant="secondary"
                onClick={() => setConfirmClear(false)}
                style={{ padding: "0.5rem 0.6rem", fontSize: "0.85rem" }}
              >
                Cancel
              </GlassButton>
            </div>
          ) : (
            <GlassButton
              variant="secondary"
              onClick={() => setConfirmClear(true)}
              disabled={timelineItems.length === 0}
              style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem", color: "var(--accent-rose)" }}
            >
              <Trash2 size={15} />
              <span>Clear Log</span>
            </GlassButton>
          )}

          <GlassButton
            variant="secondary"
            onClick={loadHistory}
            disabled={loading}
            style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </GlassButton>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {[
          { key: "all", label: `All (${timelineItems.length})` },
          { key: "detection", label: `Detections (${historyData.detections?.length || 0})` },
          { key: "ocr", label: `OCR (${historyData.ocr_history?.length || 0})` },
          { key: "qa", label: `Tutor Q&A (${historyData.qa_history?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: activeFilter === tab.key ? 650 : 500,
              backgroundColor: activeFilter === tab.key ? "var(--accent-primary)" : "var(--glass-bg-subtle)",
              color: activeFilter === tab.key ? "#ffffff" : "var(--text-secondary)",
              border: `1px solid ${activeFilter === tab.key ? "transparent" : "var(--glass-border-subtle)"}`,
              cursor: "pointer",
              transition: "all var(--motion-fast)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <div
              className="animate-spin"
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid var(--glass-border-subtle)",
                borderTopColor: "var(--accent-primary)",
                borderRadius: "50%",
                margin: "0 auto 0.75rem",
              }}
            />
            <span>Loading timeline...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-tertiary)" }}>
            <History size={36} style={{ margin: "0 auto 0.5rem", opacity: 0.5 }} />
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>No activities found</div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Perform a scan or ask the tutor to see historical logs here.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1rem",
                  backgroundColor: "var(--glass-bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--glass-border-subtle)",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: "var(--glass-bg-base)",
                    border: "1px solid var(--glass-border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {getIconForType(item.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 650, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {item.title}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                      {item.timestamp}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.3rem",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
