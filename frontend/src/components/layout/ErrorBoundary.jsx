import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <AlertTriangle size={28} color="var(--accent-rose, #ef4444)" />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                {this.props.title || "Dashboard Component Error"}
              </h2>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              A rendering exception occurred in this component.
            </p>
            <pre
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                color: "#ff8080",
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                textAlign: "left",
                overflowX: "auto",
                maxHeight: "200px",
              }}
            >
              {this.state.error?.toString()}
              {"\n"}
              {this.state.errorInfo?.componentStack}
            </pre>
            <button
              onClick={this.handleReset}
              style={{
                marginTop: "1rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.2rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-primary, #0071e3)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <RefreshCw size={16} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
