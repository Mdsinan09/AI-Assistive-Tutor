import { useState, useCallback, useRef, useEffect } from "react";
import { useAccessibility } from "../context/AccessibilityContext";

export function useSpeechSynthesis() {
  const { speechRate, speechVolume, voiceFeedback, announce } = useAccessibility();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpoken, setLastSpoken] = useState("");
  const utteranceRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text, { priority = "polite", onEnd = null } = {}) => {
      if (!text || !text.trim()) return;
      const clean = text.trim();
      setLastSpoken(clean);
      announce(clean, priority);

      if (!voiceFeedback) return;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const ut = new SpeechSynthesisUtterance(clean);
        ut.rate = speechRate || 1.0;
        ut.volume = speechVolume !== undefined ? speechVolume : 1.0;
        ut.pitch = 1.0;
        ut.lang = "en-US";

        ut.onstart = () => setIsSpeaking(true);
        ut.onend = () => {
          setIsSpeaking(false);
          if (onEnd) onEnd();
        };
        ut.onerror = (e) => {
          if (e.error !== "interrupted" && e.error !== "canceled") {
            console.warn("TTS Error:", e);
          }
          setIsSpeaking(false);
        };

        utteranceRef.current = ut;
        window.speechSynthesis.speak(ut);
      }
    },
    [speechRate, speechVolume, voiceFeedback, announce]
  );

  const repeatLast = useCallback(() => {
    if (lastSpoken) {
      speak(lastSpoken);
    } else {
      speak("No previous narration to repeat.");
    }
  }, [lastSpoken, speak]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speak,
    stopSpeaking,
    repeatLast,
    isSpeaking,
    lastSpoken,
  };
}
