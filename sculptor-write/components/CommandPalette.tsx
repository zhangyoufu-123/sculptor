"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type PaletteIntent =
  | "continue"
  | "rewrite"
  | "style_experiment"
  | "search_material"
  | "generate_outline"
  | "more_concise"
  | "more_flowery"
  | "more_humorous";

interface Command {
  id: PaletteIntent;
  label: string;
  description: string;
  icon: string;
}

const COMMANDS: Command[] = [
  { id: "continue", label: "继续", description: "AI 续写", icon: "➡️" },
  { id: "rewrite", label: "改写", description: "改写选中内容", icon: "✏️" },
  { id: "style_experiment", label: "风格", description: "风格实验", icon: "🎨" },
  { id: "search_material", label: "论据", description: "查找论据", icon: "📚" },
  { id: "generate_outline", label: "大纲", description: "生成大纲", icon: "📋" },
  { id: "more_concise", label: "简洁", description: "更简洁", icon: "📏" },
  { id: "more_flowery", label: "华丽", description: "更华丽", icon: "🌸" },
  { id: "more_humorous", label: "幽默", description: "更幽默", icon: "😄" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onExecute: (intent: string, param?: string) => void;
}

export default function CommandPalette({
  open,
  onClose,
  onExecute,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
    );
  });

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Clamp index
  useEffect(() => {
    const maxIndex = Math.max(0, filtered.length - 1);
    if (selectedIndex > maxIndex) {
      setSelectedIndex(maxIndex);
    }
  }, [filtered.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            onExecute(filtered[selectedIndex].id);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, onExecute, onClose]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "18vh",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxHeight: "55vh",
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入指令..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 15,
              fontFamily: "inherit",
            }}
            autoComplete="off"
          />
          <kbd
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              padding: "2px 6px",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontFamily: "inherit",
            }}
          >
            esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: "40px 16px",
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: 14,
              }}
            >
              无匹配指令
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => {
                onExecute(cmd.id);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                cursor: "pointer",
                backgroundColor:
                  i === selectedIndex ? "var(--bg-elevated)" : "transparent",
                borderLeft:
                  i === selectedIndex
                    ? "2px solid var(--gold)"
                    : "2px solid transparent",
                transition: "background-color 0.1s",
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  marginRight: 12,
                  flexShrink: 0,
                }}
              >
                {cmd.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {cmd.label}
                </div>
                <div
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    marginTop: 1,
                  }}
                >
                  {cmd.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-secondary)",
          }}
        >
          <span>↑↓ 导航</span>
          <span>↵ 选择</span>
          <span>esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
