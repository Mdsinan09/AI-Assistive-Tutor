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

  // Stop camera stream cleanly and release all hardware tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn("[useCamera] Error stopping stream tracks:", err);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Refresh device enumeration
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setAvailableDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

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

      const targetFacing = requestedFacingMode || facingMode;

      // Always stop previous stream tracks before acquiring a new one
      stopCamera();
      setErrorMessage("");
      setErrorType(null);

      // Construct video constraints with progressive fallback
      const constraintsList = [];

      if (requestedDeviceId) {
        constraintsList.push({
          video: {
            deviceId: { exact: requestedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      // 1. Primary: exact/ideal facingMode with HD resolution
      constraintsList.push({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // 2. Fallback: simple facingMode
      constraintsList.push({
        video: { facingMode: targetFacing },
        audio: false,
      });

      // 3. Fallback: any video input
      constraintsList.push({
        video: true,
        audio: false,
      });

      let acquiredStream = null;
      let lastError = null;

      for (const constraints of constraintsList) {
        try {
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (acquiredStream) break;
        } catch (err) {
          lastError = err;
          // If permission is outright denied, no need to try lower constraints
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
          setErrorMessage("Camera is currently in use by another application or tab.");
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
        streamRef.current = acquiredStream;
        setFacingMode(targetFacing);

        const currentTrack = acquiredStream.getVideoTracks()[0];
        if (currentTrack) {
          const settings = currentTrack.getSettings ? currentTrack.getSettings() : {};
          if (settings.deviceId) {
            setActiveDeviceId(settings.deviceId);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = acquiredStream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("webkit-playsinline", "true");
          videoRef.current.muted = true;
          await videoRef.current.play().catch((e) => {
            console.warn("[useCamera] Video play error (non-fatal):", e);
          });
        }

        setHasPermission(true);
        setIsActive(true);
        refreshDevices();
        return true;
      } catch (err) {
        console.error("[useCamera] Video stream binding error:", err);
        setErrorMessage("Failed to render camera stream.");
        setErrorType("BINDING_FAILED");
        stopCamera();
        return false;
      }
    },
    [facingMode, stopCamera, refreshDevices]
  );

  // Toggle between Back (environment) and Front (user) cameras
  const toggleFacingMode = useCallback(async () => {
    setIsSwitching(true);
    const nextMode = facingMode === "environment" ? "user" : "environment";

    try {
      const ok = await startCamera(nextMode);
      if (!ok && availableDevices.length > 1) {
        // Fallback: switch to next enumerated camera deviceId
        const currentIndex = availableDevices.findIndex((d) => d.deviceId === activeDeviceId);
        const nextIndex = (currentIndex + 1) % availableDevices.length;
        const nextDevice = availableDevices[nextIndex];
        if (nextDevice?.deviceId) {
          await startCamera(null, nextDevice.deviceId);
        }
      }
    } finally {
      setIsSwitching(false);
    }
  }, [facingMode, startCamera, availableDevices, activeDeviceId]);

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
  const captureFullFrame = useCallback((format = "image/jpeg", quality = 0.92) => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState < 2) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
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
    errorMessage,
    errorType,
    diagnostics,
    availableDevices,
    startCamera,
    stopCamera,
    toggleFacingMode,
    captureBlob,
    captureFullFrame,
  };
}

export default useCamera;
