import React, { createContext, useContext, useState, useEffect } from "react";

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children }) {
  // Theme: "white" or "black" (NO "high-contrast" setting as per instructions)
  const [theme, setTheme] = useState(() => localStorage.getItem("tutor_theme") || "white");
  
  // Font Size: "normal" | "large" | "xlarge"
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("tutor_font_size") || "normal");
  
  // Speech Rate: 0.6 - 1.8
  const [speechRate, setSpeechRate] = useState(() => {
    const saved = localStorage.getItem("tutor_speech_rate");
    return saved ? parseFloat(saved) : 1.0;
  });

  // Speech Volume: 0.1 - 1.0
  const [speechVolume, setSpeechVolume] = useState(() => {
    const saved = localStorage.getItem("tutor_speech_volume");
    return saved ? parseFloat(saved) : 1.0;
  });

  // Voice Feedback toggle
  const [voiceFeedback, setVoiceFeedback] = useState(() => {
    const saved = localStorage.getItem("tutor_voice_feedback");
    return saved !== null ? saved === "true" : true;
  });

  // Auto Read Detection toggle
  const [autoDetection, setAutoDetection] = useState(() => {
    const saved = localStorage.getItem("tutor_auto_detection");
    return saved !== null ? saved === "true" : true;
  });

  // Keyboard Navigation assistance
  const [keyboardNav, setKeyboardNav] = useState(() => {
    const saved = localStorage.getItem("tutor_keyboard_nav");
    return saved !== null ? saved === "true" : true;
  });

  // Reduced Motion
  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem("tutor_reduced_motion");
    if (saved !== null) return saved === "true";
    return window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  });

  // Live announcer state for Screen Readers
  const [announcement, setAnnouncement] = useState({ text: "", priority: "polite" });

  // Apply Theme
  useEffect(() => {
    localStorage.setItem("tutor_theme", theme);
    if (theme === "black") {
      document.body.classList.add("theme-black");
    } else {
      document.body.classList.remove("theme-black");
    }
  }, [theme]);

  // Apply Font Scale
  useEffect(() => {
    localStorage.setItem("tutor_font_size", fontSize);
    let scale = "16px";
    if (fontSize === "large") scale = "18px";
    if (fontSize === "xlarge") scale = "21px";
    document.documentElement.style.setProperty("--font-scale", scale);
  }, [fontSize]);

  // Save Settings Changes
  useEffect(() => {
    localStorage.setItem("tutor_speech_rate", speechRate.toString());
  }, [speechRate]);

  useEffect(() => {
    localStorage.setItem("tutor_speech_volume", speechVolume.toString());
  }, [speechVolume]);

  useEffect(() => {
    localStorage.setItem("tutor_voice_feedback", voiceFeedback.toString());
  }, [voiceFeedback]);

  useEffect(() => {
    localStorage.setItem("tutor_auto_detection", autoDetection.toString());
  }, [autoDetection]);

  useEffect(() => {
    localStorage.setItem("tutor_keyboard_nav", keyboardNav.toString());
  }, [keyboardNav]);

  useEffect(() => {
    localStorage.setItem("tutor_reduced_motion", reducedMotion.toString());
    document.body.classList.toggle("reduced-motion", reducedMotion);
  }, [reducedMotion]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "black" ? "white" : "black"));
  };

  const announce = (text, priority = "polite") => {
    if (!text) return;
    setAnnouncement({ text, priority });
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    fontSize,
    setFontSize,
    speechRate,
    setSpeechRate,
    speechVolume,
    setSpeechVolume,
    voiceFeedback,
    setVoiceFeedback,
    autoDetection,
    setAutoDetection,
    keyboardNav,
    setKeyboardNav,
    reducedMotion,
    setReducedMotion,
    announcement,
    announce,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen Reader Live Region */}
      <div
        role="status"
        aria-live={announcement.priority}
        aria-atomic="true"
        className="sr-only"
      >
        {announcement.text}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
