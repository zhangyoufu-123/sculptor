"use client";

import { useState, useCallback } from "react";
import { useUIStore } from "@/lib/store";
import ThemeSwitcher from "@/components/shared/ThemeSwitcher";
import type { SaveStatus } from "@/types/editor";

interface TopBarProps {
  documentTitle: string;
  onTitleChange: (title: string) => void;
  saveStatus: SaveStatus;
  onStyleClick?: () => void;
}

export default function TopBar({
  documentTitle,
  onTitleChange,
  saveStatus,
  onStyleClick,
}: TopBarProps) {
  const writingState = useUIStore((s) => s.writingState);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(documentTitle);

  const statusText =
    writingState === "loading" || writingState === "streaming"
      ? "DeepSeek connected"
      : saveStatus === "saving"
        ? "Saving..."
        : saveStatus === "unsaved"
          ? "Unsaved"
          : "Saved";

  const statusClass =
    writingState === "loading"
      ? "thinking"
      : writingState === "streaming"
        ? "streaming"
        : saveStatus === "saving"
          ? "thinking"
          : "idle";

  const handleTitleSave = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== documentTitle) {
      onTitleChange(trimmed);
    } else {
      setTitleDraft(documentTitle);
    }
    setEditingTitle(false);
  }, [titleDraft, documentTitle, onTitleChange]);

  return (
    <header
      style={{
        height: 48,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-light)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Document Title */}
      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTitleSave();
            if (e.key === "Escape") {
              setTitleDraft(documentTitle);
              setEditingTitle(false);
            }
          }}
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--gold)",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 13,
            outline: "none",
            width: 200,
            fontFamily: "var(--font-ui)",
          }}
        />
      ) : (
        <span
          onClick={() => {
            setTitleDraft(documentTitle);
            setEditingTitle(true);
          }}
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            marginRight: 24,
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid transparent",
            transition: "border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "transparent";
          }}
          title="Click to rename"
        >
          {documentTitle}
        </span>
      )}

      {/* Save Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-secondary)",
        }}
      >
        <span className={`status-dot ${statusClass}`} />
        <span>{statusText}</span>
      </div>

      {/* Center: Style Profile button */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {onStyleClick && (
          <button
            onClick={onStyleClick}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold)";
              e.currentTarget.style.color = "var(--gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Style Profile
          </button>
        )}
      </div>

      {/* Theme Switcher */}
      <ThemeSwitcher />

      {/* User avatar placeholder */}
      <div
        style={{
          marginLeft: 12,
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--bg-tertiary)",
          color: "var(--gold)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--font-ui)",
        }}
      >
        U
      </div>
    </header>
  );
}
