"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type DraftSnapshot,
  loadDrafts,
  saveDraft,
  deleteDraft,
  getDraftTimeString,
} from "@/lib/draft-snapshots";

interface DraftSnapshotsProps {
  docId: string;
  title: string;
  content: string;
  onRestore: (content: string) => void;
}

export default function DraftSnapshots({
  docId,
  title,
  content,
  onRestore,
}: DraftSnapshotsProps) {
  const [drafts, setDrafts] = useState<DraftSnapshot[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState("");

  // Load drafts on mount and when docId changes
  useEffect(() => {
    if (docId) setDrafts(loadDrafts(docId));
  }, [docId]);

  // Auto-save snapshot every 5 seconds when content changes
  useEffect(() => {
    if (!docId || !content || content === lastSavedContent) return;
    if (content.trim().length < 20) return; // don't save empty/short

    const timer = setTimeout(() => {
      const snap = saveDraft(docId, title, content);
      setLastSavedContent(content);
      setDrafts(loadDrafts(docId));
    }, 5000); // 5 second pause before snapshot

    return () => clearTimeout(timer);
  }, [docId, title, content, lastSavedContent]);

  const handleToggle = useCallback(() => {
    if (!isOpen && docId) setDrafts(loadDrafts(docId));
    setIsOpen((v) => !v);
  }, [isOpen, docId]);

  const handleRestore = useCallback(
    (draft: DraftSnapshot) => {
      onRestore(draft.content);
      setIsOpen(false);
    },
    [onRestore]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, draftId: string) => {
      e.stopPropagation();
      deleteDraft(docId, draftId);
      setDrafts(loadDrafts(docId));
    },
    [docId]
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        title="历史快照"
        style={{
          background: "none",
          border: "none",
          color: isOpen ? "var(--accent-gold, #c9a95c)" : "var(--text-tertiary)",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderRadius: 6,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.color = "var(--text-secondary)";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle
            cx="7"
            cy="7"
            r="5"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="7" cy="7" r="1.5" fill="currentColor" />
        </svg>
        快照
        {drafts.length > 0 && (
          <span
            style={{
              fontSize: 10,
              background: "var(--accent-gold, #c9a95c)",
              color: "#fff",
              borderRadius: 8,
              padding: "0 5px",
              fontWeight: 600,
              minWidth: 16,
              textAlign: "center",
            }}
          >
            {drafts.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 90,
            }}
          />
          {/* Panel */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 4,
              zIndex: 100,
              minWidth: 280,
              maxHeight: 360,
              overflow: "auto",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-light)",
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-light)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                历史快照
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {drafts.length} 个版本
              </span>
            </div>

            {/* Draft list */}
            {drafts.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                  fontFamily: "var(--font-ui)",
                }}
              >
                暂无快照
                <br />
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  停笔 5 秒后自动保存
                </span>
              </div>
            ) : (
              <div style={{ padding: "4px 0" }}>
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => handleRestore(draft)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Time */}
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--accent-gold, #c9a95c)",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                        minWidth: 70,
                        flexShrink: 0,
                        paddingTop: 1,
                      }}
                    >
                      {getDraftTimeString(draft)}
                    </span>

                    {/* Content preview */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-ui)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {draft.preview || draft.title}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(e, draft.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: 0,
                        opacity: 0,
                        transition: "opacity 0.15s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#e05555";
                        e.currentTarget.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text-tertiary)";
                        e.currentTarget.style.opacity = "1";
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      aria-label="删除快照"
                    >
                      ✕
                    </button>

                    {/* Inline style for hover reveal of delete */}
                    <style>{`
                      div:hover > button {
                        opacity: 0.5 !important;
                      }
                    `}</style>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
