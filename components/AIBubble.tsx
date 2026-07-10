"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface AIBubbleProps {
  position?: { x: number; y: number } | null;
  visible?: boolean;
  selectedText?: string;
  onContinue?: () => void;
  onRewrite?: () => void;
  onDiagnose?: () => void;
  onCustom?: (instruction: string) => void;
  onDismiss?: () => void;
  onIntent?: (...args: any[]) => Promise<void>;
}

export default function AIBubble({
  position = null,
  visible = false,
  selectedText = "",
  onContinue = () => {},
  onRewrite = () => {},
  onDiagnose = () => {},
  onCustom = (_instruction: string) => {},
  onDismiss = () => {},
  onIntent,
}: AIBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expanded) {
          setExpanded(false);
          setCustomInput("");
        } else {
          onDismiss();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, expanded, onDismiss]);

  // Click outside to close
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setExpanded(false);
        setCustomInput("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Focus input when custom mode activates
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Reset when dismissed
  useEffect(() => {
    if (!visible) {
      setExpanded(false);
      setCustomInput("");
    }
  }, [visible]);

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      setExpanded(false);
    },
    []
  );

  const handleCustomSubmit = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onCustom(trimmed);
    setCustomInput("");
    setExpanded(false);
  }, [customInput, onCustom]);

  const handleCustomKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCustomSubmit();
      }
    },
    [handleCustomSubmit]
  );

  if (!visible || !position) return null;

  const bubbleLeft = Math.max(8, position.x);
  const bubbleTop = Math.max(8, position.y - 52);

  return (
    <div
      ref={bubbleRef}
      style={{
        position: "fixed",
        left: bubbleLeft,
        top: bubbleTop,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      {/* Floating gold circle */}
      <button
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setExpanded(true)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "1.5px solid var(--gold)",
          background: "var(--bg-elevated)",
          color: "var(--gold)",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 16px rgba(201,169,92,0.35)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          transform: expanded ? "scale(1.1)" : "scale(1)",
        }}
        title="AI 助手"
        aria-label="AI 助手"
      >
        ✨
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            marginTop: 8,
            width: 200,
            background: "var(--bg-elevated)",
            border: "1px solid var(--gold)",
            borderRadius: 12,
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            animation: "fadeIn 0.12s ease",
          }}
        >
          {/* Action buttons row */}
          <div
            style={{
              display: "flex",
              gap: 4,
            }}
          >
            <ActionButton
              label="写下去"
              icon="→"
              onClick={() => handleAction(onContinue)}
            />
            <ActionButton
              label="换个说法"
              icon="✎"
              onClick={() => handleAction(onRewrite)}
            />
            <ActionButton
              label="这里有点怪"
              icon="💡"
              onClick={() => handleAction(onDiagnose)}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: "var(--border-light)",
              margin: "2px 0",
            }}
          />

          {/* Custom input */}
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <input
              ref={inputRef}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleCustomKey}
              placeholder="自定义指令..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 13,
                padding: "4px 6px",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleCustomSubmit}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "none",
                background: "var(--gold)",
                color: "#0a0a0a",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                flexShrink: 0,
              }}
              title="发送"
              aria-label="发送自定义指令"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "6px 4px",
        borderRadius: 8,
        border: "none",
        background: hovered ? "var(--bg-tertiary)" : "transparent",
        color: "var(--text-primary)",
        fontSize: 11,
        cursor: "pointer",
        transition: "background 0.1s",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
