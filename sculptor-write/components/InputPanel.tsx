"use client";

import { useState } from "react";

interface InputPanelProps {
  onAnalyze: (url?: string, text?: string) => void;
  loading: boolean;
  error: string | null;
}

export default function InputPanel({ onAnalyze, loading, error }: InputPanelProps) {
  const [activeTab, setActiveTab] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (loading) return;
    if (activeTab === "url" && url.trim()) {
      onAnalyze(url.trim(), undefined);
    } else if (activeTab === "text" && text.trim()) {
      onAnalyze(undefined, text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit =
    !loading &&
    ((activeTab === "url" && url.trim().length > 0) ||
      (activeTab === "text" && text.trim().length > 0));

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "#0d0d0d",
        borderRight: "1px solid #1f1f1f",
      }}
    >
      {/* Tab switcher */}
      <div className="flex border-b" style={{ borderColor: "#1f1f1f" }}>
        <button
          onClick={() => !loading && setActiveTab("url")}
          disabled={loading}
          className="flex-1 px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: activeTab === "url" ? "#1a1a1a" : "transparent",
            color: activeTab === "url" ? "#e5e5e5" : "#6b6b6b",
            borderBottom:
              activeTab === "url" ? "2px solid #4A6CF7" : "2px solid transparent",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          🔗 Paste URL
        </button>
        <button
          onClick={() => !loading && setActiveTab("text")}
          disabled={loading}
          className="flex-1 px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: activeTab === "text" ? "#1a1a1a" : "transparent",
            color: activeTab === "text" ? "#e5e5e5" : "#6b6b6b",
            borderBottom:
              activeTab === "text" ? "2px solid #4A6CF7" : "2px solid transparent",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          📝 Paste Text
        </button>
      </div>

      {/* Input area */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        {activeTab === "url" ? (
          <div className="flex flex-col gap-3">
            <label
              className="text-xs uppercase tracking-wide font-semibold"
              style={{
                color: "#6b6b6b",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Article URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/article"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors disabled:opacity-50"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#e5e5e5",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1">
            <label
              className="text-xs uppercase tracking-wide font-semibold"
              style={{
                color: "#6b6b6b",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Article Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full article text here (minimum 50 characters)..."
              disabled={loading}
              className="flex-1 w-full px-4 py-3 rounded-lg text-sm outline-none transition-colors resize-none disabled:opacity-50"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#e5e5e5",
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                lineHeight: "1.6",
                minHeight: "200px",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4A6CF7")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: canSubmit ? "#4A6CF7" : "#1f1f1f",
            color: canSubmit ? "#ffffff" : "#6b6b6b",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            marginTop: "auto",
          }}
        >
          {loading ? (
            <>
              <Spinner />
              Analyzing...
            </>
          ) : (
            "🔍 Analyze"
          )}
        </button>

        {/* Error display */}
        {error && (
          <div
            className="p-3 rounded-lg text-sm flex items-start gap-2"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
