import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCamera } from "../../hooks/useCamera";
import { detectionApi } from "../../api/detectionApi";
import { ocrApi } from "../../api/ocrApi";
import { tutorApi } from "../../api/tutorApi";
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
  Maximize2,
  Minimize2,
  Zap,
  ZapOff,
  ScanLine,
  CheckSquare,
  X,
  Sparkles,
  BookOpen,
  ArrowRight,
  Bot,
  Plus,
  Minus,
  Loader2,
} from "lucide-react";
import GlassButton from "../glass/GlassButton";
import VoiceWaveformOverlay from "../voice/VoiceWaveformOverlay";
import {
  mapDetectionToDisplayCoordinates,
  TemporalBoxStabilizer,
} from "../../utils/coordinateTransform";

export default function LiveDetection({
  onDetectionsUpdate,
  onOcrCaptured,
  initialAutoStart = true,
}) {
  const navigate = useNavigate();

  const {
    videoRef,
    isActive,
    isSwitching,
    hasPermission,
    facingMode,
    facingModeRef,
    isTorchSupported,
    isTorchOn,
    toggleTorch,
    errorMessage: camError,
    errorType,
    diagnostics,
    availableDevices,
    startCamera,
    stopCamera,
    toggleFacingMode,
    captureBlob,
    captureFullFrame,
    zoom,
    zoomRange,
    isHardwareZoomSupported,
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useCamera();

  const {
    voiceState,
    isVoiceSessionOpen,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    cancelListening,
    closeVoiceSession,
    stopSpeaking,
    speak,
    speakAnnouncement,
    isSpeaking,
    activeContextName,
    registerHandler,
    updateVisualContext,
  } = useVoice();
  const { announce, autoDetection } = useAccessibility();

  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isBusyRef = useRef(false);
  const isNativeFullscreenRef = useRef(false);
  const loopTimeoutRef = useRef(null);
  const lastAnnouncedKeysRef = useRef("");
  const stabilizerRef = useRef(new TemporalBoxStabilizer(0.65, 1200));
  const frameSeqRef = useRef(0);
  const latestCompletedSeqRef = useRef(0);
  const lastFrameMetaRef = useRef({ width: 640, height: 360 });
  const hasAutoStartedRef = useRef(false);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const savedAutoNarrateRef = useRef(autoNarrate);
  const [latency, setLatency] = useState(null);
  const [detections, setDetections] = useState([]);
  const [lastNarration, setLastNarration] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [debugHudData, setDebugHudData] = useState(null);
  const [torchNotice, setTorchNotice] = useState("");

  // Task 2: Suspend automatic object-detection announcements when voice session is open
  useEffect(() => {
    if (isVoiceSessionOpen) {
      savedAutoNarrateRef.current = autoNarrate;
      stopSpeaking();
    } else {
      // When voice session closes (user clicked X), restore prior state and clear key history
      // to avoid an immediate backlog burst of announcements
      const confirmedObjects = stabilizerRef.current.getConfirmedDetections();
      const currentKeys = confirmedObjects
        .map((i) => `${i.label}_${i.position}`)
        .sort()
        .join("|");
      lastAnnouncedKeysRef.current = currentKeys;
    }
  }, [isVoiceSessionOpen, stopSpeaking]);

  // ==========================================
  // GOOGLE LENS-STYLE OCR SCANNING & SELECTION (SECTIONS 8-20, 37-40)
  // ==========================================
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [selectedWordIndices, setSelectedWordIndices] = useState(new Set());
  const [selectedText, setSelectedText] = useState("");
  const [ocrActionLoading, setOcrActionLoading] = useState(false);
  const [ocrActionMessage, setOcrActionMessage] = useState("");
  const [isCopiedSelected, setIsCopiedSelected] = useState(false);

  const handleCopySelected = useCallback(() => {
    if (!selectedText) return;
    try {
      navigator.clipboard?.writeText(selectedText);
      setIsCopiedSelected(true);
      setTimeout(() => setIsCopiedSelected(false), 2000);
    } catch {}
  }, [selectedText]);

  const isMirrored = facingMode === "user";
  const isDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debugVision") === "true";

  // Helper to feature-detect active native fullscreen element across all browser engines
  const getNativeFullscreenElement = () => {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  };

  // Toggle Fullscreen / Immersive Camera View with robust mobile & iOS fallback
  const toggleFullscreen = useCallback(async (e) => {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }

    const targetEl = sectionRef.current || containerRef.current;
    if (!targetEl) return;

    if (isFullscreen) {
      // EXIT FULLSCREEN
      if (isNativeFullscreenRef.current) {
        try {
          const exitFn =
            document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.mozCancelFullScreen ||
            document.msExitFullscreen;
          if (exitFn && getNativeFullscreenElement()) {
            await exitFn.call(document);
          }
        } catch (err) {
          console.debug("[Fullscreen] Exit native notice:", err);
        }
        isNativeFullscreenRef.current = false;
      }
      setIsFullscreen(false);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    } else {
      // ENTER FULLSCREEN
      let enteredNative = false;
      try {
        const reqFn =
          targetEl.requestFullscreen ||
          targetEl.webkitRequestFullscreen ||
          targetEl.mozRequestFullScreen ||
          targetEl.msRequestFullscreen;
        if (reqFn) {
          await reqFn.call(targetEl);
          enteredNative = true;
          isNativeFullscreenRef.current = true;
        }
      } catch (err) {
        console.debug("[Fullscreen] Native request rejected or unsupported, using CSS fallback:", err);
        isNativeFullscreenRef.current = false;
      }
      setIsFullscreen(true);
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
  }, [isFullscreen]);

  // Track native fullscreen exits (e.g. via Escape key or mobile gestures)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const nativeElement = getNativeFullscreenElement();
      // Only reset if we entered native fullscreen mode
      if (!nativeElement && isNativeFullscreenRef.current) {
        isNativeFullscreenRef.current = false;
        setIsFullscreen(false);
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    };

    const events = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];
    events.forEach((ev) => document.addEventListener(ev, handleFullscreenChange));

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleFullscreenChange));
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Clean up body overflow when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Sync latest visual state to parent and VoiceContext
  useEffect(() => {
    if (onDetectionsUpdate) {
      onDetectionsUpdate({ detections, narration: lastNarration, latency });
    }
    updateVisualContext({ objects: detections });
    try {
      if (detections && detections.length > 0) {
        const summary = detections.map((d) => d.class_name).join(", ");
        sessionStorage.setItem("ai_assistive_active_detections", summary);
      }
    } catch (_) {}
  }, [detections, lastNarration, latency, onDetectionsUpdate, updateVisualContext]);

  // ==========================================
  // TORCH / FLASHLIGHT HANDLER (SECTION 7 & 44)
  // ==========================================
  const handleToggleTorch = async () => {
    const res = await toggleTorch();
    if (!res.supported) {
      setTorchNotice(res.message);
      announce(res.message);
      speak(res.message);
      setTimeout(() => setTorchNotice(""), 3500);
    } else if (res.success) {
      announce(res.message);
      speak(res.message);
    }
  };

  // Camera Flip with Accessibility Announcement & Visual Feedback
  const handleToggleCamera = useCallback(async () => {
    if (isSwitching) return;
    const prevMode = facingMode;
    const ok = await toggleFacingMode();
    const currentMode = facingModeRef?.current || (prevMode === "environment" ? "user" : "environment");
    if (ok) {
      const modeLabel = currentMode === "user" ? "Front camera" : "Back camera";
      announce(`Switched to ${modeLabel}`);
      speak(`${modeLabel} active`);
    } else {
      announce("Camera switch failed or device has only one camera.");
      speak("Camera switch not supported or only one camera detected.");
    }
  }, [isSwitching, facingMode, toggleFacingMode, facingModeRef, announce, speak]);

  // ==========================================
  // OCR HIGH-RES SCAN & TEXT EXTRACTION (SECTIONS 8-12, 33-36)
  // ==========================================
  const startOcrScan = useCallback(async () => {
    if (!isActive || isOcrScanning) return;
    setIsOcrMode(true);
    setIsOcrScanning(true);
    setSelectedWordIndices(new Set());
    setSelectedText("");
    setOcrActionMessage("");
    stopSpeaking();
    speak("Scanning document text. Please hold the camera steady.");
    announce("Scanning text from camera view.");

    try {
      // Capture high-resolution native still frame (Section 10)
      const blob = await captureFullFrame("image/jpeg", 0.94);
      if (!blob) {
        speak("Camera frame was not ready. Please try again.");
        setIsOcrScanning(false);
        return;
      }

      const res = await ocrApi.extractText(blob, null, "lens_scan.jpg");
      setOcrData(res);

      if (onOcrCaptured) {
        onOcrCaptured(res, "");
      }

      if (res.words && res.words.length > 0) {
        // Default: auto-select all text for instant accessibility
        const allIndices = new Set(res.words.map((_, i) => i));
        setSelectedWordIndices(allIndices);
        const fullTxt = res.text || res.words.map((w) => w.text).join(" ");
        setSelectedText(fullTxt);
        speak(`Text detected: ${res.words.length} words found. Tap words to select, or use Read, Explain, or Ask Tutor.`);
      } else {
        const warn = res.quality_warning || "No clear text was detected. Try moving closer or turning on the flashlight.";
        speak(warn);
      }
    } catch (err) {
      console.warn("[LiveDetection] High-res OCR scan failed:", err);
      speak("Text scan encountered an error. Please try again.");
    } finally {
      setIsOcrScanning(false);
    }
  }, [isActive, isOcrScanning, captureFullFrame, stopSpeaking, speak, announce, onOcrCaptured]);

  // Exit OCR Text Mode back to Live Object Detection (Section 38 & 39)
  const exitOcrMode = useCallback(() => {
    setIsOcrMode(false);
    setOcrData(null);
    setSelectedWordIndices(new Set());
    setSelectedText("");
    setOcrActionMessage("");
    speak("Returned to live object detection.");
    announce("Returned to object detection mode.");
  }, [speak, announce]);

  // Quick Selection Controls (Section 14)
  const handleSelectAll = useCallback(() => {
    if (!ocrData || !ocrData.words) return;
    const all = new Set(ocrData.words.map((_, i) => i));
    setSelectedWordIndices(all);
    const txt = ocrData.text || ocrData.words.map((w) => w.text).join(" ");
    setSelectedText(txt);
    speak("Selected entire document page.");
    if (onOcrCaptured) onOcrCaptured(ocrData, txt);
  }, [ocrData, speak, onOcrCaptured]);

  const handleSelectParagraph = useCallback(() => {
    if (!ocrData || !ocrData.words || ocrData.words.length === 0) return;
    const targetParId = ocrData.words[0].paragraph_id || "p-1-1";
    const parIndices = new Set();
    const parWords = [];
    ocrData.words.forEach((w, idx) => {
      if (w.paragraph_id === targetParId) {
        parIndices.add(idx);
        parWords.push(w.text);
      }
    });
    setSelectedWordIndices(parIndices);
    const txt = parWords.join(" ");
    setSelectedText(txt);
    speak(`Selected paragraph: ${parWords.length} words.`);
    if (onOcrCaptured) onOcrCaptured(ocrData, txt);
  }, [ocrData, speak, onOcrCaptured]);

  const handleClearSelection = useCallback(() => {
    setSelectedWordIndices(new Set());
    setSelectedText("");
    speak("Cleared text selection.");
    if (onOcrCaptured) onOcrCaptured(ocrData, "");
  }, [speak, onOcrCaptured, ocrData]);

  // ==========================================
  // OCR ACTION BAR COMMANDS: READ / EXPLAIN / SUMMARIZE / ASK TUTOR (SECTIONS 15-20)
  // ==========================================
  const handleReadSelected = useCallback(() => {
    if (!selectedText || !selectedText.trim()) {
      speak("Please select text on the page first.");
      return;
    }
    stopSpeaking();
    speak(selectedText);
  }, [selectedText, stopSpeaking, speak]);

  const handleExplainSelected = useCallback(async () => {
    if (!selectedText || !selectedText.trim()) {
      speak("Please select text to explain.");
      return;
    }
    setOcrActionLoading(true);
    setOcrActionMessage("Explaining selected text...");
    stopSpeaking();
    speak("Analyzing and explaining selected text.");

    try {
      const res = await tutorApi.explain(selectedText.trim());
      const explanation = res.explanation || res.answer || "Explanation complete.";
      setOcrActionMessage(explanation);
      speak(explanation);
    } catch {
      const err = "Unable to connect to tutor explanation service.";
      setOcrActionMessage(err);
      speak(err);
    } finally {
      setOcrActionLoading(false);
    }
  }, [selectedText, stopSpeaking, speak]);

  const handleSummarizeSelected = useCallback(async () => {
    if (!selectedText || !selectedText.trim()) {
      speak("Please select text to summarize.");
      return;
    }
    setOcrActionLoading(true);
    setOcrActionMessage("Summarizing selected text...");
    stopSpeaking();

    try {
      const res = await tutorApi.summarize(selectedText.trim());
      const summary = res.summary || res.answer || "Summary complete.";
      setOcrActionMessage(summary);
      speak(summary);
    } catch {
      const err = "Unable to connect to summary service.";
      setOcrActionMessage(err);
      speak(err);
    } finally {
      setOcrActionLoading(false);
    }
  }, [selectedText, stopSpeaking, speak]);

  const handleAskTutorSelected = useCallback(() => {
    if (!selectedText || !selectedText.trim()) {
      speak("Opening Assistive Tutor.");
      navigate("/assistive-tutor");
      return;
    }
    speak("Opening Assistive Tutor with your selected study text.");
    navigate("/assistive-tutor", {
      state: {
        initialContext: selectedText.trim(),
        contextSource: "ocr",
      },
    });
  }, [selectedText, speak, navigate]);

  // Register external voice command handlers (Section 31 & 32)
  useEffect(() => {
    const unregisterOcr = registerHandler("triggerCameraOcr", startOcrScan);
    const unregisterFlip = registerHandler("flipCamera", handleToggleCamera);
    const unregisterFlash = registerHandler("toggleFlash", handleToggleTorch);
    const unregisterExplain = registerHandler("explainOcr", handleExplainSelected);
    const unregisterSummarize = registerHandler("summarizeOcr", handleSummarizeSelected);
    const unregisterTutor = registerHandler("askTutor", handleAskTutorSelected);
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
      unregisterFlip();
      unregisterFlash();
      unregisterExplain();
      unregisterSummarize();
      unregisterTutor();
      unregisterPause();
      unregisterResume();
    };
  }, [
    registerHandler,
    startOcrScan,
    handleToggleCamera,
    handleToggleTorch,
    handleExplainSelected,
    handleSummarizeSelected,
    handleAskTutorSelected,
    announce,
  ]);

  // Continuous FieldNet V3 Detection Frame Processing
  const performDetection = useCallback(async () => {
    if (isBusyRef.current || isPaused || !videoRef.current || !isActive || isSwitching || isOcrMode) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      return;
    }

    isBusyRef.current = true;
    const currentSeq = ++frameSeqRef.current;
    const startTime = performance.now();

    try {
      const blob = await captureBlob("image/jpeg", 0.82, 640);
      if (!blob) {
        isBusyRef.current = false;
        return;
      }

      const res = await detectionApi.detect(blob, null, true);

      // STALE FRAME PROTECTION: Ignore delayed responses from older frames
      if (currentSeq < latestCompletedSeqRef.current) {
        return;
      }
      latestCompletedSeqRef.current = currentSeq;

      // Store image dimensions returned from backend for canonical normalization
      if (res.image_width && res.image_height) {
        lastFrameMetaRef.current = {
          width: res.image_width,
          height: res.image_height,
        };
      }

      const elapsed = Math.round(performance.now() - startTime);
      setLatency(elapsed);

      const items = res.detections || [];
      setDetections(items);

      if (res.spatial_narration) {
        setLastNarration(res.spatial_narration);

        // SECTION 5.9: Voice announcement gate: ONLY announce temporally confirmed objects!
        const confirmedObjects = stabilizerRef.current.getConfirmedDetections();
        const currentKeys = confirmedObjects
          .map((i) => `${i.label}_${i.position}`)
          .sort()
          .join("|");

        if (
          autoNarrate &&
          autoDetection &&
          !isVoiceSessionOpen &&
          currentKeys !== lastAnnouncedKeysRef.current &&
          confirmedObjects.length > 0
        ) {
          lastAnnouncedKeysRef.current = currentKeys;
          speakAnnouncement(res.spatial_narration);
          announce(res.spatial_narration);
        } else if (confirmedObjects.length === 0 && lastAnnouncedKeysRef.current !== "") {
          lastAnnouncedKeysRef.current = "";
        }
      }
    } catch (err) {
      console.warn("[LiveDetection] Detection non-fatal error:", err);
    } finally {
      isBusyRef.current = false;
    }
  }, [isActive, isPaused, isSwitching, isOcrMode, captureBlob, autoNarrate, autoDetection, isVoiceSessionOpen, speakAnnouncement, announce]);

  // Detection Loop with RequestAnimationFrame & Throttling
  useEffect(() => {
    let mounted = true;

    const loop = async () => {
      if (!mounted) return;
      await performDetection();
      if (mounted && isActive && !isPaused && !isSwitching && !isOcrMode) {
        loopTimeoutRef.current = setTimeout(loop, 400);
      }
    };

    if (isActive && !isPaused && !isSwitching && !isOcrMode) {
      loopTimeoutRef.current = setTimeout(loop, 400);
    }

    return () => {
      mounted = false;
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
    };
  }, [isActive, isPaused, isSwitching, isOcrMode, performDetection]);

  // Auto-start camera on mount if requested (protected by hasAutoStartedRef)
  useEffect(() => {
    if (initialAutoStart && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [initialAutoStart, startCamera, stopCamera]);

  // ==========================================
  // CANVASES: DUAL-MODE RENDERING (NORMAL DETECTION vs OCR SCAN)
  // ==========================================
  const renderOverlay = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const container = containerRef.current;
      if (!canvas || !video || !container) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cWidth = container.clientWidth;
      const cHeight = container.clientHeight;
      if (cWidth === 0 || cHeight === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cWidth * dpr);
      canvas.height = Math.round(cHeight * dpr);

      try {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } catch {
        ctx.scale(dpr, dpr);
      }
      ctx.clearRect(0, 0, cWidth, cHeight);

      const sourceW = lastFrameMetaRef.current.width || video.videoWidth || 640;
      const sourceH = lastFrameMetaRef.current.height || video.videoHeight || 360;

      // ----------------------------------------------------
      // MODE A: OCR TEXT SCANNING OVERLAY (SECTIONS 12, 13, 37)
      // ----------------------------------------------------
      if (isOcrMode) {
        if (!ocrData || !ocrData.words || ocrData.words.length === 0) {
          return;
        }

        // 1. Draw Document Boundary if detected
        if (ocrData.document_bbox && ocrData.document_bbox.length === 4) {
          const mappedDoc = mapDetectionToDisplayCoordinates(
            { normalized_box: ocrData.document_bbox },
            {
              containerWidth: cWidth,
              containerHeight: cHeight,
              sourceWidth: sourceW,
              sourceHeight: sourceH,
              isMirrored,
              zoom,
              isSoftwareZoom: !isHardwareZoomSupported,
            }
          );
          if (mappedDoc) {
            ctx.strokeStyle = "rgba(0, 113, 227, 0.75)";
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 6]);
            ctx.strokeRect(mappedDoc.x, mappedDoc.y, mappedDoc.width, mappedDoc.height);
            ctx.setLineDash([]);
          }
        }

        // 2. Draw Interactive Word Boxes
        ocrData.words.forEach((wordObj, idx) => {
          const mapped = mapDetectionToDisplayCoordinates(
            { normalized_box: wordObj.normalized_box },
            {
              containerWidth: cWidth,
              containerHeight: cHeight,
              sourceWidth: sourceW,
              sourceHeight: sourceH,
              isMirrored,
              zoom,
              isSoftwareZoom: !isHardwareZoomSupported,
            }
          );
          if (!mapped) return;

          const isSelected = selectedWordIndices.has(idx);

          if (isSelected) {
            // Selected highlight: glowing translucent Apple blue pill
            ctx.fillStyle = "rgba(0, 113, 227, 0.38)";
            ctx.strokeStyle = "rgba(0, 113, 227, 0.95)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(mapped.x - 2, mapped.y - 2, mapped.width + 4, mapped.height + 4, 4);
            } else {
              ctx.rect(mapped.x - 2, mapped.y - 2, mapped.width + 4, mapped.height + 4);
            }
            ctx.fill();
            ctx.stroke();
          } else {
            // Subtle boundary for unselected words
            ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            ctx.lineWidth = 1;
            ctx.strokeRect(mapped.x, mapped.y, mapped.width, mapped.height);
          }
        });

        return;
      }

      // ----------------------------------------------------
      // MODE B: NORMAL LIVE OBJECT DETECTION OVERLAY
      // ----------------------------------------------------
      if (!detections || detections.length === 0 || !isActive) {
        if (isDebug) {
          setDebugHudData({
            vWidth: video.videoWidth || 0,
            vHeight: video.videoHeight || 0,
            cWidth,
            cHeight,
            dpr,
            isMirrored,
            count: 0,
          });
        }
        return;
      }

      // 1. Transform each detection through canonical coordinate mapping
      const rawMapped = [];
      detections.forEach((det) => {
        const mapped = mapDetectionToDisplayCoordinates(det, {
          containerWidth: cWidth,
          containerHeight: cHeight,
          sourceWidth: sourceW,
          sourceHeight: sourceH,
          isMirrored,
          zoom,
          isSoftwareZoom: !isHardwareZoomSupported,
        });
        if (mapped) rawMapped.push(mapped);
      });

      // 2. Apply temporal stabilization & confirmation (Section 5.3 & 5.4)
      const displayBoxes = stabilizerRef.current.stabilize(rawMapped);
      const trackerStats = stabilizerRef.current.getStats();

      if (isDebug && displayBoxes.length > 0) {
        setDebugHudData({
          vWidth: video.videoWidth,
          vHeight: video.videoHeight,
          cWidth,
          cHeight,
          dpr,
          isMirrored,
          count: displayBoxes.length,
          confirmed: trackerStats.confirmedCount,
          raw: trackerStats.rawCount,
          scale: rawMapped[0]?.scale || 1,
          offsetX: rawMapped[0]?.offsetX || 0,
          offsetY: rawMapped[0]?.offsetY || 0,
        });
      }

      // 3. Render bounding boxes onto high-DPI canvas
      displayBoxes.forEach((item) => {
        const { x, y, width, height, label, confidence, position, confirmed } = item;
        const displayLabel = `${label.replace(/_/g, " ")} ${(confidence * 100).toFixed(0)}%`;

        let strokeColor = "rgba(0, 113, 227, 0.95)"; // Apple Blue
        let fillColor = "rgba(0, 113, 227, 0.16)";
        let badgeBg = "rgba(0, 113, 227, 0.94)";

        if (position === "left") {
          strokeColor = "rgba(16, 185, 129, 0.95)"; // Emerald
          fillColor = "rgba(16, 185, 129, 0.16)";
          badgeBg = "rgba(16, 185, 129, 0.94)";
        } else if (position === "right") {
          strokeColor = "rgba(245, 158, 11, 0.95)"; // Amber
          fillColor = "rgba(245, 158, 11, 0.16)";
          badgeBg = "rgba(245, 158, 11, 0.94)";
        }

        // Tentative unconfirmed boxes drawn with dashed line
        if (!confirmed) {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.lineWidth = 3;
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;

        ctx.beginPath();
        const radius = 8;
        if (ctx.roundRect) {
          ctx.roundRect(x, y, width, height, radius);
        } else {
          ctx.rect(x, y, width, height);
        }
        ctx.stroke();
        ctx.fill();
        ctx.setLineDash([]);

        // Top compact label badge (Section 63)
        ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";
        const textMetrics = ctx.measureText(displayLabel);
        const paddingH = 8;
        const badgeH = 22;
        const badgeW = textMetrics.width + paddingH * 2;
        const badgeY = Math.max(4, y - badgeH - 4);
        const badgeX = Math.max(4, Math.min(x, cWidth - badgeW - 4));

        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.fillText(displayLabel, badgeX + paddingH, badgeY + 15);
      });
    } catch (err) {
      console.warn("[LiveDetection] Overlay render non-fatal error:", err);
    }
  }, [detections, isActive, isMirrored, isDebug, isOcrMode, ocrData, selectedWordIndices, zoom, isHardwareZoomSupported]);

  // Re-render overlay when detections, window size, orientation, or OCR selection changes
  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  // Observe container resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      renderOverlay();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [renderOverlay]);

  // ==========================================
  // CANVAS TAP / TOUCH SELECTION (SECTION 13)
  // ==========================================
  const handleCanvasClick = (e) => {
    if (!isOcrMode || !ocrData || !ocrData.words || ocrData.words.length === 0) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const sourceW = lastFrameMetaRef.current.width || videoRef.current?.videoWidth || 640;
    const sourceH = lastFrameMetaRef.current.height || videoRef.current?.videoHeight || 360;

    let clickedIdx = -1;
    for (let i = 0; i < ocrData.words.length; i++) {
      const wObj = ocrData.words[i];
      const mapped = mapDetectionToDisplayCoordinates(
        { normalized_box: wObj.normalized_box },
        {
          containerWidth: rect.width,
          containerHeight: rect.height,
          sourceWidth: sourceW,
          sourceHeight: sourceH,
          isMirrored,
          zoom,
          isSoftwareZoom: !isHardwareZoomSupported,
        }
      );
      if (mapped) {
        if (
          clickX >= mapped.x - 4 &&
          clickX <= mapped.x + mapped.width + 4 &&
          clickY >= mapped.y - 4 &&
          clickY <= mapped.y + mapped.height + 4
        ) {
          clickedIdx = i;
          break;
        }
      }
    }

    if (clickedIdx !== -1) {
      const nextSet = new Set(selectedWordIndices);
      if (nextSet.has(clickedIdx)) {
        nextSet.delete(clickedIdx);
      } else {
        nextSet.add(clickedIdx);
      }
      setSelectedWordIndices(nextSet);

      const words = [];
      ocrData.words.forEach((w, idx) => {
        if (nextSet.has(idx)) {
          words.push(w.text);
        }
      });
      const txt = words.join(" ");
      setSelectedText(txt);
      if (onOcrCaptured) onOcrCaptured(ocrData, txt);
    }
  };

  const isListening = voiceState === "listening" || voiceState === "requesting_permission";

  return (
    <section
      ref={sectionRef}
      aria-label="Live Assistive Camera and Vision Interface"
      className={isFullscreen ? "fullscreen-camera-active" : "glass-panel"}
      style={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100dvh",
              maxHeight: "100dvh",
              zIndex: 999999,
              backgroundColor: "#000000",
              padding: 0,
              margin: 0,
              borderRadius: 0,
              border: "none",
              boxShadow: "none",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }
          : {
              padding: "0.75rem",
              borderRadius: "var(--radius-xl)",
              position: "relative",
              overflow: "hidden",
              width: "100%",
              boxShadow: "var(--shadow-elevation-medium)",
            }
      }
    >
      {/* Viewport Frame */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        style={
          isFullscreen
            ? {
                position: "relative",
                width: "100vw",
                height: "100dvh",
                maxHeight: "100dvh",
                zIndex: 1,
                backgroundColor: "#000000",
                borderRadius: 0,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
              }
            : {
                position: "relative",
                width: "100%",
                height: "auto",
                minHeight: "360px",
                aspectRatio: "16 / 9",
                backgroundColor: "#080c14",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }
        }
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
            transform:
              !isHardwareZoomSupported && zoom > 1.0
                ? isMirrored
                  ? `scaleX(-1) scale(${zoom})`
                  : `scale(${zoom})`
                : isMirrored
                ? "scaleX(-1)"
                : "none",
            transformOrigin: "center center",
            transition: "transform 0.15s ease",
            display: isActive ? "block" : "none",
          }}
        />

        {/* Canvas Overlay for Bounding Boxes & Google Lens Text Boxes */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: isOcrMode ? "auto" : "none",
            cursor: isOcrMode ? "pointer" : "default",
            display: isActive ? "block" : "none",
          }}
        />

        {/* Development Coordinate Debug HUD (?debugVision=true) */}
        {isDebug && debugHudData && isActive && (
          <div
            style={{
              position: "absolute",
              top: "3.5rem",
              left: "0.75rem",
              background: "rgba(0, 0, 0, 0.85)",
              color: "#4ade80",
              fontFamily: "monospace",
              fontSize: "0.72rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "8px",
              border: "1px solid rgba(74, 222, 128, 0.4)",
              zIndex: 30,
              pointerEvents: "none",
              lineHeight: 1.4,
              maxWidth: "90%",
            }}
          >
            <div><strong>[VISION COORD DEBUG HUD]</strong></div>
            <div>Camera Sensor: {debugHudData.vWidth} × {debugHudData.vHeight}</div>
            <div>Raw: {debugHudData.raw || 0} | Confirmed: {debugHudData.confirmed || 0}</div>
            <div>Mode: {isOcrMode ? "TEXT SCAN" : "DETECTION"} | Mirrored: {isMirrored ? "YES" : "NO"}</div>
            <div>Latency: {latency || 0}ms</div>
          </div>
        )}

        {/* Flashlight Notice Pill */}
        {torchNotice && (
          <div
            style={{
              position: "absolute",
              top: "3.8rem",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(239, 68, 68, 0.9)",
              color: "#ffffff",
              padding: "0.4rem 0.9rem",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 600,
              zIndex: 35,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            {torchNotice}
          </div>
        )}

        {/* Floating Top Bar (Status + Flash + Flip + Fullscreen) */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: isFullscreen ? "calc(0.75rem + env(safe-area-inset-top, 0px))" : "0.75rem",
              left: isFullscreen ? "calc(0.75rem + env(safe-area-inset-left, 0px))" : "0.75rem",
              right: isFullscreen ? "calc(0.75rem + env(safe-area-inset-right, 0px))" : "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 30,
              pointerEvents: "none",
              gap: "0.4rem",
            }}
          >
            {/* Live Indicator Pill & Exit Fullscreen Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                pointerEvents: "auto",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  background: isOcrMode ? "rgba(0, 113, 227, 0.85)" : "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "999px",
                  border: isOcrMode
                    ? "1px solid rgba(0, 113, 227, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 650,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isOcrMode
                      ? "var(--accent-primary)"
                      : isPaused
                      ? "var(--accent-amber)"
                      : "var(--accent-green)",
                    boxShadow: isOcrMode
                      ? "0 0 8px var(--accent-primary)"
                      : isPaused
                      ? "0 0 8px var(--accent-amber)"
                      : "0 0 8px var(--accent-green)",
                  }}
                />
                <span>{isOcrMode ? "TEXT" : isPaused ? "PAUSED" : "LIVE"}</span>
              </div>

              {isFullscreen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen(e);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen(e);
                  }}
                  aria-label="Exit Fullscreen Camera View"
                  style={{
                    background: "rgba(0, 0, 0, 0.75)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    color: "#ffffff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                  title="Exit Fullscreen"
                >
                  <Minimize2 size={13} />
                  <span>Exit</span>
                </button>
              )}

              {!isOcrMode && !isFullscreen ? (
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.65)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {detections.length} {detections.length === 1 ? "Obj" : "Objs"}
                </div>
              ) : isOcrMode ? (
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.65)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  {selectedWordIndices.size} Sel
                </div>
              ) : null}
            </div>

            {/* Top Right Action Buttons: Zoom + Flash + Flip Camera + Fullscreen */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", pointerEvents: "auto", flexWrap: "nowrap", justifyContent: "flex-end" }}>
              {/* Camera Zoom Control (Minus, Level, Plus) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  padding: "0.15rem 0.35rem",
                  gap: "1px",
                }}
              >
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= (zoomRange?.min || 1.0)}
                  aria-label="Zoom out"
                  title="Zoom Out"
                  style={{
                    background: "none",
                    border: "none",
                    color: zoom <= (zoomRange?.min || 1.0) ? "rgba(255, 255, 255, 0.35)" : "#ffffff",
                    cursor: zoom <= (zoomRange?.min || 1.0) ? "default" : "pointer",
                    padding: "3px 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  aria-label={`Zoom level ${zoom.toFixed(1)}x. Tap to reset`}
                  title="Reset Zoom to 1.0x"
                  style={{
                    background: "none",
                    border: "none",
                    color: zoom > 1.0 ? "var(--accent-primary, #0071e3)" : "#ffffff",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "1px 3px",
                    minWidth: "2.2rem",
                    textAlign: "center",
                  }}
                >
                  {zoom.toFixed(1)}x
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= (zoomRange?.max || 3.0)}
                  aria-label="Zoom in"
                  title="Zoom In"
                  style={{
                    background: "none",
                    border: "none",
                    color: zoom >= (zoomRange?.max || 3.0) ? "rgba(255, 255, 255, 0.35)" : "#ffffff",
                    cursor: zoom >= (zoomRange?.max || 3.0) ? "default" : "pointer",
                    padding: "3px 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Camera Flash / Torch Button (Section 7) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleTorch();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleTorch();
                }}
                aria-label={isTorchOn ? "Turn off camera flash" : "Turn on camera flash"}
                style={{
                  background: isTorchOn ? "var(--accent-amber)" : "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "0.45rem 0.65rem",
                  minWidth: "38px",
                  minHeight: "38px",
                  borderRadius: "999px",
                  border: isTorchOn
                    ? "1px solid var(--accent-amber)"
                    : "1px solid rgba(255, 255, 255, 0.15)",
                  color: isTorchOn ? "#000000" : "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  transition: "all var(--motion-fast)",
                }}
                title={isTorchOn ? "Turn Flash Off" : "Turn Flash On"}
              >
                {isTorchOn ? <Zap size={15} fill="#000000" /> : <Zap size={15} />}
              </button>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleCamera();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleCamera();
                }}
                disabled={isSwitching}
                aria-label={`Flip camera. Currently using ${facingMode === "environment" ? "back" : "front"} camera`}
                style={{
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "0.45rem 0.65rem",
                  minHeight: "38px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: isSwitching ? "wait" : "pointer",
                  opacity: isSwitching ? 0.7 : 1,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  touchAction: "manipulation",
                  transition: "transform var(--motion-fast)",
                }}
                title="Switch Front/Back camera"
              >
                <SwitchCamera size={15} className={isSwitching ? "animate-spin" : ""} />
                <span>{isSwitching ? "..." : facingMode === "environment" ? "Back" : "Front"}</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFullscreen(e);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFullscreen(e);
                }}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Immersive Fullscreen"}
                style={{
                  background: isFullscreen ? "var(--accent-primary, #0071e3)" : "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  padding: "0.45rem 0.65rem",
                  minWidth: "38px",
                  minHeight: "38px",
                  borderRadius: "999px",
                  border: isFullscreen ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  boxShadow: isFullscreen ? "0 0 12px rgba(0, 113, 227, 0.6)" : "none",
                  transition: "all var(--motion-fast)",
                }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Camera (Hero View)"}
              >
                {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            </div>
          </div>
        )}

        {/* Text Mode Selection Toolbar (Section 14 & 39) */}
        {isActive && isOcrMode && (
          <div
            style={{
              position: "absolute",
              top: "3.2rem",
              left: "0.75rem",
              right: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.45rem",
              zIndex: 22,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleSelectAll}
              className="glass-btn"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
              title="Select all detected text on the page"
            >
              Select All
            </button>
            <button
              onClick={handleSelectParagraph}
              className="glass-btn"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
              title="Select paragraph"
            >
              Select Paragraph
            </button>
            <button
              onClick={handleClearSelection}
              className="glass-btn"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
              title="Clear selection"
            >
              Clear
            </button>
            <button
              onClick={startOcrScan}
              disabled={isOcrScanning}
              className="glass-btn"
              style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
              title="Rescan page"
            >
              <RefreshCw size={13} className={isOcrScanning ? "animate-spin" : ""} />
              <span>Rescan</span>
            </button>
            <button
              onClick={exitOcrMode}
              style={{
                background: "rgba(239, 68, 68, 0.8)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                color: "#ffffff",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
              }}
              title="Exit Text Scan Mode"
            >
              <X size={13} />
              <span>Exit Text Mode</span>
            </button>
          </div>
        )}

        {/* Selected Text Floating Action Bar (Sections 15-20) */}
        {isActive && isOcrMode && selectedText && (
          <div
            style={{
              position: "absolute",
              bottom: isFullscreen ? "calc(0.85rem + env(safe-area-inset-bottom, 0px))" : "0.85rem",
              left: isFullscreen ? "calc(0.75rem + env(safe-area-inset-left, 0px))" : "0.75rem",
              right: isFullscreen ? "calc(0.75rem + env(safe-area-inset-right, 0px))" : "0.75rem",
              background: "rgba(10, 15, 26, 0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(0, 113, 227, 0.4)",
              borderRadius: "var(--radius-lg)",
              padding: "0.75rem 1rem",
              zIndex: 25,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Selected Text ({selectedWordIndices.size} words):
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  onClick={handleCopySelected}
                  style={{
                    background: isCopiedSelected ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: isCopiedSelected ? "var(--accent-green)" : "var(--text-secondary)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Copy full selected text"
                >
                  {isCopiedSelected ? <Check size={11} /> : <Copy size={11} />}
                  <span>{isCopiedSelected ? "Copied" : "Copy"}</span>
                </button>
                <div style={{ fontSize: "0.72rem", color: "var(--accent-primary)", fontWeight: 650 }}>
                  Active Ground Truth
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: "0.85rem",
                color: "#ffffff",
                lineHeight: 1.45,
                maxHeight: "5.5rem",
                overflowY: "auto",
                fontFamily: "inherit",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                userSelect: "text",
                padding: "0.3rem 0.5rem",
                background: "rgba(0, 0, 0, 0.25)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              {selectedText}
            </div>

            {/* Action Buttons: Read Aloud | Microphone | Ask Tutor */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
              <button
                onClick={handleReadSelected}
                className="glass-btn primary"
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.78rem" }}
                title="Read selected text aloud"
              >
                <Volume2 size={14} />
                <span>Read Aloud</span>
              </button>

              {/* OCR Voice Query Button (Sections 1 & 8 of MASTER PROMPT) */}
              <button
                type="button"
                onClick={() => {
                  if (voiceState === "listening" || voiceState === "requesting_permission") {
                    stopListening();
                  } else if (isVoiceSessionOpen) {
                    closeVoiceSession();
                  } else {
                    startListening(selectedText, "OCR Document");
                  }
                }}
                className="glass-btn"
                style={{
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.78rem",
                  background:
                    isVoiceSessionOpen
                      ? "var(--accent-green, #10b981)"
                      : "rgba(255, 255, 255, 0.08)",
                  borderColor:
                    isVoiceSessionOpen
                      ? "var(--accent-green, #10b981)"
                      : "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  boxShadow:
                    voiceState === "listening" || voiceState === "requesting_permission"
                      ? "0 0 12px rgba(16, 185, 129, 0.6)"
                      : "none",
                }}
                title={
                  voiceState === "listening"
                    ? "Listening... Tap to stop"
                    : "Ask question about selected text using your voice"
                }
              >
                <Mic
                  size={14}
                  className={
                    voiceState === "listening" || voiceState === "requesting_permission"
                      ? "animate-pulse"
                      : ""
                  }
                />
                <span>
                  {voiceState === "listening"
                    ? "Listening..."
                    : voiceState === "thinking"
                    ? "Thinking..."
                    : "Ask Mic"}
                </span>
              </button>

              <button
                onClick={handleAskTutorSelected}
                style={{
                  background: "var(--accent-primary)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "0.45rem 0.85rem",
                  fontSize: "0.78rem",
                  fontWeight: 650,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  marginLeft: "auto",
                  boxShadow: "0 2px 10px rgba(0, 113, 227, 0.4)",
                }}
                title="Ask question about this text in Assistive Tutor"
              >
                <Bot size={15} />
                <span>Ask Tutor</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {ocrActionMessage && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--accent-green)",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  lineHeight: 1.3,
                }}
              >
                {ocrActionMessage}
              </div>
            )}
          </div>
        )}

        {/* Primary Voice Assistant Microphone & Dialogue Panel */}
        {isVoiceSessionOpen && (
          <VoiceWaveformOverlay
            voiceState={voiceState}
            transcript={transcript}
            interimTranscript={interimTranscript}
            onStop={stopListening}
            onCancel={closeVoiceSession}
            targetContextName={activeContextName || (isOcrMode ? "OCR Document" : "Vision Mode")}
            position={isOcrMode ? "top" : "bottom"}
          />
        )}

        {/* Floating Bottom Bar in Normal Mode (Read Text, Mic, Speaker, Pause) */}
        {isActive && !isOcrMode && (
          <div
            style={{
              position: "absolute",
              bottom: isFullscreen ? "calc(0.85rem + env(safe-area-inset-bottom, 0px))" : "0.85rem",
              left: isFullscreen ? "calc(0.75rem + env(safe-area-inset-left, 0px))" : "0.75rem",
              right: isFullscreen ? "calc(0.75rem + env(safe-area-inset-right, 0px))" : "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 15,
            }}
          >
            {/* Left Controls: Read Text Trigger (Enters Google Lens Mode) */}
            <button
              onClick={startOcrScan}
              disabled={isOcrScanning}
              aria-label="Scan document and enter text selection mode"
              style={{
                background: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                borderRadius: "999px",
                padding: "0.55rem 0.95rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 650,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
              }}
              title="Point camera at textbook and tap to read text"
            >
              <ScanLine size={16} color="var(--accent-amber)" />
              <span>Read Text</span>
            </button>

            {/* Right Controls: Mic, Speaker (Mute), Pause */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Microphone: User Speech Input Only */}
              <button
                type="button"
                onClick={() => {
                  if (voiceState === "listening" || voiceState === "requesting_permission") {
                    stopListening();
                  } else if (isVoiceSessionOpen) {
                    closeVoiceSession();
                  } else {
                    startListening(null, "Vision Mode");
                  }
                }}
                aria-label={
                  isVoiceSessionOpen
                    ? "Voice assistant open... Tap to close"
                    : "Activate voice assistant"
                }
                style={{
                  background:
                    isVoiceSessionOpen
                      ? "var(--accent-green, #10b981)"
                      : voiceState === "thinking" || voiceState === "processing_speech"
                      ? "var(--accent-blue, #0071e3)"
                      : "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border:
                    isVoiceSessionOpen
                      ? "1px solid var(--accent-green, #10b981)"
                      : "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all var(--motion-fast)",
                  boxShadow:
                    voiceState === "listening" || voiceState === "requesting_permission"
                      ? "0 0 16px rgba(16, 185, 129, 0.75)"
                      : "none",
                }}
                title={
                  voiceState === "listening"
                    ? "Listening... Tap to stop"
                    : voiceState === "thinking"
                    ? "Thinking..."
                    : "Voice Assistant (Microphone)"
                }
              >
                {voiceState === "thinking" || voiceState === "processing_speech" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Mic
                    size={18}
                    className={
                      voiceState === "listening" || voiceState === "requesting_permission"
                        ? "animate-pulse"
                        : ""
                    }
                  />
                )}
              </button>

              {/* Mute Button: Pulses green ONLY when assistant is actively speaking! */}
              <button
                type="button"
                onClick={() => setAutoNarrate((prev) => !prev)}
                aria-label={
                  autoNarrate
                    ? "Disable speech announcements (Mute)"
                    : "Enable speech announcements (Unmute)"
                }
                style={{
                  background:
                    autoNarrate && isSpeaking
                      ? "var(--accent-green, #10b981)"
                      : autoNarrate
                      ? "rgba(0, 0, 0, 0.75)"
                      : "rgba(239, 68, 68, 0.8)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border:
                    autoNarrate && isSpeaking
                      ? "1px solid var(--accent-green, #10b981)"
                      : "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all var(--motion-fast)",
                  boxShadow:
                    autoNarrate && isSpeaking
                      ? "0 0 16px rgba(16, 185, 129, 0.75)"
                      : "none",
                }}
                title={
                  autoNarrate && isSpeaking
                    ? "Assistant is Speaking"
                    : autoNarrate
                    ? "Speech Enabled (Click to Mute)"
                    : "Speech Muted (Click to Unmute)"
                }
              >
                {autoNarrate ? (
                  <Volume2 size={18} className={isSpeaking ? "animate-pulse" : ""} />
                ) : (
                  <VolumeX size={18} />
                )}
              </button>

              {/* Pause Button: Pauses vision monitoring only */}
              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                aria-label={isPaused ? "Resume vision monitoring" : "Pause vision monitoring"}
                style={{
                  background: isPaused ? "var(--accent-amber)" : "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: isPaused ? "#000000" : "#ffffff",
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all var(--motion-fast)",
                }}
                title={isPaused ? "Resume Stream" : "Pause Stream"}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Fallback & Inactive States */}
        {!isActive && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              maxWidth: "480px",
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
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
                    HTTPS Required on Mobile
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Mobile browsers strictly block camera access over plain HTTP. Open the secure address on your mobile device:
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      const url = `https://${window.location.hostname}:${window.location.port || "5173"}${window.location.pathname}`;
                      navigator.clipboard.writeText(url);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2500);
                    }}
                    className="glass-btn primary"
                    style={{ padding: "0.6rem 1rem", fontSize: "0.82rem" }}
                  >
                    {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedUrl ? "Copied HTTPS URL" : "Copy HTTPS URL"}</span>
                  </button>
                </div>
              </>
            ) : errorType === "PERMISSION_DENIED" ? (
              <>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "var(--accent-red)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={28} />
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Camera Permission Denied
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  {camError || "Please allow camera permissions in your mobile browser settings to start live assistive vision."}
                </p>
                <GlassButton variant="primary" onClick={() => startCamera()}>
                  <RefreshCw size={16} />
                  <span>Try Again</span>
                </GlassButton>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(0, 113, 227, 0.15)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Camera size={28} />
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Camera is Ready
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
                  Point your camera at your study desk or textbook to start live assistive object detection and Google Lens-style reading.
                </p>
                <GlassButton variant="primary" onClick={() => startCamera()} style={{ padding: "0.75rem 1.75rem" }}>
                  <Play size={18} />
                  <span>Start Camera</span>
                </GlassButton>
              </>
            )}
          </div>
        )}
      </div>

      {/* Real-Time Status Bar below Camera Viewport */}
      {!isFullscreen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.75rem",
            padding: "0.25rem 0.5rem",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu size={15} style={{ color: "var(--accent-primary)" }} />
            <span>FieldNet V3 Neural Engine + Tesseract OCR</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {latency !== null && (
              <span>
                Latency: <strong style={{ color: latency < 120 ? "var(--accent-green)" : "var(--accent-amber)" }}>{latency}ms</strong>
              </span>
            )}
            <div>Facing: {facingMode === "environment" ? "Back (World)" : "Front (User)"}</div>
          </div>
        </div>
      )}
    </section>
  );
}
