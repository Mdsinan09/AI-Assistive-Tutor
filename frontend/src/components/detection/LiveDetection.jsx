import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCamera } from "../../hooks/useCamera";
import { detectionApi } from "../../api/detectionApi";
import { useVoice } from "../../context/VoiceContext";
import { useAccessibility } from "../../context/AccessibilityContext";
import {
  Camera,
  CameraOff,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Volume2,
  VolumeX,
  AlertCircle,
  Cpu,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";

export default function LiveDetection({ onDetectionsUpdate, initialAutoStart = true }) {
  const { videoRef, isActive, hasPermission, errorMessage: camError, startCamera, stopCamera, captureBlob } = useCamera();
  const { speak, registerHandler } = useVoice();
  const { announce } = useAccessibility();

  const canvasRef = useRef(null);
  const isBusyRef = useRef(false);
  const loopTimeoutRef = useRef(null);
  const lastSpokenRef = useRef("");

  const [isPaused, setIsPaused] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [latency, setLatency] = useState(null);
  const [detections, setDetections] = useState([]);
  const [lastNarration, setLastNarration] = useState("");
  const [scanCount, setScanCount] = useState(0);

  // Sync latest state to parent if callback provided
  useEffect(() => {
    if (onDetectionsUpdate) {
      onDetectionsUpdate({ detections, narration: lastNarration, latency });
    }
  }, [detections, lastNarration, latency, onDetectionsUpdate]);

  // Perform single frame detection
  const performDetection = useCallback(async () => {
    if (isBusyRef.current || isPaused || !videoRef.current || !isActive) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      return;
    }

    isBusyRef.current = true;
    const startTime = performance.now();

    try {
      const blob = await captureBlob("image/jpeg", 0.85);
      if (!blob) {
        isBusyRef.current = false;
        return;
      }

      const res = await detectionApi.detect(blob, null, true);
      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);

      const items = res.detections || [];
      setDetections(items);
      setScanCount((prev) => prev + 1);

      if (res.spatial_narration) {
        setLastNarration(res.spatial_narration);

        // Auto-narrate if narration changed and audio enabled
        if (autoNarrate && res.spatial_narration !== lastSpokenRef.current) {
          lastSpokenRef.current = res.spatial_narration;
          speak(res.spatial_narration);
          announce(res.spatial_narration);
        }
      }
    } catch (err) {
      console.warn("Detection cycle failed:", err);
    } finally {
      isBusyRef.current = false;
    }
  }, [isPaused, isActive, captureBlob, autoNarrate, speak, announce]);

  // Continuous Detection Loop (throttled ~1.4s)
  useEffect(() => {
    let mounted = true;

    async function tick() {
      if (!mounted) return;
      if (!isPaused && isActive) {
        await performDetection();
      }
      if (mounted) {
        loopTimeoutRef.current = setTimeout(tick, 1400);
      }
    }

    if (isActive && !isPaused) {
      loopTimeoutRef.current = setTimeout(tick, 600);
    }

    return () => {
      mounted = false;
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, [isActive, isPaused, performDetection]);

  // Auto-start camera on mount
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

    if (!detections || detections.length === 0) return;

    detections.forEach((item) => {
      const [x1, y1, x2, y2] = item.box || [0, 0, 0, 0];
      const width = x2 - x1;
      const height = y2 - y1;
      const label = `${item.label.replace(/_/g, " ")} ${(item.confidence * 100).toFixed(0)}%`;

      // Zone-based color theme
      let strokeColor = "rgba(0, 113, 227, 0.9)"; // Apple Blue
      let fillColor = "rgba(0, 113, 227, 0.15)";
      let badgeBg = "rgba(0, 113, 227, 0.95)";

      if (item.position === "left") {
        strokeColor = "rgba(16, 185, 129, 0.9)"; // Emerald
        fillColor = "rgba(16, 185, 129, 0.15)";
        badgeBg = "rgba(16, 185, 129, 0.95)";
      } else if (item.position === "right") {
        strokeColor = "rgba(245, 158, 11, 0.9)"; // Amber
        fillColor = "rgba(245, 158, 11, 0.15)";
        badgeBg = "rgba(245, 158, 11, 0.95)";
      }

      // Draw rounded rectangle
      ctx.lineWidth = 3;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;

      ctx.beginPath();
      const radius = 8;
      ctx.roundRect ? ctx.roundRect(x1, y1, width, height, radius) : ctx.rect(x1, y1, width, height);
      ctx.stroke();
      ctx.fill();

      // Draw Glass Pill Badge for label
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
  }, [detections]);

  // Voice Handlers registration (e.g. "pause detection", "resume detection")
  useEffect(() => {
    const unregister1 = registerHandler("pauseDetection", () => {
      setIsPaused(true);
      announce("Detection paused.");
    });
    const unregister2 = registerHandler("resumeDetection", () => {
      setIsPaused(false);
      announce("Detection resumed.");
    });
    const unregister3 = registerHandler("triggerDetection", () => {
      performDetection();
    });

    return () => {
      unregister1();
      unregister2();
      unregister3();
    };
  }, [registerHandler, announce, performDetection]);

  return (
    <div className="glass-panel" style={{ padding: "1.25rem", overflow: "hidden" }}>
      {/* Top Header Controls Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: isActive ? "var(--accent-green-subtle)" : "var(--glass-bg-subtle)",
              color: isActive ? "var(--accent-green)" : "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Eye size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 650, fontSize: "1.05rem", color: "var(--text-primary)" }}>
              FieldNet V3 Spatial Vision
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              {isPaused ? "Paused" : isActive ? "Continuous Live Tracking" : "Camera Inactive"}
            </div>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {latency && (
            <div
              className="glass-pill"
              title="Model inference latency"
              style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Cpu size={12} />
              <span>{latency} ms</span>
            </div>
          )}

          <div
            className={`glass-pill ${detections.length > 0 ? "primary" : ""}`}
            style={{ fontSize: "0.75rem" }}
          >
            {detections.length} {detections.length === 1 ? "Object" : "Objects"}
          </div>

          {/* Toggle speech narration */}
          <button
            onClick={() => setAutoNarrate((prev) => !prev)}
            aria-label={autoNarrate ? "Mute automatic spatial narration" : "Enable automatic spatial narration"}
            className="glass-btn"
            style={{ padding: "0.4rem 0.65rem", fontSize: "0.8rem" }}
            title={autoNarrate ? "Auto-narration is ON" : "Auto-narration is MUTED"}
          >
            {autoNarrate ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Pause / Resume */}
          {isActive && (
            <GlassButton
              variant={isPaused ? "primary" : "secondary"}
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Resume detection" : "Pause detection"}
              style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
            >
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </GlassButton>
          )}

          {/* Camera On / Off */}
          <GlassButton
            variant={isActive ? "secondary" : "primary"}
            onClick={isActive ? stopCamera : startCamera}
            aria-label={isActive ? "Turn off webcam" : "Turn on webcam"}
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
          >
            {isActive ? <CameraOff size={15} /> : <Camera size={15} />}
            <span>{isActive ? "Stop" : "Start"}</span>
          </GlassButton>
        </div>
      </div>

      {/* Video Viewport & Canvas Overlay */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          backgroundColor: "#000000",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.6)",
        }}
      >
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

        {/* Inactive or Error Overlay */}
        {!isActive && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              color: "var(--text-tertiary)",
              padding: "1.5rem",
              textAlign: "center",
            }}
          >
            {camError ? (
              <>
                <AlertCircle size={36} color="var(--accent-rose)" />
                <div style={{ color: "var(--accent-rose)", fontWeight: 600 }}>{camError}</div>
                <GlassButton variant="primary" onClick={startCamera}>
                  Try Again
                </GlassButton>
              </>
            ) : (
              <>
                <Camera size={44} strokeWidth={1.5} />
                <div style={{ fontSize: "0.95rem" }}>Live video feed is currently disabled</div>
                <GlassButton variant="primary" onClick={startCamera}>
                  Enable Camera
                </GlassButton>
              </>
            )}
          </div>
        )}

        {/* Paused Overlay Pill */}
        {isActive && isPaused && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              background: "rgba(0, 0, 0, 0.75)",
              color: "#ffffff",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backdropFilter: "blur(6px)",
            }}
          >
            <Pause size={13} />
            <span>PAUSED</span>
          </div>
        )}
      </div>

      {/* Spatial Narration Box */}
      {lastNarration && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            backgroundColor: "var(--glass-bg-subtle)",
            border: "1px solid var(--glass-border-subtle)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <Volume2
            size={18}
            style={{ color: "var(--accent-primary)", marginTop: "2px", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>
              Spatial Narration
            </div>
            <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", marginTop: "2px", lineHeight: 1.4 }}>
              {lastNarration}
            </div>
          </div>
          <button
            onClick={() => speak(lastNarration)}
            className="glass-btn"
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
            title="Read aloud"
          >
            Repeat
          </button>
        </div>
      )}
    </div>
  );
}
