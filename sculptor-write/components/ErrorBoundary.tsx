"use client";

import { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            background: "#0d0d0d",
            color: "#e5e5e5",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            gap: "1rem",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "0.5rem" }}>⚠️</div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#6b6b6b",
              maxWidth: "400px",
              textAlign: "center",
              margin: 0,
            }}
          >
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: "12px",
                color: "#fca5a5",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "12px",
                borderRadius: "8px",
                maxWidth: "500px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={{
              marginTop: "1rem",
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#4A6CF7",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
