"use client";

import { useState } from "react";
import type { StyleProfileData } from "@/types/editor";

interface StyleSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved: (profile: StyleProfileData) => void;
}

type SetupState = "idle" | "loading" | "success" | "error";

export default function StyleSetup({
  isOpen,
  onClose,
  onProfileSaved,
}: StyleSetupProps) {
  const [sampleText, setSampleText] = useState("");
  const [state, setState] = useState<SetupState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<StyleProfileData | null>(null);

  if (!isOpen) return null;

  const charCount = sampleText.length;
  const isTooShort = charCount > 0 && charCount < 50;
  const canAnalyze = charCount >= 50;

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/style/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setProfile(data.profile);
      setState("success");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setState("error");
    }
  };

  const handleSaveAndClose = () => {
    if (profile) {
      onProfileSaved(profile);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          padding: "32px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#e0d8c8",
            marginBottom: 8,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Style Profile
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#8a8578",
            marginBottom: 24,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          Upload a writing sample to analyze your style. We recommend at least
          500 characters for best results.
        </p>

        {state === "idle" && (
          <>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Paste your writing sample here... (at least 50 characters)"
              rows={10}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: 14,
                borderRadius: 8,
                border: "1px solid #2a2a2a",
                backgroundColor: "#1a1a1a",
                color: "#e0d8c8",
                outline: "none",
                resize: "vertical",
                fontFamily: "var(--font-serif), Georgia, serif",
                lineHeight: 1.7,
                boxSizing: "border-box",
                marginBottom: 8,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#c4a565";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#2a2a2a";
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: isTooShort ? "#c88c8c" : "#8a8578",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {charCount} characters
                {isTooShort && " (need at least 50)"}
              </span>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 8,
                border: "none",
                backgroundColor: canAnalyze ? "#c4a565" : "#2a2a2a",
                color: canAnalyze ? "#0d0d0d" : "#5a5555",
                cursor: canAnalyze ? "pointer" : "not-allowed",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                transition: "all 0.15s ease",
              }}
            >
              Analyze Style
            </button>
          </>
        )}

        {state === "loading" && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#c4a565",
                    animation: `pulse 1s infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p
              style={{
                color: "#8a8578",
                fontSize: 14,
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Analyzing your writing style...
            </p>
          </div>
        )}

        {state === "success" && profile && (
          <>
            <div
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                padding: "20px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8578",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Tone
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#e0d8c8",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {profile.tone}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8578",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Formality
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#e0d8c8",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {profile.formality}/10
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8578",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Avg Sentence Length
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#e0d8c8",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {profile.avg_sentence_length} words
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8578",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Imagery
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#e0d8c8",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {profile.common_imagery?.join(", ") || "None"}
                  </div>
                </div>
              </div>
              {profile.keywords && profile.keywords.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#8a8578",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    Keywords
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profile.keywords.map((kw) => (
                      <span
                        key={kw}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 16,
                          background: "#3d3520",
                          color: "#c4a565",
                          fontSize: 12,
                          fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleSaveAndClose}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 8,
                border: "none",
                backgroundColor: "#c4a565",
                color: "#0d0d0d",
                cursor: "pointer",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                transition: "all 0.15s ease",
              }}
            >
              Save & Continue
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                backgroundColor: "#2a1a1a",
                border: "1px solid #4a2a2a",
                color: "#c88c8c",
                fontSize: 14,
                marginBottom: 16,
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {errorMsg}
            </div>
            <button
              onClick={() => setState("idle")}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid #c4a565",
                backgroundColor: "transparent",
                color: "#c4a565",
                cursor: "pointer",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
