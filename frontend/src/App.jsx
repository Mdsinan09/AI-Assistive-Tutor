import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AssistiveTutor from "./pages/AssistiveTutor";
import Statistics from "./pages/Statistics";
import RecentActivity from "./pages/RecentActivity";
import Settings from "./pages/Settings";
import About from "./pages/About";
import LandingPage from "./pages/LandingPage";
import ErrorBoundary from "./components/layout/ErrorBoundary";

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white text-xs font-medium px-4 py-2 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md"
    >
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span>Offline Mode — Cached interface active. Live AI detection, OCR scanning, and tutor questions require network connectivity.</span>
    </div>
  );
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        {/* Public Landing Page at Root URL */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Workspace Routes enclosed in Left Liquid Glass AppShell */}
        <Route
          element={
            <ProtectedRoute>
              <ErrorBoundary title="Workspace Shell Error">
                <AppShell />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <ErrorBoundary title="Dashboard Failed to Load">
                <Dashboard />
              </ErrorBoundary>
            }
          />
          <Route path="/assistive-tutor" element={<AssistiveTutor />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/recent-activity" element={<RecentActivity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Route>

        {/* Fallback Catch-all Route: redirect to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
