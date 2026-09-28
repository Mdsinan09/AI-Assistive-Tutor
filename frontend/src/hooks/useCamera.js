import { useState, useRef, useEffect, useCallback } from "react";

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Track stop error:", e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    // If already active, don't re-init
    if (streamRef.current && isActive) return true;

    stopCamera();
    setErrorMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setHasPermission(true);
      setIsActive(true);
      return true;
    } catch (err) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      setIsActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission denied. Please enable camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No webcam device detected on your system.");
      } else {
        setErrorMessage(`Camera initialization error: ${err.message || err.name}`);
      }
      return false;
    }
  }, [isActive, stopCamera]);

  const captureBlob = useCallback(
    (format = "image/jpeg", quality = 0.85) => {
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < 2) {
        return null;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
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
    },
    []
  );

  // Unmount cleanup: ALWAYS stop media tracks to kill the camera indicator light
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isActive,
    hasPermission,
    errorMessage,
    startCamera,
    stopCamera,
    captureBlob,
  };
}

export default useCamera;
