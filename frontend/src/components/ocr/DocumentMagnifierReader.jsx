import React, { useState, useRef } from "react";
import { ocrApi } from "../../api/ocrApi";
import { tutorApi } from "../../api/tutorApi";
import { useVoice } from "../../context/VoiceContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import {
  FileText,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  Copy,
  Check,
  AlertTriangle,
  SunMedium,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function DocumentMagnifierReader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const { speak, stopSpeaking } = useVoice();
  const { announce } = useAccessibility();

  const handleProcessFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");
    setLoading(true);
    setSummaryText("");
    setZoomLevel(1);

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    try {
      const res = await ocrApi.extractText(selectedFile);
      setOcrResult(res);

      if (res.text && res.text.trim()) {
        announce(`Document processed. Extracted ${res.word_count} words.`);
      } else {
        announce("Document processed, but no legible text was detected.");
      }
    } catch (err) {
      console.error("[DocumentMagnifier] OCR extraction failed:", err);
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

  const handleReadAloud = () => {
    const textToRead = summaryText || ocrResult?.text;
    if (!textToRead) return;
    stopSpeaking();
    speak(textToRead);
  };

  const handleSummarize = async () => {
    if (!ocrResult?.text) return;
    setIsSummarizing(true);
    stopSpeaking();

    try {
      const res = await tutorApi.ask(
        "Please provide a clear and concise 2-sentence summary of this uploaded textbook page for a student.",
        ocrResult.text
      );
      const summary = res.answer || "Could not generate summary.";
      setSummaryText(summary);
      speak(summary);
    } catch {
      const fallbackSum = ocrResult.text.slice(0, 180) + "...";
      setSummaryText(fallbackSum);
      speak(fallbackSum);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (!ocrResult?.text) return;
    navigator.clipboard.writeText(ocrResult.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOcrResult(null);
    setSummaryText("");
    setError("");
    setZoomLevel(1);
    stopSpeaking();
  };

  return (
    <section
      aria-label="Document Reader and Magnifier"
      className="glass-panel"
      style={{
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "var(--accent-primary-subtle)",
              color: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Document Reader & Magnifier
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
              Upload pages, zoom for visual comfort, and extract text
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {previewUrl && (
            <GlassButton
              variant="secondary"
              onClick={handleClear}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
            >
              <RotateCcw size={14} />
              <span>New Document</span>
            </GlassButton>
          )}

          <GlassButton
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
          >
            <Upload size={14} />
            <span>Upload Page</span>
          </GlassButton>
        </div>
      </div>

      {/* Drag & Drop Upload Zone if no file loaded */}
      {!previewUrl && !loading && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed var(--glass-border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "2rem 1.25rem",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "var(--glass-bg-subtle)",
            transition: "border-color var(--motion-fast)",
          }}
        >
          <Upload size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 0.5rem" }} />
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.92rem" }}>
            Upload textbook photo, handout, or study document
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", marginTop: "0.2rem" }}>
            Tap here or drag & drop (JPG, PNG, WebP)
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
          <div
            className="animate-spin"
            style={{
              width: "34px",
              height: "34px",
              border: "3px solid var(--glass-border-subtle)",
              borderTopColor: "var(--accent-primary)",
              borderRadius: "50%",
              margin: "0 auto 0.75rem",
            }}
          />
          <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Enhancing contrast & extracting text...
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
            Applying CLAHE adaptive thresholding and deskewing
          </div>
        </div>
      )}

      {/* Error message */}
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
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Magnified Preview & Reading Viewport */}
      {previewUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Magnifier Controls Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "var(--glass-bg-subtle)",
              padding: "0.5rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--glass-border-subtle)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 650, color: "var(--text-secondary)" }}>
                Magnification:
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                disabled={zoomLevel <= 1}
                className="glass-btn"
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                aria-label="Zoom out document"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, minWidth: "38px", textAlign: "center" }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                disabled={zoomLevel >= 3}
                className="glass-btn"
                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                aria-label="Zoom in document"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button
                onClick={() => setHighContrast((c) => !c)}
                className={`glass-btn ${highContrast ? "primary" : ""}`}
                style={{ padding: "0.25rem 0.65rem", fontSize: "0.75rem" }}
                aria-label="Toggle inverted high contrast mode for document preview"
              >
                <SunMedium size={13} />
                <span>{highContrast ? "Inverted Contrast" : "Standard Contrast"}</span>
              </button>
            </div>
          </div>

          {/* Scrollable Magnified Image Container */}
          <div
            style={{
              maxHeight: "320px",
              overflow: "auto",
              backgroundColor: "#000000",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--glass-border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.5rem",
            }}
          >
            <img
              src={previewUrl}
              alt="Uploaded study document page"
              style={{
                maxWidth: "100%",
                height: "auto",
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
                filter: highContrast ? "invert(1) contrast(150%)" : "none",
              }}
            />
          </div>

          {/* OCR Extracted Text */}
          {ocrResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="glass-pill primary" style={{ fontSize: "0.72rem" }}>
                    {ocrResult.word_count || 0} Words
                  </span>
                  {ocrResult.confidence_score > 0 && (
                    <span className="glass-pill success" style={{ fontSize: "0.72rem" }}>
                      Confidence: {ocrResult.confidence_score}%
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <GlassButton
                    variant="primary"
                    onClick={handleReadAloud}
                    disabled={!ocrResult.text}
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    <Volume2 size={13} />
                    <span>Read Aloud</span>
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    onClick={stopSpeaking}
                    style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                  >
                    <VolumeX size={13} />
                    <span>Stop</span>
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    onClick={handleSummarize}
                    disabled={isSummarizing || !ocrResult.text}
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    <BookOpen size={13} color="var(--accent-amber)" />
                    <span>{isSummarizing ? "Summarizing..." : "Summarize"}</span>
                  </GlassButton>

                  <GlassButton
                    variant="secondary"
                    onClick={handleCopy}
                    disabled={!ocrResult.text}
                    style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                  >
                    {copied ? <Check size={13} color="var(--accent-green)" /> : <Copy size={13} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </GlassButton>
                </div>
              </div>

              {/* Summary Box (only shown if user explicitly clicked Summarize!) */}
              {summaryText && (
                <div
                  style={{
                    padding: "0.85rem",
                    backgroundColor: "var(--glass-bg-subtle)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--accent-amber)",
                    fontSize: "0.92rem",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent-amber)", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    Summary
                  </div>
                  <div>{summaryText}</div>
                </div>
              )}

              {/* Extracted Text Box */}
              <div
                tabIndex={0}
                aria-label="Extracted document text"
                style={{
                  padding: "1rem",
                  backgroundColor: "var(--glass-bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--glass-border-subtle)",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  maxHeight: "200px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {ocrResult.text || (
                  <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                    No readable text recognized in this document.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
