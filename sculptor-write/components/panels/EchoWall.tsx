"use client";

import { useMemo } from "react";
import type { ArchitectNode } from "@/types/architect";

interface EchoWallProps {
  nodes: ArchitectNode[];
  activeNodeId?: string | null;
  editorWordCount?: number;  // current word count in editor
  onNavigateNode?: (id: string) => void;
}

export default function EchoWall({
  nodes,
  activeNodeId,
  editorWordCount = 0,
  onNavigateNode,
}: EchoWallProps) {
  const activeNode = useMemo(
    () => nodes.find((n) => n.id === activeNodeId),
    [nodes, activeNodeId]
  );

  // Find next incomplete sibling/adjacent node
  const nextNode = useMemo(() => {
    if (!activeNode || nodes.length <= 1) return null;
    const idx = nodes.findIndex((n) => n.id === activeNode.id);
    if (idx >= 0 && idx < nodes.length - 1) {
      const next = nodes[idx + 1];
      return next;
    }
    return null;
  }, [nodes, activeNode]);

  // Check if current node word count meets target
  const isNodeComplete =
    activeNode?.targetWords && editorWordCount >= (activeNode.targetWords * 0.8);

  return (
    <div
      style={{
        width: "var(--sidebar-right)",
        minWidth: 280,
        height: "100%",
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-light)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-light)",
          background: "var(--bg-tertiary)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.5px",
          }}
        >
          回声壁
        </span>
      </div>

      {/* Current position card */}
      {activeNode ? (
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {/* Location indicator */}
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 8,
              borderRadius: 8,
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              📍 当前正在写
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--gold)",
                marginBottom: activeNode.writingTip ? 6 : 0,
              }}
            >
              {activeNode.label}
            </div>
            {activeNode.writingTip && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontStyle: "italic",
                  lineHeight: 1.4,
                }}
              >
                {activeNode.writingTip}
              </div>
            )}
          </div>

          {/* Word count progress */}
          {activeNode.targetWords && (
            <div
              style={{
                padding: "8px 12px",
                marginBottom: 8,
                borderRadius: 6,
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  字数进度
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isNodeComplete
                      ? "var(--success)"
                      : "var(--text-secondary)",
                  }}
                >
                  {editorWordCount}/{activeNode.targetWords}
                </span>
              </div>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: "var(--bg-tertiary)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((editorWordCount / (activeNode.targetWords || 1)) * 100))}%`,
                    background: isNodeComplete
                      ? "var(--success)"
                      : "var(--gold)",
                    transition: "width 0.3s ease",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )}

          {/* Next node prompt */}
          {isNodeComplete && nextNode && (
            <div
              onClick={() => onNavigateNode?.(nextNode.id)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(76, 175, 80, 0.08)",
                border: "1px solid rgba(76, 175, 80, 0.2)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(76, 175, 80, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(76, 175, 80, 0.08)";
              }}
            >
              <div style={{ fontSize: 10, color: "var(--success)", marginBottom: 4, fontWeight: 600 }}>
                ✅ 这个节点写得差不多了
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>
                下一个：
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {nextNode.label}
              </div>
              {nextNode.writingTip && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontStyle: "italic",
                    marginTop: 3,
                  }}
                >
                  {nextNode.writingTip}
                </div>
              )}
            </div>
          )}

          {/* Style suggestions placeholder */}
          {activeNode.notes && (
            <div
              style={{
                padding: "8px 12px",
                marginTop: 8,
                borderRadius: 6,
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--color-accent-warm)",
                background: "var(--bg-primary)",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 3, fontWeight: 600 }}>
                💡 写作建议
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {activeNode.notes}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              在左侧大纲中选择一个节点
              <br />
              开始写作 ✨
            </div>
          </div>
        </div>
      )}

      {/* Footer — writing stats */}
      <div
        style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--border-light)",
          fontSize: 10,
          color: "var(--text-tertiary)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{nodes.length} 个节点</span>
        <span>{editorWordCount} 字</span>
      </div>
    </div>
  );
}
