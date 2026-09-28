import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { voiceApi } from "../api/voiceApi";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useAccessibility } from "./AccessibilityContext";

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [voiceState, setVoiceState] = useState("IDLE"); // IDLE, LISTENING, PROCESSING, SPEAKING, ERROR
  const [transcript, setTranscript] = useState("");
  const [lastAction, setLastAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const { speak, stopSpeaking, repeatLast, isSpeaking } = useSpeechSynthesis();
  const { setTheme, setSpeechRate } = useAccessibility();

  const recognitionRef = useRef(null);
  const actionHandlersRef = useRef({});

  // Sync SPEAKING state with actual speech synthesis
  useEffect(() => {
    if (isSpeaking) {
      setVoiceState("SPEAKING");
    } else if (voiceState === "SPEAKING") {
      setVoiceState("IDLE");
    }
  }, [isSpeaking, voiceState]);

  // Register external handlers (e.g. dashboard OCR, camera scan)
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

      switch (action) {
        case "trigger_ocr":
          if (actionHandlersRef.current.triggerOcr) {
            actionHandlersRef.current.triggerOcr();
          } else {
            speak(spoken_response || "Scanning document.");
          }
          break;

        case "trigger_detection":
          if (actionHandlersRef.current.triggerDetection) {
            actionHandlersRef.current.triggerDetection();
          } else {
            speak(spoken_response || "Scanning surroundings.");
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

        case "consult_tutor":
          const answer = tutor_answer || spoken_response || "I am analyzing your question.";
          speak(answer);
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
    async (text, context = "", sessionId = null) => {
      if (!text || !text.trim()) return;
      const clean = text.trim();
      setTranscript(clean);
      setVoiceState("PROCESSING");
      setErrorMessage("");

      try {
        const res = await voiceApi.processCommand(clean, context, sessionId);
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

  const startListening = useCallback(
    (context = "", sessionId = null) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        // Fallback for browsers without Web Speech Recognition API
        setIsPromptOpen(true);
        return;
      }

      if (voiceState === "LISTENING") {
        try {
          recognitionRef.current?.stop();
        } catch {
          // ignore
        }
        setVoiceState("IDLE");
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
            setErrorMessage("Microphone access is blocked. Allow permission or type a command.");
            speak("Microphone permission was denied. You can press V or tap here to enter a command.");
          } else if (event.error === "no-speech") {
            setErrorMessage("No speech was detected. Tap the mic to try again.");
          } else {
            setErrorMessage(`Microphone error: ${event.error}`);
          }
        };

        recognition.onresult = (event) => {
          const spoken = event.results[0][0].transcript;
          processTextCommand(spoken, context, sessionId);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
        setIsPromptOpen(true);
      }
    },
    [voiceState, stopSpeaking, speak, processTextCommand]
  );

  const value = {
    voiceState,
    transcript,
    lastAction,
    errorMessage,
    startListening,
    processTextCommand,
    stopSpeaking,
    repeatLast,
    speak,
    registerHandler,
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
