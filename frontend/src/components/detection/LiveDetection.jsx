import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCamera } from "../../hooks/useCamera";
import { detectionApi } from "../../api/detectionApi";
import { ocrApi } from "../../api/ocrApi";
import { useVoice } from "../../context/VoiceContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import {
  Camera,
  Play,
  Pause,
  SwitchCamera,
  Volume2,
  VolumeX,
  AlertTriangle,
  Lock,
  Cpu,
  FileText,
  Mic,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function LiveDetection({
  onDetectionsUpdate,
  onOcrCaptured,
  initialAutoStart = true,
}) {
  const {
    videoRef,
    isActive,
    isSwitching,
    hasPermission,
    facingMode,
    errorMessage: camError,
    errorType,
    diagnostics,
    startCamera,
    stopCamera,
    toggleFacingMode,
    captureBlob,
    captureFullFrame,
  } = useCamera();

  const {
    voiceState,
    startListening,
    stopSpeaking,
    speak,
    registerHandler,
    updateVisualContext,
  } = useVoice();
  const { announce, autoDetection } = useAccessibility();

  const canvasRef = useRef(null);
  const isBusyRef = useRef(false);
  const loopTimeoutRef = useRef(null);
  const lastAnnouncedKeysRef = useRef("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [latency, setLatency] = useState(null);
  const [detections, setDetections] = useState([]);
  const [lastNarration, setLastNarration] = useState("");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Sync latest visual state to parent and VoiceContext
  useEffect(() => {
    if (onDetectionsUpdate) {
      onDetectionsUpdate({ detections, narration: lastNarration, latency });
    }
    updateVisualContext({ objects: detections });
  }, [detections, lastNarration, latency, onDetectionsUpdate, updateVisualContext]);

  // Capture frame from the SAME camera for OCR
  const captureOcrFromCamera = useCallback(async () => {
    if (!isActive || isOcrProcessing) return;
    setIsOcrProcessing(true);
    stopSpeaking();
    speak("Scanning text from camera view.");

    try {
      const blob = await captureFullFrame("image/jpeg", 0.92);
      if (!blob) {
        speak("Camera frame was not ready. Please try again.");
        setIsOcrProcessing(false);
        return;
      }

      const res = await ocrApi.extractText(blob, null, "camera_scan.jpg");
      if (onOcrCaptured) {
        onOcrCaptured(res);
      }

      if (res.text && res.text.trim()) {
        const spokenStart = res.text.trim().slice(0, 140);
        speak(`Scanned text says: ${spokenStart}`);
      } else {
        speak("I could not detect clear text on this page. Try holding the camera closer or adding light.");
      }
    } catch (err) {
      console.warn("[LiveDetection] Camera OCR failed:", err);
      speak("OCR scan encountered an error. Please try again.");
    } finally {
      setIsOcrProcessing(false);
    }
  }, [isActive, isOcrProcessing, captureFullFrame, stopSpeaking, speak, onOcrCaptured]);

  // Register external voice command handlers
  useEffect(() => {
    const unregisterOcr = registerHandler("triggerCameraOcr", captureOcrFromCamera);
    const unregisterPause = registerHandler("pauseDetection", () => {
      setIsPaused(true);
      announce("Detection paused.");
    });
    const unregisterResume = registerHandler("resumeDetection", () => {
      setIsPaused(false);
      announce("Detection resumed.");
    });

    return () => {
      unregisterOcr();
      unregisterPause();
      unregisterResume();
    };
  }, [registerHandler, captureOcrFromCamera, announce]);

  // Continuous FieldNet V3 Detection Frame Processing
  const performDetection = useCallback(async () => {
    if (isBusyRef.current || isPaused || !videoRef.current || !isActive || isSwitching) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      return;
    }

    isBusyRef.current = true;
    const startTime = performance.now();

    try {
      // Scale frame down to ~640px for mobile performance without accuracy loss
      const blob = await captureBlob("image/jpeg", 0.82, 640);
      if (!blob) {
        isBusyRef.current = false;
        return;
      }

      const res = await detectionApi.detect(blob, null, true);
      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);

      const items = res.detections || [];
      setDetections(items);

      if (res.spatial_narration) {
        setLastNarration(res.spatial_narration);

        // Debounced TTS Announcements: only speak when the set of detected objects changes
        const currentKeys = items
          .map((i) => `${i.label}_${i.position}`)
          .sort()
          .join("|");

        if (
          autoNarrate &&
          autoDetection &&
          currentKeys !== lastAnnouncedKeysRef.current &&
          items.length > 0
        ) {
          lastAnnouncedKeysRef.current = currentKeys;
          speak(res.spatial_narration);
          announce(res.spatial_narration);
        } else if (items.length === 0 && lastAnnouncedKeysRef.current !== "") {
          lastAnnouncedKeysRef.current = "";
        }
      }
    } catch (err) {
      console.warn("[LiveDetection] Detection request failed:", err);
    } finally {
      isBusyRef.current = false;
    }
  }, [isPaused, isActive, isSwitching, captureBlob, autoNarrate, autoDetection, speak, announce]);

  // Continuous Detection Loop (throttled ~1.3s for mobile smoothness)
  useEffect(() => {
    let mounted = true;

    async function loop() {
      if (!mounted) return;
      if (!isPaused && isActive && !isSwitching) {
        await performDetection();
      }
      if (mounted) {
        loopTimeoutRef.current = setTimeout(loop, 1300);
      }
    }

    if (isActive && !isPaused && !isSwitching) {
      loopTimeoutRef.current = setTimeout(loop, 400);
    }

    return () => {
      mounted = false;
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, [isActive, isPaused, isSwitching, performDetection]);

  // Auto-start camera on mount if requested
  useEffect(() => {
    if (initialAutoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [initialAutoStart, startCamera, stopCamera]);

  // Draw Bounding Boxes on Overlay Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    canvas.width = vWidth;
    canvas.height = vHeight;
    ctx.clearRect(0, 0, vWidth, vHeight);

    if (!detections || detections.length === 0 || !isActive) return;

    detections.forEach((item) => {
      const [x1, y1, x2, y2] = item.box || [0, 0, 0, 0];
      const width = x2 - x1;
      const height = y2 - y1;
      const label = `${item.label.replace(/_/g, " ")} ${(item.confidence * 100).toFixed(0)}%`;

      let strokeColor = "rgba(0, 113, 227, 0.9)"; // Apple Blue
      let fillColor = "rgba(0, 113, 227, 0.16)";
      let badgeBg = "rgba(0, 113, 227, 0.92)";

      if (item.position === "left") {
        strokeColor = "rgba(16, 185, 129, 0.9)"; // Emerald
        fillColor = "rgba(16, 185, 129, 0.16)";
        badgeBg = "rgba(16, 185, 129, 0.92)";
      } else if (item.position === "right") {
        strokeColor = "rgba(245, 158, 11, 0.9)"; // Amber
        fillColor = "rgba(245, 158, 11, 0.16)";
        badgeBg = "rgba(245, 158, 11, 0.92)";
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;

      ctx.beginPath();
      const radius = 8;
      ctx.roundRect ? ctx.roundRect(x1, y1, width, height, radius) : ctx.rect(x1, y1, width, height);
      ctx.stroke();
      ctx.fill();

      // Pill badge above box
      ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
      const textMetrics = ctx.measureText(label);
      const paddingH = 8;
      const badgeH = 22;
      const badgeW = textMetrics.width + paddingH * 2;
      const badgeY = Math.max(0, y1 - badgeH - 4);

      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x1, badgeY, badgeW, badgeH, 6) : ctx.rect(x1, badgeY, badgeW, badgeH);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x1 + paddingH, badgeY + 15);
    });
  }, [detections, isActive]);

  const handleCopyHttpsUrl = () => {
    const httpsUrl = `https://${window.location.hostname}:${window.location.port || "5173"}${window.location.pathname}`;
    navigator.clipboard.writeText(httpsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const isListening = voiceState === "LISTENING";
  const isSpeaking = voiceState === "SPEAKING";
  const isProcessing = voiceState === "PROCESSING";

  return (
    <section
      aria-label="Live Assistive Camera and Vision Interface"
      className="glass-panel"
      style={{
        padding: "0.75rem",
        borderRadius: "var(--radius-xl)",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        boxShadow: "var(--shadow-elevation-medium)",
      }}
    >
      {/* Viewport Frame */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          maxHeight: "75vh",
          backgroundColor: "#000000",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isActive ? "block" : "none",
          }}
        />

        {/* Canvas Overlay for Bounding Boxes */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
            display: isActive ? "block" : "none",
          }}
        />

        {/* Floating Top Bar (Status + Flip) */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              left: "0.75rem",
              right: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 15,
              pointerEvents: "none",
            }}
          >
            {/* Live Indicator Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                pointerEvents: "auto",
              }}
            >
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 650,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isPaused ? "var(--accent-amber)" : "var(--accent-green)",
                    boxShadow: isPaused
                      ? "0 0 8px var(--accent-amber)"
                      : "0 0 8px var(--accent-green)",
                  }}
                />
                <span>{isPaused ? "PAUSED" : "LIVE"}</span>
              </div>

              <div
                style={{
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                {detections.length} {detections.length === 1 ? "Object" : "Objects"}
              </div>
            </div>

            {/* Camera Flip Button */}
            <button
              onClick={toggleFacingMode}
              disabled={isSwitching}
              aria-label={`Flip camera. Currently using ${facingMode === "environment" ? "back" : "front"} camera`}
              style={{
                pointerEvents: "auto",
                background: "rgba(0, 0, 0, 0.65)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                padding: "0.45rem 0.75rem",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 600,
                transition: "transform var(--motion-fast)",
              }}
              title="Switch Front/Back camera"
            >
              <SwitchCamera size={15} className={isSwitching ? "animate-spin" : ""} />
              <span>{facingMode === "environment" ? "Back" : "Front"}</span>
            </button>
          </div>
        )}

        {/* Floating Bottom Bar (Mic, OCR, Narration, Pause) */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              bottom: "0.85rem",
              left: "0.75rem",
              right: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 15,
            }}
          >
            {/* Left Controls: OCR Trigger */}
            <button
              onClick={captureOcrFromCamera}
              disabled={isOcrProcessing}
              aria-label="Scan and read text from camera view"
              style={{
                background: "rgba(0, 0, 0, 0.7)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "0.55rem 0.9rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Point camera at textbook and tap to read"
            >
              <FileText size={16} color="var(--accent-amber)" />
              <span>{isOcrProcessing ? "Reading..." : "Read Text"}</span>
            </button>

            {/* Center: PRIMARY VOICE MICROPHONE BUTTON */}
            <button
              onClick={() => startListening()}
              aria-label={
                isListening
                  ? "Stop listening"
                  : isSpeaking
                  ? "Speaking response aloud"
                  : "Start voice assistant"
              }
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isListening
                  ? "var(--accent-primary)"
                  : isSpeaking
                  ? "var(--accent-green)"
                  : isProcessing
                  ? "var(--accent-amber)"
                  : "rgba(255, 255, 255, 0.95)",
                border: "3px solid rgba(255, 255, 255, 0.8)",
                color: isListening || isSpeaking || isProcessing ? "#ffffff" : "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: isListening
                  ? "0 0 25px var(--accent-primary)"
                  : isSpeaking
                  ? "0 0 22px var(--accent-green)"
                  : "0 4px 18px rgba(0, 0, 0, 0.4)",
                transform: isListening ? "scale(1.08)" : "scale(1)",
                transition: "all var(--motion-fast)",
              }}
              title="Tap to speak your question"
            >
              <Mic size={26} className={isListening ? "animate-pulse" : ""} />
            </button>

            {/* Right Controls: Mute + Pause */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button
                onClick={() => setAutoNarrate((prev) => !prev)}
                aria-label={autoNarrate ? "Mute automatic speech" : "Enable speech narration"}
                style={{
                  background: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: autoNarrate ? "#ffffff" : "var(--accent-rose)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title={autoNarrate ? "Audio narration active" : "Audio narration muted"}
              >
                {autoNarrate ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                onClick={() => setIsPaused((prev) => !prev)}
                aria-label={isPaused ? "Resume detection" : "Pause detection"}
                style={{
                  background: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title={isPaused ? "Resume live detection" : "Pause live detection"}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* INACTIVE / PERMISSION / DIAGNOSTIC OVERLAY */}
        {!isActive && (
          <div
            style={{
              padding: "1.75rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              maxWidth: "520px",
            }}
          >
            {errorType === "INSECURE_CONTEXT" ? (
              <>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--accent-amber)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.4rem 0", color: "#ffffff" }}>
                    HTTPS Connection Required
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    Mobile browsers strictly block camera access over plain HTTP. Please switch to the secure HTTPS
                    address to enable live camera detection.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.82rem",
                    color: "#ffffff",
                    wordBreak: "break-all",
                  }}
                >
                  https://{window.location.hostname}:{window.location.port || "5173"}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                  <GlassButton variant="secondary" onClick={handleCopyHttpsUrl}>
                    {copiedUrl ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
                    <span>{copiedUrl ? "Copied Link" : "Copy HTTPS Link"}</span>
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={() => {
                      window.location.href = `https://${window.location.hostname}:${window.location.port || "5173"}${window.location.pathname}`;
                    }}
                  >
                    Switch to HTTPS Now
                  </GlassButton>
                </div>
              </>
            ) : camError ? (
              <>
                <AlertTriangle size={40} color="var(--accent-rose)" />
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.35rem 0", color: "#ffffff" }}>
                    Camera Access Needed
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
                    {camError}
                  </p>
                </div>
                <GlassButton variant="primary" onClick={() => startCamera()}>
                  <RefreshCw size={16} />
                  <span>Try Again</span>
                </GlassButton>
              </>
            ) : (
              <>
                <Camera size={44} color="var(--accent-primary)" strokeWidth={1.5} />
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.35rem 0", color: "#ffffff" }}>
                    Live Camera Assistive Vision
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    Your camera acts as your assistive sensor for real-time FieldNet V3 object detection and textbook
                    reading.
                  </p>
                </div>
                <GlassButton variant="primary" onClick={() => startCamera()} style={{ padding: "0.75rem 1.75rem" }}>
                  <Camera size={18} />
                  <span>Enable Camera</span>
                </GlassButton>
              </>
            )}
          </div>
        )}
      </div>

      {/* Latency & Hardware Stats Footer */}
      {isActive && latency && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.5rem",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            color: "var(--text-tertiary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Cpu size={12} />
            <span>FieldNet V3 Latency: {latency} ms</span>
          </div>
          <div>Facing: {facingMode === "environment" ? "Back (World)" : "Front (User)"}</div>
        </div>
      )}
    </section>
  );
}
