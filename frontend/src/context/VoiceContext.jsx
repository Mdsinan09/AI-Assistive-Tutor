import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { voiceApi } from "../api/voiceApi";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useAccessibility } from "./AccessibilityContext";

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [voiceState, setVoiceState] = useState("IDLE"); // IDLE, LISTENING, PROCESSING, SPEAKING, ERROR
  const [transcript, setTranscript] = useState("");
  const [lastAction, setLastAction] = useState(null);
  const [lastSpokenResponse, setLastSpokenResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const { speak: rawSpeak, stopSpeaking, repeatLast, isSpeaking } = useSpeechSynthesis();
  const { setTheme, setSpeechRate } = useAccessibility();

  const recognitionRef = useRef(null);
  const actionHandlersRef = useRef({});
  const visualContextRef = useRef({});

  // Wrapped speak that also tracks last spoken response
  const speak = useCallback(
    (text, priority = false) => {
      if (!text) return;
      setLastSpokenResponse(text);
      rawSpeak(text, priority);
    },
    [rawSpeak]
  );

  // Sync SPEAKING state with actual speech synthesis
  useEffect(() => {
    if (isSpeaking) {
      setVoiceState("SPEAKING");
    } else if (voiceState === "SPEAKING") {
      setVoiceState("IDLE");
    }
  }, [isSpeaking, voiceState]);

  // Keep latest visual detection and OCR context
  const updateVisualContext = useCallback((newContext) => {
    visualContextRef.current = {
      ...visualContextRef.current,
      ...newContext,
    };
  }, []);

  // Register external handlers (e.g. camera OCR, camera detection pause)
  const registerHandler = useCallback((name, fn) => {
    actionHandlersRef.current[name] = fn;
    return () => {
      delete actionHandlersRef.current[name];
    };
  }, []);

  const dispatchAction = useCallback(
    (actionData) => {
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
          stopSpeaking();
          speak(spoken_response || "Detection paused.");
          break;

        case "resume_detection":
          if (actionHandlersRef.current.resumeDetection) {
            actionHandlersRef.current.resumeDetection();
          }
          speak(spoken_response || "Detection resumed.");
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
    [speak, stopSpeaking, repeatLast, setTheme, setSpeechRate]
  );

  const processTextCommand = useCallback(
    async (text, explicitContext = null, sessionId = null) => {
      if (!text || !text.trim()) return;
      const clean = text.trim();
      setTranscript(clean);
      setVoiceState("PROCESSING");
      setErrorMessage("");

      const effectiveContext = explicitContext || visualContextRef.current;

      try {
        const res = await voiceApi.processCommand(clean, effectiveContext, sessionId);
        dispatchAction(res);
      } catch (err) {
        console.warn("Voice command error:", err.message);
        setVoiceState("ERROR");
        setErrorMessage(err.message || "Voice processing failed.");
        speak("I could not process that request. Please try again.");
      }
    },
    [dispatchAction, speak]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setVoiceState("IDLE");
  }, []);

  const startListening = useCallback(
    (explicitContext = null, sessionId = null) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsPromptOpen(true);
        return;
      }

      if (voiceState === "LISTENING") {
        stopListening();
        return;
      }

      try {
        stopSpeaking();
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setVoiceState("LISTENING");
          setErrorMessage("");
        };

        recognition.onend = () => {
          setVoiceState((prev) => (prev === "LISTENING" ? "IDLE" : prev));
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          setVoiceState("ERROR");
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setErrorMessage("Microphone access is blocked. Allow permission or tap to type.");
            speak("Microphone permission was denied. Tap here to enter a command.");
          } else if (event.error === "no-speech") {
            setErrorMessage("No speech was detected. Tap the mic to try again.");
          } else {
            setErrorMessage(`Microphone error: ${event.error}`);
          }
        };

        recognition.onresult = (event) => {
          const spoken = event.results[0][0].transcript;
          const currentCtx = explicitContext || visualContextRef.current;
          processTextCommand(spoken, currentCtx, sessionId);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
        setIsPromptOpen(true);
      }
    },
    [voiceState, stopSpeaking, speak, stopListening, processTextCommand]
  );

  const value = {
    voiceState,
    transcript,
    lastAction,
    lastSpokenResponse,
    errorMessage,
    startListening,
    stopListening,
    processTextCommand,
    stopSpeaking,
    repeatLast,
    speak,
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
