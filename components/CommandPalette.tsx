"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────
export type PaletteMode = "write" | "architect";

interface Command {
  id: string;
  label: string;
  description: string;
  icon: string;
}

// ── Mode-aware command sets ────────────────────────────────────
const WRITE_COMMANDS: Command[] = [
  { id: "rewrite",   label: "/rewrite",   description: "改写选中文字", icon: "✏️" },
  { id: "continue",  label: "/continue",  description: "AI 续写",       icon: "➡️" },
  { id: "expand",    label: "/expand",    description: "扩写内容",       icon: "📝" },
  { id: "outline",   label: "/outline",   description: "生成大纲",       icon: "📋" },
  { id: "summarize", label: "/summarize", description: "总结摘要",       icon: "📄" },
  { id: "health",    label: "/health",    description: "文本健康检查",   icon: "🩺" },
  { id: "focus",     label: "/focus",     description: "聚焦主题",       icon: "🎯" },
  { id: "draft",     label: "/draft",     description: "生成草稿",       icon: "📃" },
];

const ARCHITECT_COMMANDS: Command[] = [
  { id: "outline",   label: "/outline",   description: "生成大纲结构",   icon: "📋" },
  { id: "expand",    label: "/expand",    description: "展开章节细节",   icon: "📝" },
  { id: "review",    label: "/review",    description: "审查架构",       icon: "🔍" },
  { id: "research",  label: "/research",  description: "研究参考素材",   icon: "📚" },
];

// ── Helpers ────────────────────────────────────────────────────
function getCommandsForMode(mode: PaletteMode): Command[] {
  switch (mode) {
    case "architect":
      return ARCHITECT_COMMANDS;
    case "write":
    default:
      return WRITE_COMMANDS;
  }
}

// ── Props ──────────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  mode?: PaletteMode;
  onClose: () => void;
  onExecute: (commandId: string, param?: string) => void;
}

// ── Component ──────────────────────────────────────────────────
export default function CommandPalette({
  open,
  mode = "write",
  onClose,
  onExecute,
}: CommandPaletteProps) {
  const commands = getCommandsForMode(mode);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter((cmd) => {
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
                    color: "var(--gold)",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "monospace",
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
