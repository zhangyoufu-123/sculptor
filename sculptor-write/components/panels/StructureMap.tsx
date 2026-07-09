"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ArchitectNode } from "@/types/architect";
import { BUBBLE_COLORS, BUBBLE_LABELS } from "@/types/architect";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface StructureMapProps {
  nodes: ArchitectNode[];
  activeNodeId?: string | null;
  editorContent?: string;
  onSelectNode?: (id: string) => void;
  onAIExpand?: (nodeId: string, label: string) => void;
  onFocusNode?: (id: string) => void;
  onReorderNode?: (id: string, targetId: string, position: "before" | "after") => void;
  onAIFillNode?: (id: string) => void;
  onAddChildNode?: (id: string) => void;
  onAddSiblingNode?: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onLocateInArchitect?: (id: string) => void;
  onActiveNodeChange?: (id: string) => void;
  onScrollToParagraph?: (paragraphIndex: number) => void;
  onToggleView?: (view: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
  nodeTargetWords?: number;
}

interface DragState {
  draggedId: string | null;
  dragOverId: string | null;
  dropPosition: "before" | "after" | null;
}

interface UnmappedParagraph {
  index: number;
  text: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function detectParagraphs(
  editorContent: string | undefined,
  nodes: ArchitectNode[]
): { mapped: Map<string, number[]>; unmapped: UnmappedParagraph[]; bestMatchId: string | null } {
  const mapped = new Map<string, number[]>();
  const unmapped: UnmappedParagraph[] = [];

  if (!editorContent || editorContent.trim().length === 0) {
    return { mapped, unmapped, bestMatchId: null };
  }

  const paragraphs = editorContent.split(/\n\n+/).filter((p) => p.trim().length > 0);

  // Build node label lookup (lowercased for case-insensitive matching)
  const nodeLabels = nodes.map((n) => ({
    id: n.id,
    label: n.label.toLowerCase(),
    length: n.label.length,
  }));

  let bestMatchId: string | null = null;
  let bestMatchScore = 0;

  paragraphs.forEach((para, idx) => {
    const paraLower = para.toLowerCase();
    let matchedNodeId: string | null = null;
    let matchedLength = 0;

    // Find the best matching node for this paragraph
    // (longest label match = most specific)
    for (const nl of nodeLabels) {
      if (paraLower.includes(nl.label) && nl.length > matchedLength) {
        matchedNodeId = nl.id;
        matchedLength = nl.length;
      }
    }

    if (matchedNodeId) {
      const existing = mapped.get(matchedNodeId) || [];
      existing.push(idx);
      mapped.set(matchedNodeId, existing);

      // Track best overall match for onActiveNodeChange
      if (matchedLength > bestMatchScore) {
        bestMatchScore = matchedLength;
        bestMatchId = matchedNodeId;
      }
    } else {
      unmapped.push({
        index: idx,
        text: para.trim().substring(0, 30) + (para.trim().length > 30 ? "..." : ""),
      });
    }
  });

  return { mapped, unmapped, bestMatchId };
}

/* ------------------------------------------------------------------ */
/*  StructureMap                                                       */
/* ------------------------------------------------------------------ */
export default function StructureMap({
  nodes,
  activeNodeId,
  editorContent,
  onSelectNode,
  onAIExpand,
  onFocusNode,
  onReorderNode,
  onAIFillNode,
  onAddChildNode,
  onAddSiblingNode,
  onDeleteNode,
  onLocateInArchitect,
  onActiveNodeChange,
  onScrollToParagraph,
  onToggleView,
}: StructureMapProps) {
  const [view, setView] = useState<"structure" | "style">("structure");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: "",
    nodeLabel: "",
    nodeTargetWords: undefined,
  });
  const [dragState, setDragState] = useState<DragState>({
    draggedId: null,
    dragOverId: null,
    dropPosition: null,
  });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTargetWordsId, setEditingTargetWordsId] = useState<string | null>(null);
  const [editingTargetWords, setEditingTargetWords] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Build tree: find root nodes ──────────────────────────────────
  const rootNodes = nodes.filter((n) => !nodes.some((other) => other.children?.includes(n.id)));

  // ── Paragraph detection ──────────────────────────────────────────
  const { unmapped } = detectParagraphs(editorContent, nodes);

  // ── Auto-detect active node from paragraph ───────────────────────
  useEffect(() => {
    if (!editorContent || !onActiveNodeChange) return;
    const { bestMatchId } = detectParagraphs(editorContent, nodes);
    if (bestMatchId) {
      onActiveNodeChange(bestMatchId);
    }
  }, [editorContent, nodes, onActiveNodeChange]);

  // ── Close context menu on outside click ──────────────────────────
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu.visible]);

  // ── Context menu handlers ────────────────────────────────────────
  const closeMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: ArchitectNode) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        nodeId: node.id,
        nodeLabel: node.label,
        nodeTargetWords: node.targetWords,
      });
    },
    []
  );

  // ── Drag handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback((nodeId: string) => {
    setDragState({ draggedId: nodeId, dragOverId: null, dropPosition: null });
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, nodeId: string) => {
      e.preventDefault();
      if (dragState.draggedId === nodeId || !dragState.draggedId) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position: "before" | "after" = e.clientY < midY ? "before" : "after";
      setDragState((prev) => ({ ...prev, dragOverId: nodeId, dropPosition: position }));
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

  // ── Compute siblings for drag validation ─────────────────────────
  const nodeParentMap = useRef<Map<string, string | null>>(new Map());
  nodeParentMap.current.clear();
  for (const node of nodes) {
    const parent = nodes.find((n) => n.children?.includes(node.id));
    nodeParentMap.current.set(node.id, parent?.id || null);
  }

  const areSiblings = useCallback(
    (aId: string, bId: string): boolean => {
      const pa = nodeParentMap.current.get(aId);
      const pb = nodeParentMap.current.get(bId);
      return pa === pb;
    },
    []
  );

  // ── View toggle ──────────────────────────────────────────────────
  const handleViewToggle = useCallback(
    (v: "structure" | "style") => {
      setView(v);
      onToggleView?.(v);
    },
    [onToggleView]
  );

  // ── Inline title edit ────────────────────────────────────────────
  const startEditingTitle = useCallback((nodeId: string, label: string) => {
    setEditingNodeId(nodeId);
    setEditingTitle(label);
    closeMenu();
  }, [closeMenu]);

  const commitTitleEdit = useCallback(() => {
    // In a full implementation this would call a rename callback.
    // For now, closing the inline edit visually suffices.
    setEditingNodeId(null);
    setEditingTitle("");
  }, []);

  // ── Inline target words edit ─────────────────────────────────────
  const startEditingTargetWords = useCallback(
    (nodeId: string, current?: number) => {
      setEditingTargetWordsId(nodeId);
      setEditingTargetWords(current ? String(current) : "");
      closeMenu();
    },
    [closeMenu]
  );

  const commitTargetWordsEdit = useCallback(() => {
    setEditingTargetWordsId(null);
    setEditingTargetWords("");
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Keyframe animation injection */}
      <style>{`
        @keyframes breathe-active {
          0%   { box-shadow: 0 0 4px var(--gold); }
          50%  { box-shadow: 0 0 12px var(--gold); }
          100% { box-shadow: 0 0 4px var(--gold); }
        }
        .sm-context-menu {
          position: fixed;
          z-index: 9999;
          background: var(--bg-elevated, #222);
          border: 1px solid var(--border, #252525);
          border-radius: 6px;
          padding: 4px 0;
          min-width: 160px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .sm-context-menu-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          color: var(--text-primary, #e0d4b8);
          cursor: pointer;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          transition: background 0.1s;
        }
        .sm-context-menu-item:hover {
          background: var(--bg-tertiary, #1a1a1a);
        }
        .sm-context-menu-item.danger {
          color: #e05555;
        }
        .sm-context-menu-separator {
          height: 1px;
          background: var(--border, #252525);
          margin: 4px 0;
        }
        .sm-drop-indicator {
          height: 2px;
          background: var(--gold, #c9a95c);
          border-radius: 1px;
          margin: 0 8px;
        }
      `}</style>

      {/* ── View toggle tab bar ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border, #252525)",
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        {(["structure", "style"] as const).map((v) => (
          <button
            key={v}
            onClick={() => handleViewToggle(v)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: view === v ? 600 : 400,
              color: view === v ? "var(--gold, #c9a95c)" : "var(--text-tertiary, #a89870)",
              background: "transparent",
              border: "none",
              borderBottom: view === v ? "2px solid var(--gold, #c9a95c)" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {v === "structure" ? "架构" : "风格演化"}
          </button>
        ))}
      </div>

      {/* ── Scrollable content area ─────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {view === "style" ? (
          /* ── Style evolution placeholder ─────────────────────── */
          <div
            style={{
              color: "var(--text-tertiary, #a89870)",
              fontSize: 12,
              textAlign: "center",
              padding: 32,
            }}
          >
            风格演化功能开发中...
          </div>
        ) : rootNodes.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────── */
          <div
            style={{
              color: "var(--text-tertiary, #a89870)",
              fontSize: 12,
              textAlign: "center",
              padding: 16,
            }}
          >
            暂无架构节点
          </div>
        ) : (
          /* ── Tree nodes ──────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {rootNodes.map((root) => (
              <TreeNode
                key={root.id}
                node={root}
                allNodes={nodes}
                depth={0}
                activeNodeId={activeNodeId}
                onSelect={onSelectNode || onFocusNode}
                onAIExpand={onAIExpand}
                onContextMenu={handleContextMenu}
                dragState={dragState}
                areSiblings={areSiblings}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                editingNodeId={editingNodeId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                commitTitleEdit={commitTitleEdit}
                editingTargetWordsId={editingTargetWordsId}
                editingTargetWords={editingTargetWords}
                setEditingTargetWords={setEditingTargetWords}
                commitTargetWordsEdit={commitTargetWordsEdit}
              />
            ))}
          </div>
        )}

        {/* ── Unmapped paragraphs (structure view only) ────────── */}
        {view === "structure" && unmapped.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid var(--border, #252525)", paddingTop: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-secondary, #a89870)", fontWeight: 600 }}>
                未映射段落
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--bg-primary, #111)",
                  background: "#c9a95c",
                  padding: "1px 5px",
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                {unmapped.length}
              </span>
            </div>
            {unmapped.map((up) => (
              <div
                key={up.index}
                onClick={() => onScrollToParagraph?.(up.index)}
                style={{
                  padding: "4px 8px 4px 12px",
                  fontSize: 11,
                  color: "var(--text-tertiary, #a89870)",
                  cursor: onScrollToParagraph ? "pointer" : "default",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRadius: 3,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary, #1a1a1a)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                §{up.index + 1} {up.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Context menu (portal) ──────────────────────────────── */}
      {contextMenu.visible && (
        <div
          className="sm-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {onAIFillNode && (
            <button
              className="sm-context-menu-item"
              onClick={() => {
                onAIFillNode(contextMenu.nodeId);
                closeMenu();
              }}
            >
              🧠 AI填充内容
            </button>
          )}
          <button
            className="sm-context-menu-item"
            onClick={() => startEditingTitle(contextMenu.nodeId, contextMenu.nodeLabel)}
          >
            ✏️ 修改标题
          </button>
          {onAddChildNode && (
            <button
              className="sm-context-menu-item"
              onClick={() => {
                onAddChildNode(contextMenu.nodeId);
                closeMenu();
              }}
            >
              ➕ 添加子节点
            </button>
          )}
          {onAddSiblingNode && (
            <button
              className="sm-context-menu-item"
              onClick={() => {
                onAddSiblingNode(contextMenu.nodeId);
                closeMenu();
              }}
            >
              ➕ 添加同级节点
            </button>
          )}
          {onDeleteNode && (
            <button
              className="sm-context-menu-item danger"
              onClick={() => {
                const confirmed = window.confirm("确定要删除此节点吗？");
                if (confirmed) {
                  onDeleteNode(contextMenu.nodeId);
                }
                closeMenu();
              }}
            >
              🗑️ 删除节点
            </button>
          )}
          <button
            className="sm-context-menu-item"
            onClick={() => startEditingTargetWords(contextMenu.nodeId, contextMenu.nodeTargetWords)}
          >
            📊 设定目标字数
          </button>
          <div className="sm-context-menu-separator" />
          {onLocateInArchitect && (
            <button
              className="sm-context-menu-item"
              onClick={() => {
                onLocateInArchitect(contextMenu.nodeId);
                closeMenu();
              }}
            >
              🔍 在大纲中定位
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TreeNode                                                           */
/* ------------------------------------------------------------------ */
interface TreeNodeProps {
  node: ArchitectNode;
  allNodes: ArchitectNode[];
  depth: number;
  activeNodeId?: string | null;
  onSelect?: (id: string) => void;
  onAIExpand?: (nodeId: string, label: string) => void;
  onContextMenu: (e: React.MouseEvent, node: ArchitectNode) => void;
  dragState: DragState;
  areSiblings: (aId: string, bId: string) => boolean;
  onDragStart: (nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
  onDragEnd: () => void;
  editingNodeId: string | null;
  editingTitle: string;
  setEditingTitle: (v: string) => void;
  commitTitleEdit: () => void;
  editingTargetWordsId: string | null;
  editingTargetWords: string;
  setEditingTargetWords: (v: string) => void;
  commitTargetWordsEdit: () => void;
}

function TreeNode({
  node,
  allNodes,
  depth,
  activeNodeId,
  onSelect,
  onAIExpand,
  onContextMenu,
  dragState,
  areSiblings,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  editingNodeId,
  editingTitle,
  setEditingTitle,
  commitTitleEdit,
  editingTargetWordsId,
  editingTargetWords,
  setEditingTargetWords,
  commitTargetWordsEdit,
}: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const children = (node.children || [])
    .map((cid) => allNodes.find((n) => n.id === cid))
    .filter(Boolean) as ArchitectNode[];
  const hasChildren = children.length > 0;
  const isActive = activeNodeId === node.id;
  const color = BUBBLE_COLORS[node.type] || "#888";

  // Drag state for this specific node
  const isDragging = dragState.draggedId === node.id;
  const isDragOver = dragState.dragOverId === node.id;
  const showDropBefore = isDragOver && dragState.dropPosition === "before";
  const showDropAfter = isDragOver && dragState.dropPosition === "after";
  const canDrop = dragState.draggedId && areSiblings(dragState.draggedId, node.id);

  return (
    <div>
      {/* Drop indicator above */}
      {showDropBefore && canDrop && <div className="sm-drop-indicator" />}

      <div
        draggable
        onClick={() => onSelect?.(node.id)}
        onContextMenu={(e) => onContextMenu(e, node)}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", node.id);
          onDragStart(node.id);
        }}
        onDragOver={(e) => {
          if (canDrop) onDragOver(e, node.id);
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          if (canDrop) onDrop(e, node.id);
        }}
        onDragEnd={onDragEnd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: `5px 8px 5px ${8 + depth * 16}px`,
          borderRadius: 5,
          cursor: "grab",
          fontSize: 12,
          background: isActive
            ? "var(--bg-tertiary, #1a1a1a)"
            : isDragOver && canDrop
            ? "rgba(201,169,92,0.08)"
            : "transparent",
          border: isActive
            ? `1px solid var(--gold, #c9a95c)`
            : "1px solid transparent",
          color: isActive ? "var(--text-primary, #e0d4b8)" : "var(--text-secondary, #a89870)",
          transition: "all 0.12s",
          position: "relative",
          animation: isActive ? "breathe-active 2s ease-in-out infinite" : "none",
          opacity: isDragging ? 0.4 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isDragOver) {
            e.currentTarget.style.background = "var(--bg-tertiary, #1a1a1a)";
            e.currentTarget.style.color = "var(--text-primary, #e0d4b8)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive && !isDragOver) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary, #a89870)";
          }
        }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            style={{
              fontSize: 10,
              width: 14,
              textAlign: "center",
              cursor: "pointer",
              color: "var(--text-tertiary, #a89870)",
              flexShrink: 0,
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            ▼
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        {/* Color dot + label (or inline edit) */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        {editingNodeId === node.id ? (
          <input
            autoFocus
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitleEdit();
              if (e.key === "Escape") commitTitleEdit();
            }}
            onBlur={commitTitleEdit}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              fontSize: 12,
              background: "var(--bg-primary, #111)",
              border: "1px solid var(--gold, #c9a95c)",
              borderRadius: 3,
              color: "var(--text-primary, #e0d4b8)",
              padding: "1px 4px",
              outline: "none",
              minWidth: 0,
            }}
          />
        ) : (
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {node.label}
          </span>
        )}

        {/* Type badge */}
        <span
          style={{
            fontSize: 9,
            color: "var(--text-tertiary, #a89870)",
            background: "var(--bg-primary, #111)",
            padding: "1px 4px",
            borderRadius: 3,
            flexShrink: 0,
            opacity: isActive ? 1 : 0.6,
          }}
        >
          {BUBBLE_LABELS[node.type] || node.type}
        </span>

        {/* AI Expand button */}
        {onAIExpand && !hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAIExpand(node.id, node.label);
            }}
            title="AI 展开子节点"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gold, #c9a95c)",
              fontSize: 13,
              padding: 0,
              lineHeight: 1,
              opacity: 0.5,
              flexShrink: 0,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.5";
            }}
          >
            🧠
          </button>
        )}

        {/* Target words (or inline edit) */}
        {editingTargetWordsId === node.id ? (
          <input
            autoFocus
            type="number"
            value={editingTargetWords}
            onChange={(e) => setEditingTargetWords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTargetWordsEdit();
              if (e.key === "Escape") commitTargetWordsEdit();
            }}
            onBlur={commitTargetWordsEdit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 50,
              fontSize: 11,
              background: "var(--bg-primary, #111)",
              border: "1px solid var(--gold, #c9a95c)",
              borderRadius: 3,
              color: "var(--text-primary, #e0d4b8)",
              padding: "1px 4px",
              outline: "none",
              flexShrink: 0,
            }}
            placeholder="字数"
          />
        ) : node.targetWords ? (
          <span
            style={{
              fontSize: 9,
              color: "var(--text-tertiary, #a89870)",
              flexShrink: 0,
            }}
          >
            {node.targetWords}字
          </span>
        ) : null}
      </div>

      {/* v5.1: Writing tip */}
      {node.writingTip && (
        <div style={{
          padding: `1px 8px 1px ${8 + (depth + 1) * 16}px`,
          fontSize: 10, color: "var(--text-tertiary)",
          fontStyle: "italic", lineHeight: 1.3,
          opacity: isActive ? 0.8 : 0.5,
          maxWidth: 220, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {node.writingTip}
        </div>
      )}

      {/* Drop indicator below */}
      {showDropAfter && canDrop && <div className="sm-drop-indicator" />}

      {/* Children */}
      {hasChildren && !collapsed && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              allNodes={allNodes}
              depth={depth + 1}
              activeNodeId={activeNodeId}
              onSelect={onSelect}
              onAIExpand={onAIExpand}
              onContextMenu={onContextMenu}
              dragState={dragState}
              areSiblings={areSiblings}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              editingNodeId={editingNodeId}
              editingTitle={editingTitle}
              setEditingTitle={setEditingTitle}
              commitTitleEdit={commitTitleEdit}
              editingTargetWordsId={editingTargetWordsId}
              editingTargetWords={editingTargetWords}
              setEditingTargetWords={setEditingTargetWords}
              commitTargetWordsEdit={commitTargetWordsEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
