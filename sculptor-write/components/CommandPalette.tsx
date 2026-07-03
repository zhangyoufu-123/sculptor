"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Intent } from "@/types/editor";

interface Command {
  id: Intent;
  label: string;
  icon: string;
  description: string;
  shortcut: string;
}

const COMMANDS: Command[] = [
  {
    id: "rewrite",
    label: "Rewrite",
    icon: "✏️",
    description: "Rewrite selection in a different style",
    shortcut: "⌘R",
  },
  {
    id: "continue",
    label: "Continue",
    icon: "➡️",
    description: "Continue writing from the cursor",
    shortcut: "⌘L",
  },
  {
    id: "explain",
    label: "Explain",
    icon: "💡",
    description: "Explain the selected text simply",
    shortcut: "⌘E",
  },
  {
    id: "shorter",
    label: "Shorter",
    icon: "📏",
    description: "Make the text more concise",
    shortcut: "⌘−",
  },
  {
    id: "longer",
    label: "Longer",
    icon: "📐",
    description: "Expand with more detail",
    shortcut: "⌘+",
  },
  {
    id: "more_formal",
    label: "More Formal",
    icon: "🎩",
    description: "Elevate the tone to formal/professional",
    shortcut: "",
  },
  {
    id: "more_casual",
    label: "More Casual",
    icon: "🩳",
    description: "Make the tone conversational",
    shortcut: "",
  },
  {
    id: "translate_en",
    label: "Translate to English",
    icon: "🌐",
    description: "Translate or improve English clarity",
    shortcut: "",
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (intent: Intent) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onCommand,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
    );
  });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input on next frame after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Clamp selected index when filtered results change
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onCommand(filteredCommands[selectedIndex].id);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onCommand, onClose]
  );

  const handleSelect = useCallback(
    (intent: Intent) => {
      onCommand(intent);
      onClose();
    },
    [onCommand, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560,
          maxHeight: "60vh",
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18, opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e0d8c8",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "#888",
              padding: "2px 6px",
              border: "1px solid #444",
              borderRadius: 4,
            }}
          >
            esc
          </span>
        </div>

        {/* Command list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {filteredCommands.length === 0 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#666",
                fontSize: 14,
              }}
            >
              No matching commands
            </div>
          )}
          {filteredCommands.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => handleSelect(cmd.id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                cursor: "pointer",
                backgroundColor:
                  i === selectedIndex ? "#2a2a2a" : "transparent",
                borderLeft:
                  i === selectedIndex
                    ? "2px solid #c4a565"
                    : "2px solid transparent",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {/* Icon */}
              <span style={{ fontSize: 18, marginRight: 12, flexShrink: 0 }}>
                {cmd.icon}
              </span>

              {/* Label + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#e0d8c8",
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {cmd.label}
                </div>
                <div
                  style={{
                    color: "#888",
                    fontSize: 12,
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {cmd.description}
                </div>
              </div>

              {/* Shortcut badge */}
              {cmd.shortcut && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#888",
                    padding: "2px 6px",
                    border: "1px solid #444",
                    borderRadius: 4,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  {cmd.shortcut}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #2a2a2a",
            display: "flex",
            gap: 14,
            fontSize: 11,
            color: "#666",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
