"use client";

import { useState, useCallback } from "react";
import { useUIStore } from "@/lib/store";
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
        background: "#0d0d0d",
        borderBottom: "1px solid #1a1a1a",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            color: "#e0d8c8",
            background: "#141414",
            border: "1px solid #c4a565",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 13,
            outline: "none",
            width: 200,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
            color: "#e0d8c8",
            marginRight: 24,
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid transparent",
            transition: "border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#2a2a2a";
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
          color: "#8a8578",
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
              border: "1px solid #2a2a2a",
              background: "transparent",
              color: "#8a8578",
              fontSize: 12,
              cursor: "pointer",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c4a565";
              e.currentTarget.style.color = "#c4a565";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#8a8578";
            }}
          >
            Style Profile
          </button>
        )}
      </div>

      {/* User avatar placeholder */}
      <div
        style={{
          marginLeft: "auto",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#3d3520",
          color: "#c4a565",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        U
      </div>
    </header>
  );
}
