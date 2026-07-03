"use client";

import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/lib/store";

export type AppMode = "write" | "analyze";

interface TopBarProps {
  mode?: AppMode;
  onModeChange?: (mode: AppMode) => void;
}

export default function TopBar({ mode = "write", onModeChange }: TopBarProps) {
  const writingState = useUIStore((s) => s.writingState);
  const stylePanelOpen = useUIStore((s) => s.stylePanelOpen);
  const setStylePanelOpen = useUIStore((s) => s.setStylePanelOpen);
  const style = useUIStore((s) => s.style);
  const updateIdentity = useUIStore((s) => s.updateIdentity);
  const updateRhythm = useUIStore((s) => s.updateRhythm);
  const addImagery = useUIStore((s) => s.addImagery);
  const removeImagery = useUIStore((s) => s.removeImagery);

  const [imageryInput, setImageryInput] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const statusText =
    writingState === "loading" || writingState === "streaming"
      ? "DeepSeek connected"
      : "Ready";
  const statusClass =
    writingState === "loading"
      ? "thinking"
      : writingState === "streaming"
        ? "streaming"
        : "idle";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setStylePanelOpen(false);
      }
    }
    if (stylePanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stylePanelOpen, setStylePanelOpen]);

  const handleAddImagery = () => {
    const tag = imageryInput.trim().toLowerCase();
    if (tag) {
      addImagery(tag);
      setImageryInput("");
    }
  };

  return (
    <header
      style={{
        height: 48,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: 13,
        position: "relative",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--text)", marginRight: 24 }}>
        Untitled
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--muted)",
        }}
      >
        <span className={`status-dot ${statusClass}`} />
        <span>{statusText}</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>

        {/* Mode switch */}
        <div
          style={{
            display: "flex",
            background: "var(--border)",
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          <button
            onClick={() => onModeChange?.("write")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: mode === "write" ? "white" : "transparent",
              color: mode === "write" ? "var(--accent)" : "var(--muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              transition: "all 0.15s ease",
              boxShadow:
                mode === "write" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            ✏️ Write
          </button>
          <button
            onClick={() => onModeChange?.("analyze")}
            style={{
              padding: "5px 14px",
              borderRadius: 6,
              border: "none",
              background: mode === "analyze" ? "white" : "transparent",
              color: mode === "analyze" ? "var(--accent)" : "var(--muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              transition: "all 0.15s ease",
              boxShadow:
                mode === "analyze" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            🔍 Analyze
          </button>
        </div>

        {/* Style button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setStylePanelOpen(!stylePanelOpen)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: stylePanelOpen ? "var(--ai-highlight)" : "transparent",
              color: stylePanelOpen ? "var(--accent)" : "var(--muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Style {stylePanelOpen ? "▾" : "▸"}
          </button>

          {stylePanelOpen && (
            <div className="style-panel" ref={panelRef}>
              <label>Tone</label>
              <input
                type="range"
                min={0}
                max={100}
                value={style.identity.tone}
                onChange={(e) =>
                  updateIdentity({ tone: Number(e.target.value) })
                }
              />
              <div className="range-labels">
                <span>Formal</span>
                <span>Casual</span>
              </div>

              <label>Density</label>
              <input
                type="range"
                min={0}
                max={100}
                value={style.identity.density}
                onChange={(e) =>
                  updateIdentity({ density: Number(e.target.value) })
                }
              />
              <div className="range-labels">
                <span>Dense</span>
                <span>Airy</span>
              </div>

              <label>Sentence Length</label>
              <input
                type="range"
                min={0}
                max={100}
                value={style.rhythm.sentenceLength}
                onChange={(e) =>
                  updateRhythm({ sentenceLength: Number(e.target.value) })
                }
              />
              <div className="range-labels">
                <span>Short</span>
                <span>Long</span>
              </div>

              <label>Punctuation</label>
              <input
                type="range"
                min={0}
                max={100}
                value={style.rhythm.punctuation}
                onChange={(e) =>
                  updateRhythm({ punctuation: Number(e.target.value) })
                }
              />
              <div className="range-labels">
                <span>Minimal</span>
                <span>Heavy</span>
              </div>

              <label>Imagery</label>
              <div className="imagery-input">
                <input
                  value={imageryInput}
                  onChange={(e) => setImageryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddImagery();
                    }
                  }}
                  placeholder="Add a tag..."
                />
                <button onClick={handleAddImagery}>+</button>
              </div>
              <div className="imagery-tags">
                {style.imagery.map((tag) => (
                  <span key={tag} className="imagery-tag">
                    {tag}
                    <button onClick={() => removeImagery(tag)}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
