import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { voiceApi } from "../api/voiceApi";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useAccessibility } from "./AccessibilityContext";

const VoiceContext = createContext(null);

/**
 * Global Voice Assistant Context
 *
 * Reliable Voice State Machine:
 * - idle: ready to accept voice input
 * - requesting_permission: browser permission prompt is active
 * - listening: microphone active, audio streaming, live transcript capturing
 * - processing: finalizing transcript and running intent/tutor pipeline
 * - responding: assistant reading response aloud
 *
 * Recoverable Error States:
 * - permission_denied: microphone access blocked by user or browser
 * - unsupported_browser: browser lacks audio capture or recognition
 * - network_error: network unreachable during recognition or AI query
 * - no_speech: listening timeout expired without detected speech
 * - recognition_error: recoverable error with guidance
 */
export function VoiceProvider({ children }) {
  const [voiceState, setVoiceStateState] = useState("idle");
  const [isVoiceSessionOpen, setIsVoiceSessionOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [conversationMessages, setConversationMessages] = useState([]);
  const [audioStream, setAudioStream] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [lastSpokenResponse, setLastSpokenResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [activeContextName, setActiveContextName] = useState("");

  const { speak: rawSpeak, stopSpeaking, repeatLast, isSpeaking } = useSpeechSynthesis();
  const { setTheme, setSpeechRate } = useAccessibility();

  // Internal persistent refs to eliminate stale closure bugs
  const isVoiceSessionOpenRef = useRef(false);
  const voiceStateRef = useRef("idle");
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const actionHandlersRef = useRef({});
  const visualContextRef = useRef({});
  const activeContextRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const isExplicitStopRef = useRef(false);
  const restartCountRef = useRef(0);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const autoTimeoutRef = useRef(null);

  // Synchronized state setter updating both state and ref
  const setVoiceState = useCallback((newState) => {
    voiceStateRef.current = newState;
    setVoiceStateState(newState);
  }, []);

  // Wrapped speak that tracks last spoken response
  const speak = useCallback(
    (text, priority = false) => {
      if (!text) return;
      setLastSpokenResponse(text);
      rawSpeak(text, priority);
    },
    [rawSpeak]
  );

  // Sync responding state with speech synthesis lifecycle
  useEffect(() => {
    if (isSpeaking) {
      if (
        voiceStateRef.current === "idle" ||
        voiceStateRef.current === "processing" ||
        voiceStateRef.current === "processing_speech" ||
        voiceStateRef.current === "thinking"
      ) {
        setVoiceState("responding");
      }
    } else {
      if (voiceStateRef.current === "responding" || voiceStateRef.current === "speaking") {
        setVoiceState("idle");
      }
    }
  }, [isSpeaking, setVoiceState]);

  // Keep latest visual detection and OCR context
  const updateVisualContext = useCallback((newContext) => {
    if (!newContext) return;
    visualContextRef.current = {
      ...visualContextRef.current,
      ...newContext,
    };
  }, []);

  // Register external handlers (e.g. camera OCR, Assistive Tutor chat integration)
  const registerHandler = useCallback((name, fn) => {
    actionHandlersRef.current[name] = fn;
    return () => {
      delete actionHandlersRef.current[name];
    };
  }, []);

  // Cleanly stops and releases all microphone tracks
  const stopAllTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (_) {}
      mediaStreamRef.current = null;
    }
    setAudioStream(null);
  }, []);

  const dispatchAction = useCallback(
    (actionData) => {
      if (!actionData) return;
      const { action, spoken_response, tutor_answer } = actionData;
      setLastAction(action);

      const reply = tutor_answer || spoken_response || "";
      if (reply) {
        setLastSpokenResponse(reply);
      }

      switch (action) {
        case "trigger_ocr":
          if (actionHandlersRef.current.triggerCameraOcr) {
            actionHandlersRef.current.triggerCameraOcr();
          } else if (actionHandlersRef.current.triggerOcr) {
            actionHandlersRef.current.triggerOcr();
          } else {
            speak(spoken_response || "Scanning document text.");
          }
          break;

        case "trigger_detection":
        case "describe_surroundings":
          if (spoken_response) {
            speak(spoken_response);
          } else if (actionHandlersRef.current.triggerDetection) {
            actionHandlersRef.current.triggerDetection();
          }
          break;

        case "pause_detection":
          if (actionHandlersRef.current.pauseDetection) {
            actionHandlersRef.current.pauseDetection();
          }
          speak(spoken_response || "Detection paused.");
          break;

        case "resume_detection":
          if (actionHandlersRef.current.resumeDetection) {
            actionHandlersRef.current.resumeDetection();
          }
          speak(spoken_response || "Detection resumed.");
          break;

        case "flip_camera":
        case "switch_camera":
          if (actionHandlersRef.current.flipCamera) {
            actionHandlersRef.current.flipCamera();
          } else {
            speak(spoken_response || "Switching camera view.");
          }
          break;

        case "navigate_tutor":
          if (spoken_response) speak(spoken_response);
          if (window.location.pathname !== "/assistive-tutor") {
            window.location.href = "/assistive-tutor";
          }
          break;

        case "navigate_dashboard":
          if (spoken_response) speak(spoken_response);
          if (window.location.pathname !== "/dashboard") {
            window.location.href = "/dashboard";
          }
          break;

        case "repeat_last":
          repeatLast();
          break;

        case "set_theme_black":
          setTheme("black");
          speak(spoken_response || "Switched to Black Mode.");
          break;

        case "set_theme_white":
          setTheme("white");
          speak(spoken_response || "Switched to White Mode.");
          break;

        case "increase_speed":
          setSpeechRate((prev) => Math.min(1.8, Math.round((prev + 0.2) * 10) / 10));
          speak(spoken_response || "Speech rate increased.");
          break;

        case "decrease_speed":
          setSpeechRate((prev) => Math.max(0.6, Math.round((prev - 0.2) * 10) / 10));
          speak(spoken_response || "Speech rate decreased.");
          break;

        case "locate_object":
        case "spatial_query":
        case "explain_object":
        case "explain_ocr":
        case "summarize_ocr":
        case "consult_tutor":
          if (reply) {
            speak(reply);
          }
          break;

        default:
          if (spoken_response) {
            speak(spoken_response);
          }
          break;
      }
    },
    [speak, repeatLast, setTheme, setSpeechRate]
  );

  const speakAnnouncement = useCallback(
    (text, priority = false) => {
      if (!text || !text.trim()) return false;
      // Task 2: Suppress object-detection announcements while voice session is active
      if (isVoiceSessionOpenRef.current || voiceStateRef.current !== "idle") {
        return false;
      }
      rawSpeak(text, priority);
      return true;
    },
    [rawSpeak]
  );

  const processTextCommand = useCallback(
    async (text, explicitContext = null, sessionId = null) => {
      if (!text || !text.trim() || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      const clean = text.trim();
      setTranscript(clean);
      setInterimTranscript("");
      setVoiceState("processing");
      setErrorMessage("");

      const effectiveContext =
        (explicitContext && typeof explicitContext !== "object") ||
        (explicitContext && !explicitContext.nativeEvent && !explicitContext.target)
          ? explicitContext
          : visualContextRef.current;

      try {
        const res = await voiceApi.processCommand(clean, effectiveContext, sessionId);
        const reply = res?.tutor_answer || res?.spoken_response || "";
        if (reply) {
          setAssistantResponse(reply);
          setLastSpokenResponse(reply);
        }
        setConversationMessages((prev) => [
          ...prev,
          { id: `user-${Date.now()}`, role: "user", text: clean, timestamp: Date.now() },
          { id: `assistant-${Date.now() + 1}`, role: "assistant", text: reply, timestamp: Date.now() },
        ]);
        dispatchAction(res);
        // If no speech synthesis was queued, reset state to idle (session remains open)
        if (!res?.spoken_response && !res?.tutor_answer) {
          setVoiceState("idle");
        }
      } catch (err) {
        console.warn("[VoiceContext] Process command error:", err.message);
        setVoiceState("recognition_error");
        let userFacingError = "I couldn't complete that request. Please try again.";
        if (err.message && err.message.includes("Unable to connect")) {
          setVoiceState("network_error");
          userFacingError = "The assistive tutor service is currently unreachable. Check your network or backend connection.";
        }
        setErrorMessage(userFacingError);
        speak(userFacingError);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [dispatchAction, speak, setVoiceState]
  );

  // Submits the finalized transcript or handles backend fallback transcription
  const finalizeUtterance = useCallback(
    async (sessionId = null) => {
      const fullText = (
        finalTranscriptRef.current ||
        interimTranscriptRef.current ||
        ""
      ).trim();

      // Clear audio tracks immediately after speech capture
      stopAllTracks();

      if (fullText) {
        setTranscript(fullText);
        setInterimTranscript("");
        setVoiceState("processing");
        const ctxToSend = activeContextRef.current || visualContextRef.current;
        if (actionHandlersRef.current.onVoiceTranscript) {
          actionHandlersRef.current.onVoiceTranscript(fullText, ctxToSend);
        } else {
          processTextCommand(fullText, ctxToSend, sessionId);
        }
        return;
      }

      // If browser recognition yielded no text, check recorded audio chunks for backend transcription fallback
      if (audioChunksRef.current && audioChunksRef.current.length > 0) {
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (blob.size > 1500) {
            setVoiceState("processing");
            const res = await voiceApi.transcribeAudio(blob);
            const serverText = (res?.transcript || "").trim();
            if (serverText) {
              setTranscript(serverText);
              setInterimTranscript("");
              const ctxToSend = activeContextRef.current || visualContextRef.current;
              if (actionHandlersRef.current.onVoiceTranscript) {
                actionHandlersRef.current.onVoiceTranscript(serverText, ctxToSend);
              } else {
                processTextCommand(serverText, ctxToSend, sessionId);
              }
              return;
            }
          }
        } catch (fallbackErr) {
          console.debug("[VoiceContext] Backend transcription fallback:", fallbackErr);
        }
      }

      // No speech detected from either browser engine or audio recording
      setVoiceState("no_speech");
      setErrorMessage("No speech was detected. Please speak your question, then press Done.");
    },
    [stopAllTracks, processTextCommand, setVoiceState]
  );

  // Stops speech recognition and processes captured speech
  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    // Delay slightly to let the final recognition event resolve, then finalize
    setTimeout(() => {
      finalizeUtterance();
    }, 180);
  }, [finalizeUtterance]);

  // Cancels speech recognition and closes the voice panel
  const cancelListening = useCallback(() => {
    isExplicitStopRef.current = true;
    isVoiceSessionOpenRef.current = false;
    setIsVoiceSessionOpen(false);

    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    stopAllTracks();
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    audioChunksRef.current = [];
    setTranscript("");
    setInterimTranscript("");
    setAssistantResponse("");
    setVoiceState("idle");
    setErrorMessage("");
  }, [stopAllTracks, setVoiceState]);

  // Explicit action when user presses the close X button
  const closeVoiceSession = useCallback(() => {
    stopSpeaking();
    cancelListening();
  }, [cancelListening, stopSpeaking]);

  // Starts listening again for a new question while keeping the session open
  const listenAgain = useCallback(() => {
    isVoiceSessionOpenRef.current = true;
    setIsVoiceSessionOpen(true);
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setErrorMessage("");
    // Note: keep assistantResponse visible or clear based on preference
    startListening(activeContextRef.current, activeContextName);
  }, []);

  // Starts capturing user voice input with explicit permission request and state transitions
  const startListening = useCallback(
    async (explicitContext = null, contextLabel = "", sessionId = null) => {
      // Toggle off if already listening or requesting permission
      if (
        voiceStateRef.current === "listening" ||
        voiceStateRef.current === "requesting_permission"
      ) {
        stopListening();
        return;
      }

      // Mark voice session open
      isVoiceSessionOpenRef.current = true;
      setIsVoiceSessionOpen(true);

      // Sanitize context against React SyntheticEvents
      const sanitizedContext =
        explicitContext &&
        typeof explicitContext !== "function" &&
        !explicitContext.nativeEvent &&
        !explicitContext.target
          ? explicitContext
          : null;

      stopSpeaking();
      isExplicitStopRef.current = false;
      restartCountRef.current = 0;
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      audioChunksRef.current = [];
      activeContextRef.current = sanitizedContext;
      setActiveContextName(typeof contextLabel === "string" ? contextLabel : "");
      setTranscript("");
      setInterimTranscript("");
      setErrorMessage("");

      // 1. Request microphone access via getUserMedia in response to explicit user tap
      let stream = null;
      try {
        setVoiceState("requesting_permission");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setVoiceState("unsupported_browser");
          setErrorMessage("Audio capture is not supported by this browser. Please use Google Chrome, Edge, or Safari.");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        mediaStreamRef.current = stream;
        setAudioStream(stream);
      } catch (permErr) {
        console.warn("[VoiceContext] getUserMedia permission error:", permErr);
        stopAllTracks();
        if (permErr.name === "NotAllowedError" || permErr.name === "PermissionDeniedError") {
          setVoiceState("permission_denied");
          const msg = "Microphone permission was denied. Tap the lock/permissions icon in your address bar to enable microphone access.";
          setErrorMessage(msg);
          speak(msg);
        } else if (permErr.name === "NotFoundError" || permErr.name === "DevicesNotFoundError") {
          setVoiceState("recognition_error");
          setErrorMessage("No microphone was found on this device. Please connect an audio input.");
        } else {
          setVoiceState("recognition_error");
          setErrorMessage(`Microphone access error: ${permErr.message || permErr.name}`);
        }
        return;
      }

      // 2. Initialize MediaRecorder fallback stream
      try {
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        mediaRecorderRef.current = recorder;
        recorder.start(250);
      } catch (recErr) {
        console.debug("[VoiceContext] MediaRecorder setup notice:", recErr);
      }

      // 3. Initialize Browser Web Speech API if supported
      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        // Fallback to pure server-side MediaRecorder transcription
        setVoiceState("listening");
        // Auto-stop after 8 seconds of speech capture
        autoTimeoutRef.current = setTimeout(() => {
          if (voiceStateRef.current === "listening") {
            stopListening();
          }
        }, 8000);
        return;
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setVoiceState("listening");
          setErrorMessage("");
        };

        recognition.onresult = (event) => {
          let currentInterim = "";
          let currentFinal = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              currentFinal += res[0].transcript;
            } else {
              currentInterim += res[0].transcript;
            }
          }

          if (currentFinal) {
            finalTranscriptRef.current = (
              finalTranscriptRef.current + " " + currentFinal
            ).trim();
            setTranscript(finalTranscriptRef.current);
          }

          interimTranscriptRef.current = currentInterim;
          setInterimTranscript(currentInterim);
          restartCountRef.current = 0; // Valid speech detected, reset restart budget
        };

        recognition.onerror = (event) => {
          console.warn("[VoiceContext] Speech recognition error:", event.error);
          if (event.error === "no-speech") {
            // Keep listening unless explicit stop was initiated
            return;
          }
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setVoiceState("permission_denied");
            setErrorMessage("Speech recognition permission denied. Please allow microphone access in your browser settings.");
            speak("Microphone permission was denied.");
            stopListening();
            return;
          }
          if (event.error === "network") {
            // Fall back to server-side MediaRecorder transcription
            console.debug("[VoiceContext] Web Speech network error, relying on backend STT fallback.");
            return;
          }
          if (event.error === "aborted") {
            // Handled cleanly
            return;
          }
          setErrorMessage(`Speech recognition notice: ${event.error}.`);
        };

        recognition.onend = () => {
          // If stopped intentionally or already processing, do not restart
          if (
            isExplicitStopRef.current ||
            voiceStateRef.current === "processing" ||
            voiceStateRef.current === "responding" ||
            voiceStateRef.current === "idle"
          ) {
            return;
          }

          // If speech was captured, finalize automatically
          if (
            finalTranscriptRef.current.trim() ||
            interimTranscriptRef.current.trim()
          ) {
            finalizeUtterance(sessionId);
            return;
          }

          // If no speech yet and under restart limit, restart smoothly to allow user to complete utterance
          if (restartCountRef.current < 2) {
            restartCountRef.current += 1;
            try {
              recognition.start();
              return;
            } catch (_) {}
          }

          // Otherwise conclude listening session
          finalizeUtterance(sessionId);
        };

        recognitionRef.current = recognition;
        recognition.start();

        // 12-second total safety timeout for unattended speech sessions
        autoTimeoutRef.current = setTimeout(() => {
          if (voiceStateRef.current === "listening") {
            stopListening();
          }
        }, 12000);
      } catch (recStartErr) {
        console.warn("[VoiceContext] Recognition startup exception:", recStartErr);
        setVoiceState("listening"); // Continue with MediaRecorder fallback
      }
    },
    [stopSpeaking, stopAllTracks, speak, stopListening, finalizeUtterance, setVoiceState]
  );

  // Clean unmount of all audio and speech resources
  useEffect(() => {
    return () => {
      isExplicitStopRef.current = true;
      if (autoTimeoutRef.current) {
        clearTimeout(autoTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      }
    };
  }, []);

  const value = {
    voiceState,
    isVoiceSessionOpen,
    transcript,
    interimTranscript,
    assistantResponse,
    conversationMessages,
    audioStream,
    lastAction,
    lastSpokenResponse,
    errorMessage,
    activeContextName,
    isSpeaking,
    // Unified functions
    setVoiceState,
    startListening,
    stopListening,
    cancelListening,
    closeVoiceSession,
    listenAgain,
    processTextCommand,
    stopSpeaking,
    repeatLast,
    speak,
    speakAnnouncement,
    registerHandler,
    updateVisualContext,
    isPromptOpen,
    setIsPromptOpen,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}

export default useVoice;
