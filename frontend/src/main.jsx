import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { VoiceProvider } from "./context/VoiceContext";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccessibilityProvider>
        <AuthProvider>
          <VoiceProvider>
            <App />
          </VoiceProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register Service Worker for PWA and offline shell support
if ("serviceWorker" in navigator && !window.location.host.includes("localhost:5173_disabled")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Detect updates to service worker
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.info("[PWA] New version available; will activate on next reload.");
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn("[PWA] ServiceWorker registration skipped or failed:", err);
      });
  });
}

