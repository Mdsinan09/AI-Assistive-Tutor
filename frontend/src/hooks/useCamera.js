import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Diagnostic helper to evaluate camera environment capabilities
 */
export function getCameraDiagnostics() {
  const isBrowser = typeof window !== "undefined";
  const isSecure = isBrowser ? Boolean(window.isSecureContext) : false;
  const isLocalhost = isBrowser
    ? window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]"
    : false;
  const hasNavigator = typeof navigator !== "undefined";
  const hasMediaDevices = Boolean(hasNavigator && navigator.mediaDevices);
  const hasGetUserMedia = Boolean(hasMediaDevices && navigator.mediaDevices.getUserMedia);

  let status = "READY";
  let diagnosticCode = "OK";
  let message = "Camera system supported.";
  let recommendedAction = null;

  if (!isSecure && !isLocalhost) {
    status = "INSECURE_CONTEXT";
    diagnosticCode = "INSECURE_HTTP";
    message =
      "Camera access is blocked by mobile browsers over plain HTTP. Mobile browsers strictly require HTTPS to access camera hardware.";
    
    // Construct recommended HTTPS URL
    const httpsUrl = isBrowser
      ? `https://${window.location.hostname}:${window.location.port || "5173"}${window.location.pathname}${window.location.search}`
      : "https://...";
    recommendedAction = `Please open the HTTPS address on your mobile device: ${httpsUrl} and accept the local self-signed certificate.`;
  } else if (!hasMediaDevices || !hasGetUserMedia) {
    status = "UNSUPPORTED";
    diagnosticCode = "API_MISSING";
    message = "Your browser does not support the WebRTC MediaDevices camera API.";
    recommendedAction = "Please use a modern browser such as Chrome, Safari, or Firefox.";
  }

  return {
    isSecure,
    isLocalhost,
    hasMediaDevices,
    hasGetUserMedia,
    status,
    diagnosticCode,
    message,
    recommendedAction,
    protocol: isBrowser ? window.location.protocol : "unknown",
    hostname: isBrowser ? window.location.hostname : "unknown",
  };
}

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const facingModeRef = useRef("environment");
  const activeDeviceIdRef = useRef(null);
  const isSwitchingRef = useRef(false);
  const availableDevicesRef = useRef([]);

  // Default facing mode is "environment" (Back Camera)
  const [facingMode, setFacingMode] = useState("environment");
  const [isActive, setIsActive] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [diagnostics, setDiagnostics] = useState(getCameraDiagnostics);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [zoomRange, setZoomRange] = useState({ min: 1.0, max: 3.0, step: 0.1, supported: false });
  const [isHardwareZoomSupported, setIsHardwareZoomSupported] = useState(false);

  // Stop camera stream cleanly and release all hardware tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          try {
            track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
          } catch {}
          track.stop();
        });
      } catch (err) {
        console.warn("[useCamera] Error stopping stream tracks:", err);
      }
      streamRef.current = null;
    }

    setIsTorchOn(false);

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Refresh device enumeration
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setAvailableDevices(videoDevices);
      availableDevicesRef.current = videoDevices;
      return videoDevices;
    } catch (err) {
      console.warn("[useCamera] Device enumeration warning:", err);
      return [];
    }
  }, []);

  // Bind an acquired stream to the video element and update facing mode states
  const bindStreamToVideo = useCallback(
    async (acquiredStream, requestedFacing = null) => {
      streamRef.current = acquiredStream;

      const currentTrack = acquiredStream.getVideoTracks()[0];
      let actualFacing = requestedFacing;
      let currentDeviceId = null;

      if (currentTrack) {
        const settings = currentTrack.getSettings ? currentTrack.getSettings() : {};
        currentDeviceId = settings.deviceId || null;
        const trackLabel = (currentTrack.label || "").toLowerCase();

        // Detect real facing mode from track settings or hardware label
        if (settings.facingMode) {
          actualFacing = settings.facingMode;
        } else if (
          trackLabel.includes("front") ||
          trackLabel.includes("user") ||
          trackLabel.includes("selfie") ||
          trackLabel.includes("facetime") ||
          trackLabel.includes("inner")
        ) {
          actualFacing = "user";
        } else if (
          trackLabel.includes("back") ||
          trackLabel.includes("rear") ||
          trackLabel.includes("environment") ||
          trackLabel.includes("world") ||
          trackLabel.includes("outer") ||
          trackLabel.includes("main")
        ) {
          actualFacing = "environment";
        }

        // Attempt to apply continuous autofocus if supported by device hardware
        try {
          const capabilities = currentTrack.getCapabilities ? currentTrack.getCapabilities() : {};
          if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
            currentTrack.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
          }
        } catch {}
      }

      if (!actualFacing) {
        actualFacing = "environment";
      }

      facingModeRef.current = actualFacing;
      setFacingMode(actualFacing);

      if (currentDeviceId) {
        activeDeviceIdRef.current = currentDeviceId;
        setActiveDeviceId(currentDeviceId);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = acquiredStream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn("[useCamera] Video play error (non-fatal):", e);
        }
      }

      setHasPermission(true);
      setIsActive(true);
      refreshDevices();

      // Check for torch / flashlight hardware capability on active track
      let supportsTorch = false;
      if (currentTrack && typeof currentTrack.getCapabilities === "function") {
        try {
          const caps = currentTrack.getCapabilities();
          supportsTorch = Boolean(caps.torch);
        } catch {
          supportsTorch = false;
        }
      }
      setIsTorchSupported(supportsTorch);
      setIsTorchOn(false);

      // Check for camera zoom capability on active track
      let hwZoomSupported = false;
      let detectedZoomRange = { min: 1.0, max: 3.0, step: 0.1, supported: false };
      if (currentTrack && typeof currentTrack.getCapabilities === "function") {
        try {
          const caps = currentTrack.getCapabilities();
          if (caps.zoom) {
            hwZoomSupported = true;
            detectedZoomRange = {
              min: caps.zoom.min || 1.0,
              max: caps.zoom.max || 3.0,
              step: caps.zoom.step || 0.1,
              supported: true,
            };
          }
        } catch (_) {}
      }
      setIsHardwareZoomSupported(hwZoomSupported);
      setZoomRange(detectedZoomRange);
      setZoom(detectedZoomRange.min || 1.0);

      return true;
    },
    [refreshDevices]
  );

  // Start camera with specific facing mode or deviceId
  const startCamera = useCallback(
    async (requestedFacingMode = null, requestedDeviceId = null) => {
      const diag = getCameraDiagnostics();
      setDiagnostics(diag);

      // Handle Insecure HTTP Context
      if (diag.status === "INSECURE_CONTEXT") {
        setHasPermission(false);
        setIsActive(false);
        setErrorType("INSECURE_CONTEXT");
        setErrorMessage(diag.message);
        return false;
      }

      // Handle Unsupported Browser
      if (diag.status === "UNSUPPORTED") {
        setHasPermission(false);
        setIsActive(false);
        setErrorType("UNSUPPORTED");
        setErrorMessage(diag.message);
        return false;
      }

      const targetFacing = requestedFacingMode || facingModeRef.current || "environment";

      // Always stop previous stream tracks and allow mobile hardware to release the camera pipeline
      stopCamera();
      await new Promise((resolve) => setTimeout(resolve, 120));

      setErrorMessage("");
      setErrorType(null);

      // Construct video constraints with progressive fallback
      const constraintsList = [];

      // 1. If explicit device ID was requested, attempt exact deviceId
      if (requestedDeviceId) {
        constraintsList.push({
          video: {
            deviceId: { exact: requestedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        constraintsList.push({
          video: {
            deviceId: { exact: requestedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        constraintsList.push({
          video: { deviceId: requestedDeviceId },
          audio: false,
        });
      }

      // 2. Exact facingMode with ideal 1080p Full HD resolution
      constraintsList.push({
        video: {
          facingMode: { exact: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      // 3. Exact facingMode with 720p HD resolution
      constraintsList.push({
        video: {
          facingMode: { exact: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // 4. Exact facingMode (unconstrained resolution)
      constraintsList.push({
        video: {
          facingMode: { exact: targetFacing },
        },
        audio: false,
      });

      // 5. Ideal facingMode with 1080p / 720p resolution
      constraintsList.push({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      constraintsList.push({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // 6. Simple facingMode
      constraintsList.push({
        video: { facingMode: targetFacing },
        audio: false,
      });

      // 7. Generic video fallback (only when no specific camera or facing mode is enforced)
      if (!requestedFacingMode && !requestedDeviceId) {
        constraintsList.push({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        constraintsList.push({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        constraintsList.push({
          video: true,
          audio: false,
        });
      }

      let acquiredStream = null;
      let lastError = null;

      for (const constraints of constraintsList) {
        try {
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (acquiredStream) break;
        } catch (err) {
          lastError = err;
          // If permission is outright denied, stop attempting lower constraints
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError" ||
            err.name === "SecurityError"
          ) {
            break;
          }
        }
      }

      if (!acquiredStream) {
        console.error("[useCamera] Failed to acquire camera stream:", lastError);
        setHasPermission(false);
        setIsActive(false);

        if (lastError?.name === "NotAllowedError" || lastError?.name === "PermissionDeniedError") {
          setErrorType("PERMISSION_DENIED");
          setErrorMessage("Camera access is blocked. Please allow camera permissions in your browser settings and tap Try Again.");
        } else if (lastError?.name === "NotReadableError" || lastError?.name === "TrackStartError") {
          setErrorType("DEVICE_IN_USE");
          setErrorMessage("Camera is currently in use or releasing hardware. Please try again in a moment.");
        } else if (lastError?.name === "NotFoundError" || lastError?.name === "DevicesNotFoundError") {
          setErrorType("NO_CAMERA");
          setErrorMessage("No physical camera device was detected on your device.");
        } else if (lastError?.name === "OverconstrainedError") {
          setErrorType("OVERCONSTRAINED");
          setErrorMessage("Camera hardware cannot satisfy the requested resolution or facing mode.");
        } else {
          setErrorType("INITIALIZATION_FAILED");
          setErrorMessage(
            lastError?.message
              ? `Camera error: ${lastError.message}`
              : "Unable to start camera. Please verify device permissions and try again."
          );
        }
        return false;
      }

      try {
        return await bindStreamToVideo(acquiredStream, targetFacing);
      } catch (err) {
        console.error("[useCamera] Video stream binding error:", err);
        setErrorMessage("Failed to render camera stream.");
        setErrorType("BINDING_FAILED");
        stopCamera();
        return false;
      }
    },
    [stopCamera, bindStreamToVideo]
  );

  // Toggle between Back (environment) and Front (user) cameras
  const toggleFacingMode = useCallback(async () => {
    if (isSwitchingRef.current) return false;
    isSwitchingRef.current = true;
    setIsSwitching(true);

    const currentFacing = facingModeRef.current;
    const targetFacing = currentFacing === "environment" ? "user" : "environment";
    console.log(`[useCamera] Toggling camera facing: ${currentFacing} -> ${targetFacing}`);

    try {
      // 1. Fetch fresh list of enumerated video devices
      const devices = await refreshDevices();
      const currentDevId = activeDeviceIdRef.current;

      // 2. Identify candidates for switching
      let targetDeviceId = null;

      if (devices.length > 1) {
        // A. Check if any device has a label matching targetFacing
        const targetKeywords =
          targetFacing === "user"
            ? ["front", "user", "selfie", "facetime", "inner"]
            : ["back", "rear", "environment", "world", "outer", "main"];

        const labeledMatch = devices.find((d) => {
          const l = (d.label || "").toLowerCase();
          return targetKeywords.some((kw) => l.includes(kw)) && d.deviceId !== currentDevId;
        });

        if (labeledMatch) {
          targetDeviceId = labeledMatch.deviceId;
          console.log(`[useCamera] Found labeled match for ${targetFacing}:`, labeledMatch.label);
        } else {
          // B. Cycle to the next device if current active device is known
          const currentIndex = devices.findIndex((d) => d.deviceId === currentDevId);
          if (currentIndex !== -1) {
            const nextDevice = devices[(currentIndex + 1) % devices.length];
            targetDeviceId = nextDevice.deviceId;
            console.log(`[useCamera] Cycling to next enumerated device:`, nextDevice.label || nextDevice.deviceId);
          } else {
            // Pick a device different from current
            const otherDevice = devices.find((d) => d.deviceId !== currentDevId);
            if (otherDevice) {
              targetDeviceId = otherDevice.deviceId;
            }
          }
        }
      }

      // 3. Attempt switch using target facing mode with exact constraints
      let ok = await startCamera(targetFacing, targetDeviceId);

      // 4. If targetDeviceId was attempted and failed, try standard targetFacing
      if (!ok && targetDeviceId) {
        console.log(`[useCamera] Switch by deviceId failed, retrying with facingMode: ${targetFacing}`);
        ok = await startCamera(targetFacing, null);
      }

      // 5. If exact targetFacing failed, and there are multiple devices, try cycling through devices
      if (!ok && devices.length > 1) {
        for (const dev of devices) {
          if (dev.deviceId !== currentDevId && dev.deviceId !== targetDeviceId) {
            console.log(`[useCamera] Trying alternative device:`, dev.label || dev.deviceId);
            ok = await startCamera(null, dev.deviceId);
            if (ok) break;
          }
        }
      }

      // 6. If all switch attempts failed, restore previous camera so user is not left with a broken screen
      if (!ok) {
        console.warn("[useCamera] Camera switch could not find another camera, restoring original camera");
        await startCamera(currentFacing, currentDevId);
        return false;
      }

      return true;
    } catch (err) {
      console.error("[useCamera] Camera switch error:", err);
      return false;
    } finally {
      isSwitchingRef.current = false;
      setIsSwitching(false);
    }
  }, [refreshDevices, startCamera]);

  // Toggle phone camera torch / flashlight where supported
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) {
      return {
        success: false,
        supported: false,
        message: "Camera stream is not active.",
      };
    }

    let supportsTorch = false;
    if (typeof track.getCapabilities === "function") {
      try {
        const caps = track.getCapabilities();
        supportsTorch = Boolean(caps.torch);
      } catch {
        supportsTorch = false;
      }
    }

    if (!supportsTorch) {
      return {
        success: false,
        supported: false,
        message: "Flashlight control is not supported on this device.",
      };
    }

    const nextTorch = !isTorchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
      return {
        success: true,
        supported: true,
        isOn: nextTorch,
        message: nextTorch ? "Camera flash turned on." : "Camera flash turned off.",
      };
    } catch (err) {
      console.warn("[useCamera] Torch constraint error:", err);
      return {
        success: false,
        supported: true,
        message: "Unable to toggle camera flashlight.",
      };
    }
  }, [isTorchOn]);

  // Set camera zoom level with hardware constraint application where supported
  const setZoomLevel = useCallback(
    async (requestedZoom) => {
      const minZ = zoomRange.min || 1.0;
      const maxZ = zoomRange.max || 3.0;
      const clamped = Math.max(minZ, Math.min(maxZ, requestedZoom));
      const rounded = Math.round(clamped * 10) / 10;
      setZoom(rounded);

      if (isHardwareZoomSupported && streamRef.current) {
        const vTrack = streamRef.current.getVideoTracks()[0];
        if (vTrack) {
          try {
            await vTrack.applyConstraints({
              advanced: [{ zoom: rounded }],
            });
          } catch (e) {
            console.debug("[useCamera] Hardware zoom constraint failed, relying on preview zoom:", e);
          }
        }
      }
      return rounded;
    },
    [zoomRange, isHardwareZoomSupported]
  );

  const zoomIn = useCallback(() => {
    const step = zoomRange.step || 0.2;
    const maxZ = zoomRange.max || 3.0;
    const next = Math.min(maxZ, Math.round((zoom + step) * 10) / 10);
    return setZoomLevel(next);
  }, [zoom, zoomRange, setZoomLevel]);

  const zoomOut = useCallback(() => {
    const step = zoomRange.step || 0.2;
    const minZ = zoomRange.min || 1.0;
    const next = Math.max(minZ, Math.round((zoom - step) * 10) / 10);
    return setZoomLevel(next);
  }, [zoom, zoomRange, setZoomLevel]);

  const resetZoom = useCallback(() => {
    return setZoomLevel(zoomRange.min || 1.0);
  }, [zoomRange, setZoomLevel]);

  // Capture frame as JPEG blob with optional scaling for efficient mobile transmission
  const captureBlob = useCallback(
    (format = "image/jpeg", quality = 0.82, maxDimension = 640) => {
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < 2) {
        return null;
      }

      const origW = video.videoWidth || 640;
      const origH = video.videoHeight || 480;

      // Calculate scaled dimensions to preserve aspect ratio
      let targetW = origW;
      let targetH = origH;
      if (maxDimension && (origW > maxDimension || origH > maxDimension)) {
        if (origW >= origH) {
          targetW = maxDimension;
          targetH = Math.round((origH * maxDimension) / origW);
        } else {
          targetH = maxDimension;
          targetW = Math.round((origW * maxDimension) / origH);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.drawImage(video, 0, 0, targetW, targetH);

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          format,
          quality
        );
      });
    },
    []
  );

  // High-resolution capture for OCR document reading from the same camera
  const captureFullFrame = useCallback((format = "image/jpeg", quality = 0.96) => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState < 2) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        format,
        quality
      );
    });
  }, []);

  // Cleanup on unmount: ALWAYS stop all media tracks
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isActive,
    isSwitching,
    hasPermission,
    facingMode,
    facingModeRef,
    isTorchSupported,
    isTorchOn,
    toggleTorch,
    errorMessage,
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
  };
}

export default useCamera;
