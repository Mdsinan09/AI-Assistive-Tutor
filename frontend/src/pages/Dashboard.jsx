import React, { useState, useCallback } from "react";
import VoiceHero from "../components/dashboard/VoiceHero";
import LiveDetection from "../components/detection/LiveDetection";
import DigitalTwin from "../components/digitalTwin/DigitalTwin";
import OCRReader from "../components/ocr/OCRReader";
import FeatureCards from "../components/dashboard/FeatureCards";
import TutorModal from "../components/tutor/TutorModal";

export default function Dashboard() {
  const [currentDetections, setCurrentDetections] = useState([]);
  const [currentNarration, setCurrentNarration] = useState("");
  const [tutorContext, setTutorContext] = useState("");
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  const handleDetectionsUpdate = useCallback(({ detections, narration }) => {
    setCurrentDetections(detections || []);
    setCurrentNarration(narration || "");
  }, []);

  const handleAskTutor = (textContext = "") => {
    setTutorContext(textContext);
    setIsTutorOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Title & Status */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 750, margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
            Multimodal Workspace
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Real-time FieldNet spatial vision, desk twin telemetry, and OCR reading
          </p>
        </div>
      </div>

      {/* Voice Hero Assistant */}
      <VoiceHero />

      {/* Vision & Spatial Desk Twin Grid */}
      <div className="grid-2">
        <LiveDetection onDetectionsUpdate={handleDetectionsUpdate} initialAutoStart={true} />
        <DigitalTwin detections={currentDetections} narration={currentNarration} />
      </div>

      {/* OCR Document Reader */}
      <OCRReader onAskTutor={(text) => handleAskTutor(text)} />

      {/* Assistive Capabilities Cards */}
      <FeatureCards
        onTriggerScan={() => {
          const el = document.querySelector("video");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onTriggerOcr={() => {
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.click();
        }}
        onOpenTutor={() => handleAskTutor("")}
      />

      {/* Gemini AI Tutor Modal */}
      <TutorModal
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        initialContext={tutorContext}
      />
    </div>
  );
}
