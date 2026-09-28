import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-canvas)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="animate-spin"
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--glass-border-subtle)",
              borderTopColor: "var(--accent-primary)",
              borderRadius: "50%",
              margin: "0 auto 1rem",
            }}
          />
          <p style={{ fontSize: "0.95rem" }}>Initializing workspace...</p>
        </div>
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}
