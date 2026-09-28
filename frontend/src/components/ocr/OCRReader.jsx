import React, { useState, useRef, useEffect } from "react";
import { ocrApi } from "../../api/ocrApi";
import { useVoice } from "../../context/VoiceContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import {
  FileText,
  Upload,
  Volume2,
  VolumeX,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function OCRReader({ onAskTutor }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const { speak, stopSpeaking, registerHandler } = useVoice();
  const { announce } = useAccessibility();

  const handleProcessFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");
    setLoading(true);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    try {
      const res = await ocrApi.extractText(selectedFile);
      setOcrResult(res);

      if (res.text && res.text.trim()) {
        announce(`OCR completed. Extracted ${res.word_count} words.`);
      } else {
        announce("OCR completed, but no legible text was detected in the image.");
      }
    } catch (err) {
      console.error("OCR extraction failed:", err);
      setError(err.message || "Failed to extract text from document.");
      announce("OCR process encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleProcessFile(files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = () => {
    if (!ocrResult?.text) return;
    navigator.clipboard.writeText(ocrResult.text);
    setCopied(true);
    announce("Scanned text copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReadAloud = () => {
    if (!ocrResult?.text) return;
    stopSpeaking();
    speak(ocrResult.text);
  };

  // Register voice command handler for OCR
  useEffect(() => {
    const unregister = registerHandler("triggerOcr", () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    });
    return unregister;
  }, [registerHandler]);

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
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 650, fontSize: "1.05rem", color: "var(--text-primary)" }}>
              OCR Document Reader
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              Tesseract Engine with CLAHE & Deskewing
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <GlassButton
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
          >
            <Upload size={15} />
            <span>Upload Document</span>
          </GlassButton>
        </div>
      </div>

      {/* Drag & Drop Upload Zone if no text */}
      {!ocrResult && !loading && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--glass-border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "var(--glass-bg-subtle)",
            transition: "all var(--motion-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--glass-border-subtle)";
          }}
        >
          <Upload size={32} style={{ color: "var(--text-tertiary)", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>
            Drop textbook page or notes here
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
            Supports PNG, JPG, JPEG, and WebP (up to 10MB)
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            padding: "2.5rem 1rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid var(--glass-border-subtle)",
              borderTopColor: "var(--accent-primary)",
              borderRadius: "50%",
            }}
          />
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Analyzing Page & Processing Glyphs...
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
            Applying contrast enhancement and perspective deskewing
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "var(--accent-rose)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* OCR Result Viewport */}
      {ocrResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Quality Badges Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div className="glass-pill primary" style={{ fontSize: "0.75rem" }}>
              {ocrResult.word_count || 0} Words
            </div>
            {ocrResult.confidence_score > 0 && (
              <div className="glass-pill success" style={{ fontSize: "0.75rem" }}>
                Confidence: {ocrResult.confidence_score}%
              </div>
            )}
            {ocrResult.is_blurry && (
              <div className="glass-pill warning" style={{ fontSize: "0.75rem" }}>
                <AlertTriangle size={12} /> Image Blurry
              </div>
            )}
            {ocrResult.is_dark && (
              <div className="glass-pill warning" style={{ fontSize: "0.75rem" }}>
                <AlertTriangle size={12} /> Low Lighting
              </div>
            )}
          </div>

          {/* Scanned Text Content Box */}
          <div
            tabIndex={0}
            aria-label="Extracted textbook text"
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--glass-bg-subtle)",
              border: "1px solid var(--glass-border-subtle)",
              borderRadius: "var(--radius-md)",
              minHeight: "130px",
              maxHeight: "260px",
              overflowY: "auto",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "pre-wrap",
            }}
          >
            {ocrResult.text || (
              <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                No textual content was recognized in this document. Please check page lighting and orientation.
              </span>
            )}
          </div>

          {/* Action Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <GlassButton
                variant="primary"
                onClick={handleReadAloud}
                disabled={!ocrResult.text}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
              >
                <Volume2 size={15} />
                <span>Read Aloud</span>
              </GlassButton>

              <GlassButton
                variant="secondary"
                onClick={stopSpeaking}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
              >
                <VolumeX size={15} />
                <span>Stop</span>
              </GlassButton>

              <GlassButton
                variant="secondary"
                onClick={handleCopy}
                disabled={!ocrResult.text}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
              >
                {copied ? <Check size={15} color="var(--accent-green)" /> : <Copy size={15} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </GlassButton>
            </div>

            {onAskTutor && ocrResult.text && (
              <GlassButton
                variant="secondary"
                onClick={() => onAskTutor(ocrResult.text)}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  borderColor: "var(--accent-primary)",
                  color: "var(--accent-primary)",
                }}
              >
                <Sparkles size={15} />
                <span>Ask AI Tutor About This</span>
              </GlassButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
