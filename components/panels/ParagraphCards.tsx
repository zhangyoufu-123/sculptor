"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ArchitectNode } from "@/types/architect";

/* ------------------------------------------------------------------ */
/*  Paragraph Card Props                                               */
/* ------------------------------------------------------------------ */
export interface ParagraphCardsProps {
  nodes: ArchitectNode[];
  activeNodeId?: string | null;
  editorContent?: string;
  onSelectNode?: (id: string) => void;
  onAIExpandNode?: (id: string, label: string) => void;
  onUpdateNodeLabel?: (id: string, label: string) => void;
  onUpdateNodeNotes?: (id: string, notes: string) => void;
  onReorderNode?: (id: string, targetId: string, position: "before" | "after") => void;
}

/* ------------------------------------------------------------------ */
/*  Detect which paragraphs match each node                            */
/* ------------------------------------------------------------------ */
function detectParagraphs(
  editorContent: string | undefined,
  nodes: ArchitectNode[]
): Map<string, { index: number; preview: string }[]> {
  const result = new Map<string, { index: number; preview: string }[]>();
  if (!editorContent?.trim()) return result;

  const paragraphs = editorContent.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const nodeLabels = nodes.map((n) => ({
    id: n.id,
    label: n.label.toLowerCase(),
    length: n.label.length,
  }));

  paragraphs.forEach((para, idx) => {
    const paraLower = para.toLowerCase();
    let bestId: string | null = null;
    let bestLen = 0;
    for (const nl of nodeLabels) {
      if (paraLower.includes(nl.label) && nl.length > bestLen) {
        bestId = nl.id;
        bestLen = nl.length;
      }
    }
    if (bestId) {
      const existing = result.get(bestId) || [];
      existing.push({
        index: idx,
        preview: para.trim().slice(0, 40) + (para.trim().length > 40 ? "…" : ""),
      });
      result.set(bestId, existing);
    }
  });
  return result;
}

/* ------------------------------------------------------------------ */
/*  Single Paragraph Card                                              */
/* ------------------------------------------------------------------ */
interface CardProps {
  node: ArchitectNode;
  depth: number;
  isActive: boolean;
  matchedParagraphs: { index: number; preview: string }[];
  onSelect: (id: string) => void;
  onAIExpand: (id: string, label: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  showDropBefore: boolean;
  showDropAfter: boolean;
  canDrop: boolean;
  isDragging: boolean;
}

function Card({
  node,
  depth,
  isActive,
  matchedParagraphs,
  onSelect,
  onAIExpand,
  onUpdateNotes,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragOver,
  showDropBefore,
  showDropAfter,
  canDrop,
  isDragging,
}: CardProps) {
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(node.notes || "");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // Sync noteDraft when node.notes changes externally
  useEffect(() => {
    if (!isNoteEditing) {
      setNoteDraft(node.notes || "");
    }
  }, [node.notes, isNoteEditing]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isNoteEditing && noteInputRef.current) {
      noteInputRef.current.focus();
      noteInputRef.current.setSelectionRange(noteDraft.length, noteDraft.length);
    }
  }, [isNoteEditing]);

  const commitNotes = useCallback(() => {
    setIsNoteEditing(false);
    if (noteDraft !== (node.notes || "")) {
      onUpdateNotes(node.id, noteDraft);
    }
  }, [noteDraft, node.notes, node.id, onUpdateNotes]);

  const collapseRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      {/* Drop indicator above */}
      {showDropBefore && canDrop && (
        <div
          style={{
            height: 3,
            background: "var(--accent-gold, #c9a95c)",
            borderRadius: 2,
            margin: "2px 8px",
          }}
        />
      )}

      <div
        draggable
        onClick={() => onSelect(node.id)}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", node.id);
          onDragStart(node.id);
        }}
        onDragOver={(e) => canDrop && onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => canDrop && onDrop(e, node.id)}
        onDragEnd={onDragEnd}
        style={{
          margin: `2px ${4 + depth * 8}px`,
          borderRadius: 10,
          border: isActive
            ? "1.5px solid var(--accent-gold, #c9a95c)"
            : "1.5px solid var(--border-light)",
          background: isActive
            ? "var(--bg-elevated)"
            : isDragOver && canDrop
            ? "rgba(201,169,92,0.06)"
            : "var(--bg-primary)",
          cursor: "grab",
          opacity: isDragging ? 0.35 : 1,
          transition: "all 0.15s ease",
          boxShadow: isActive
            ? "0 0 12px rgba(201,169,92,0.15)"
            : "0 1px 3px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            background: isActive ? "rgba(201,169,92,0.04)" : "transparent",
            borderBottom: isNoteEditing || matchedParagraphs.length > 0
              ? "1px solid var(--border-light)"
              : "none",
          }}
        >
          {/* Drag handle */}
          <span style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            cursor: "grab",
            userSelect: "none",
            flexShrink: 0,
          }}>
            ⠿
          </span>

          {/* Node label */}
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontFamily: "var(--font-ui)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {node.label}
          </span>

          {/* AI expand button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAIExpand(node.id, node.label);
            }}
            title="AI 扩写此节点"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--text-tertiary)",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-gold, #c9a95c)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            ✦
          </button>
        </div>

        {/* Card body: notes + matched paragraphs */}
        {(isNoteEditing || (node.notes && node.notes.trim())) || matchedParagraphs.length > 0 ? (
          <div style={{ padding: "8px 12px" }}>
            {/* Notes area */}
            {isNoteEditing ? (
              <textarea
                ref={noteInputRef}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={commitNotes}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) commitNotes();
                  if (e.key === "Escape") {
                    setNoteDraft(node.notes || "");
                    setIsNoteEditing(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="添加备注…"
                rows={2}
                style={{
                  width: "100%",
                  fontSize: 11,
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-secondary)",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--accent-gold, #c9a95c)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            ) : node.notes && node.notes.trim() ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNoteEditing(true);
                }}
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-ui)",
                  cursor: "text",
                  lineHeight: 1.5,
                  marginBottom: matchedParagraphs.length > 0 ? 8 : 0,
                  padding: "4px 6px",
                  borderRadius: 4,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                📝 {node.notes}
              </div>
            ) : (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsNoteEditing(true);
                }}
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-ui)",
                  cursor: "text",
                  opacity: 0.5,
                  padding: "4px 6px",
                  marginBottom: matchedParagraphs.length > 0 ? 8 : 0,
                }}
              >
                添加备注…
              </div>
            )}

            {/* Matched paragraphs */}
            {matchedParagraphs.map((mp) => (
              <div
                key={mp.index}
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-ui)",
                  padding: "4px 6px",
                  borderLeft: "2px solid var(--accent-gold, #c9a95c)",
                  marginBottom: 2,
                  opacity: 0.7,
                }}
              >
                §{mp.index + 1} {mp.preview}
              </div>
            ))}
          </div>
        ) : null}

        {/* Card footer: click to add note hint (only if no notes/paragraphs yet) */}
        {(!node.notes || !node.notes.trim()) && matchedParagraphs.length === 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsNoteEditing(true);
            }}
            style={{
              padding: "6px 12px 10px",
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-ui)",
              opacity: 0.4,
              cursor: "text",
            }}
          >
            + 添加备注
          </div>
        )}
      </div>

      {/* Drop indicator below */}
      {showDropAfter && canDrop && (
        <div
          style={{
            height: 3,
            background: "var(--accent-gold, #c9a95c)",
            borderRadius: 2,
            margin: "2px 8px",
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ParagraphCards container                                           */
/* ------------------------------------------------------------------ */
export default function ParagraphCards({
  nodes,
  activeNodeId,
  editorContent,
  onSelectNode,
  onAIExpandNode,
  onUpdateNodeLabel,
  onUpdateNodeNotes,
  onReorderNode,
}: ParagraphCardsProps) {
  const [dragState, setDragState] = useState<{
    draggedId: string | null;
    dragOverId: string | null;
    dropPosition: "before" | "after" | null;
  }>({ draggedId: null, dragOverId: null, dropPosition: null });

  // Build flat ordered list (root nodes + their children recursively)
  function flattenNodes(
    nodeList: ArchitectNode[],
    allNodes: ArchitectNode[],
    depth: number,
    parentId: string | null
  ): { node: ArchitectNode; depth: number; parentId: string | null }[] {
    const result: { node: ArchitectNode; depth: number; parentId: string | null }[] = [];
    for (const node of nodeList) {
      result.push({ node, depth, parentId });
      const children = (node.children || [])
        .map((cid) => allNodes.find((n) => n.id === cid))
        .filter(Boolean) as ArchitectNode[];
      if (children.length > 0) {
        result.push(...flattenNodes(children, allNodes, depth + 1, node.id));
      }
    }
    return result;
  }

  const rootNodes = nodes.filter(
    (n) => !nodes.some((other) => other.children?.includes(n.id))
  );
  const flatNodes = flattenNodes(rootNodes, nodes, 0, null);

  // Paragraph matching
  const paraMap = detectParagraphs(editorContent, nodes);

  // Sibling check for drag validation
  const nodeParentMap = new Map<string, string | null>();
  for (const n of nodes) {
    const parent = nodes.find((p) => p.children?.includes(n.id));
    nodeParentMap.set(n.id, parent?.id ?? null);
  }
  const areSiblings = (a: string, b: string) =>
    nodeParentMap.get(a) === nodeParentMap.get(b);

  // Drag handlers
  const handleDragStart = useCallback((id: string) => {
    setDragState({ draggedId: id, dragOverId: null, dropPosition: null });
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      e.preventDefault();
      if (dragState.draggedId === nodeId || !dragState.draggedId) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      setDragState({
        ...dragState,
        dragOverId: nodeId,
        dropPosition: e.clientY < midY ? "before" : "after",
      });
    },
    [dragState.draggedId]
  );

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({ ...prev, dragOverId: null, dropPosition: null }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const { draggedId, dropPosition } = dragState;
      if (draggedId && dropPosition && onReorderNode) {
        onReorderNode(draggedId, targetId, dropPosition);
      }
      setDragState({ draggedId: null, dragOverId: null, dropPosition: null });
    },
    [dragState, onReorderNode]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedId: null, dragOverId: null, dropPosition: null });
  }, []);

  if (flatNodes.length === 0) {
    return (
      <div style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: 24 }}>
        暂无结构节点 — 继续写作，AI 将自动生成
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {flatNodes.map(({ node, depth }) => {
        const isActive = activeNodeId === node.id;
        const matchedParagraphs = paraMap.get(node.id) || [];
        const canDrop =
          !!dragState.draggedId &&
          dragState.draggedId !== node.id &&
          areSiblings(dragState.draggedId, node.id);

        return (
          <Card
            key={node.id}
            node={node}
            depth={depth}
            isActive={isActive}
            matchedParagraphs={matchedParagraphs}
            onSelect={(id) => onSelectNode?.(id)}
            onAIExpand={(id, label) => onAIExpandNode?.(id, label)}
            onUpdateNotes={(id, notes) => onUpdateNodeNotes?.(id, notes)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragOver={dragState.dragOverId === node.id}
            showDropBefore={
              dragState.dragOverId === node.id &&
              dragState.dropPosition === "before"
            }
            showDropAfter={
              dragState.dragOverId === node.id &&
              dragState.dropPosition === "after"
            }
            canDrop={canDrop}
            isDragging={dragState.draggedId === node.id}
          />
        );
      })}
    </div>
  );
}
