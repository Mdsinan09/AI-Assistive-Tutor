import React, { useState, useCallback } from "react";
import LiveDetection from "../components/detection/LiveDetection";
import DigitalTwin from "../components/digitalTwin/DigitalTwin";
import AssistantContextPanel from "../components/dashboard/AssistantContextPanel";
import DocumentMagnifierReader from "../components/ocr/DocumentMagnifierReader";

export default function Dashboard() {
  const [currentDetections, setCurrentDetections] = useState([]);
  const [currentNarration, setCurrentNarration] = useState("");
  const [activeContext, setActiveContext] = useState(null);

  const handleDetectionsUpdate = useCallback(({ detections, narration }) => {
    setCurrentDetections(detections || []);
    setCurrentNarration(narration || "");
  }, []);

  const handleOcrCaptured = useCallback((ocrResult) => {
    setActiveContext({
      type: "ocr",
      ocrResult,
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
        paddingBottom: "2rem",
      }}
    >
      {/* 1. PRIMARY FEATURE: Live Camera & FieldNet V3 Object Detection */}
      <LiveDetection
        onDetectionsUpdate={handleDetectionsUpdate}
        onOcrCaptured={handleOcrCaptured}
        initialAutoStart={true}
      />

      {/* 2. 2D Environment Map: Desk Digital Twin */}
      <DigitalTwin detections={currentDetections} narration={currentNarration} />

      {/* 3. Unified Live Context, Voice Dialog & OCR Response Panel */}
      <AssistantContextPanel
        activeContext={activeContext}
        onClearContext={() => setActiveContext(null)}
        detections={currentDetections}
        narration={currentNarration}
      />

      {/* 4. Document Reader & Magnifier */}
      <DocumentMagnifierReader />
    </div>
  );
}
