import React, { useState, useCallback } from "react";
import LiveDetection from "../components/detection/LiveDetection";
import DigitalTwin from "../components/digitalTwin/DigitalTwin";
import AssistantContextPanel from "../components/dashboard/AssistantContextPanel";

export default function Dashboard() {
  const [currentDetections, setCurrentDetections] = useState([]);
  const [currentNarration, setCurrentNarration] = useState("");
  const [activeContext, setActiveContext] = useState(null);

  const handleDetectionsUpdate = useCallback(({ detections, narration }) => {
    setCurrentDetections(detections || []);
    setCurrentNarration(narration || "");
  }, []);

  const handleOcrCaptured = useCallback((ocrResult, selectedText = "") => {
    setActiveContext({
      type: "ocr",
      ocrResult,
      selectedText: selectedText || ocrResult?.text || "",
      timestamp: Date.now(),
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        maxWidth: "960px",
        margin: "0 auto",
        width: "100%",
        paddingBottom: "2.5rem",
      }}
    >
      {/* 1. PRIMARY FEATURE: Live Camera & FieldNet V3 Object Detection + In-Camera OCR */}
      <LiveDetection
        onDetectionsUpdate={handleDetectionsUpdate}
        onOcrCaptured={handleOcrCaptured}
        initialAutoStart={true}
      />

      {/* 2. Unified Environment / Spatial Overview */}
      <DigitalTwin detections={currentDetections} narration={currentNarration} />

      {/* 3. OCR / Explanation Context Panel */}
      <AssistantContextPanel
        activeContext={activeContext}
        onClearContext={() => setActiveContext(null)}
        detections={currentDetections}
        narration={currentNarration}
      />
    </div>
  );
}
