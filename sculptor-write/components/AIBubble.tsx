"use client";

import { useUIStore } from "@/lib/store";
import type { Intent } from "@/types/editor";
import { useState, useRef, useEffect } from "react";

interface AIBubbleProps {
  onIntent: (intent: Intent, customText?: string) => void;
}

export default function AIBubble({ onIntent }: AIBubbleProps) {
  const writingState = useUIStore((s) => s.writingState);
  const selectionRect = useUIStore((s) => s.selectionRect);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset custom mode when bubble hides
  useEffect(() => {
    if (writingState !== "selected" && writingState !== "bubble_open") {
      setCustomMode(false);
      setCustomInput("");
    }
  }, [writingState]);

  // Focus input when entering custom mode
  useEffect(() => {
    if (customMode) {
      inputRef.current?.focus();
    }
  }, [customMode]);

  if (writingState !== "selected" && writingState !== "bubble_open") {
    return null;
  }

  if (!selectionRect) return null;

  const handleClick = (intent: Intent) => {
    onIntent(intent);
  };

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onIntent("custom", trimmed);
    setCustomMode(false);
    setCustomInput("");
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    }
    if (e.key === "Escape") {
      setCustomMode(false);
      setCustomInput("");
    }
  };

  return (
    <div
      className="ai-bubble"
      style={{
        position: "fixed",
        left: Math.max(8, selectionRect.left - 80),
        top: Math.max(8, selectionRect.top - 48),
      }}
    >
      {customMode ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 4px",
          }}
        >
          <input
            ref={inputRef}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="说点什么..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e0d8c8",
              fontSize: 13,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              width: 200,
              padding: "4px 6px",
            }}
          />
          <button
            onClick={handleCustomSubmit}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: "#c4a565",
              color: "#0d0d0d",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            →发送
          </button>
        </div>
      ) : (
        <>
          <button onClick={() => handleClick("rewrite")}>改写</button>
          <button onClick={() => handleClick("continue")}>续写</button>
          <button onClick={() => handleClick("explain")}>解释</button>
          <button
            onClick={() => setCustomMode(true)}
            style={{
              color: "#c4a565",
            }}
          >
            自定义
          </button>
        </>
      )}
    </div>
  );
}
