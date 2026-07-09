"use client";

import { useState, useRef, useEffect } from "react";
import type { ArchNode, NodeType } from "@/types/architect";
import { NODE_TYPE_ICON, NODE_TYPE_COLOR, NODE_TYPE_LABEL, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types/architect";

interface OutlineNodeProps {
  node: ArchNode;
  allNodes: ArchNode[];
  depth: number;
  isFocused: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isSearchMatch: boolean;
  searchOpacity: number;
  editTitle: string;
  editSummary: string;
  onFocus: (id: string) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, title: string, summary?: string) => void;
  onCancelEdit: () => void;
  onToggle: (id: string) => void;
  onChangeType: (id: string, type: NodeType) => void;
  onDelete: (id: string) => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onEditTitleChange: (val: string) => void;
  onEditSummaryChange: (val: string) => void;
  // Autocomplete
  acVisible?: boolean;
  acSuggestion?: string;
  acAccept?: () => string | null;
  acDismiss?: () => void;
  acTrigger?: (text: string, nodeId: string) => void;
}

const TYPE_MENU: NodeType[] = ["thesis", "argument", "evidence", "counterargument", "background", "transition", "hook", "rebuttal", "conclusion", "imagery"];

export default function OutlineNode(props: OutlineNodeProps) {
  const {
    node, allNodes, depth, isFocused, isEditing, isHighlighted,
    isSelected, isSearchMatch, searchOpacity,
    editTitle, editSummary,
    onFocus, onStartEdit, onSaveEdit, onCancelEdit,
    onToggle, onChangeType, onDelete, onAddChild, onAddSibling,
    onEditTitleChange, onEditSummaryChange,
    acVisible, acSuggestion, acAccept, acDismiss, acTrigger,
  } = props;

  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const color = NODE_TYPE_COLOR[node.type] || "#888";
  const icon = NODE_TYPE_ICON[node.type] || "📌";
  const hasChildren = node.children.length > 0;

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isFocused]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSaveEdit(node.id, editTitle, editSummary);
      return;
    }
    if (e.key === "Escape") {
      if (acVisible && acDismiss) { acDismiss(); return; }
      onCancelEdit();
      return;
    }
    if (e.key === "Tab" && acVisible && acAccept) {
      e.preventDefault();
      const accepted = acAccept();
      if (accepted) onEditTitleChange(accepted);
      return;
    }
  };

  // ── Row background computation ───────────────────────────

  let rowBackground = "transparent";
  if (isHighlighted) {
    rowBackground = "rgba(201,169,92,0.12)";
  } else if (isSelected) {
    rowBackground = "rgba(201,169,92,0.08)";
  } else if (isFocused) {
    rowBackground = "var(--bg-tertiary)";
  }

  let borderLeft = "3px solid transparent";
  if (isHighlighted) {
    borderLeft = "3px solid var(--gold)";
  } else if (isSelected) {
    borderLeft = "3px solid var(--gold)";
  } else if (isSearchMatch) {
    borderLeft = "3px solid var(--gold)";
  } else if (isFocused) {
    borderLeft = `3px solid ${color}`;
  }

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      data-focused={isFocused ? "true" : "false"}
      style={{ opacity: searchOpacity, transition: "opacity 0.2s" }}
    >
      {/* Node row */}
      <div
        onClick={() => onFocus(node.id)}
        onDoubleClick={() => onStartEdit(node.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: `5px 8px 5px ${12 + depth * 20}px`,
          cursor: "pointer",
          background: rowBackground,
          borderLeft,
          borderBottom: "1px solid var(--border-light)",
          transition: "background 0.1s, border-color 0.1s",
          minHeight: 36,
        }}
        onMouseEnter={(e) => {
          if (!isFocused && !isSelected) e.currentTarget.style.background = "var(--bg-tertiary)";
        }}
        onMouseLeave={(e) => {
          if (!isFocused && !isSelected) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Expand/collapse toggle */}
        <span
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          style={{
            width: 16, textAlign: "center", fontSize: 10,
            color: "var(--text-tertiary)", cursor: hasChildren ? "pointer" : "default",
            opacity: hasChildren ? 1 : 0.3,
            transform: node.isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          ▼
        </span>

        {/* Type icon */}
        <span
          style={{ fontSize: 14, flexShrink: 0, cursor: "pointer" }}
          title={node.type}
          onClick={(e) => { e.stopPropagation(); setTypeMenuOpen(!typeMenuOpen); }}
        >
          {icon}
        </span>

        {/* Editing mode */}
        {isEditing ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }} onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => {
                onEditTitleChange(e.target.value);
                if (acTrigger) acTrigger(e.target.value, node.id);
              }}
              onKeyDown={handleKeyDown}
              className="input-field"
              style={{ fontSize: 13, padding: "3px 6px", minHeight: 28 }}
            />
            {/* Autocomplete ghost */}
            {acVisible && acSuggestion && (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", opacity: 0.5, padding: "0 4px", fontStyle: "italic" }}>
                {acSuggestion}
                <span style={{ fontSize: 10, color: "var(--gold)", marginLeft: 8 }}>Tab ↹</span>
              </div>
            )}
            <input
              value={editSummary}
              onChange={(e) => onEditSummaryChange(e.target.value)}
              placeholder="一句话摘要..."
              className="input-field"
              style={{ fontSize: 11, padding: "2px 6px", minHeight: 24 }}
            />
          </div>
        ) : (
          <>
            {/* Title + summary */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{
                fontSize: 13, fontWeight: node.type === "thesis" ? 600 : 400,
                color: "var(--text-primary)", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {node.title}
              </div>
              {node.summary && (
                <div style={{
                  fontSize: 10, color: "var(--text-tertiary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginTop: 1,
                }}>
                  {node.summary}
                </div>
              )}
              {node.writingTip && (
                <div style={{
                  fontSize: 9, color: "var(--color-accent-warm, #C49A6C)",
                  fontStyle: "italic", opacity: 0.7,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginTop: 1,
                }}>
                  💡 {node.writingTip}
                </div>
              )}
            </div>

            {/* Meta badges */}
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
              {node.priority && (
                <span style={{
                  fontSize: 9,
                  color: PRIORITY_COLORS[node.priority],
                  background: `${PRIORITY_COLORS[node.priority]}22`,
                  padding: "1px 5px",
                  borderRadius: 3,
                }}>
                  {PRIORITY_LABELS[node.priority]}
                </span>
              )}
              {node.targetWords ? (
                <span style={{
                  fontSize: 9,
                  color: "var(--text-tertiary)",
                  background: "var(--bg-tertiary)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}>
                  目标: {node.targetWords}字
                </span>
              ) : null}
              <span style={{ fontSize: 9, color: "var(--text-tertiary)", opacity: 0.6 }}>
                {NODE_TYPE_LABEL[node.type]}
              </span>
            </div>
          </>
        )}

        {/* Action buttons (show on hover or focus) */}
        {(isFocused || isSelected) && !isEditing && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <QuickBtn title="添加子节点" onClick={onAddChild}>+</QuickBtn>
            <QuickBtn title="添加同级节点" onClick={onAddSibling}>↵</QuickBtn>
            <QuickBtn title="删除" onClick={() => onDelete(node.id)}>×</QuickBtn>
          </div>
        )}
      </div>

      {/* Type menu popup */}
      {typeMenuOpen && (
        <div style={{
          position: "absolute", zIndex: 50, marginLeft: 20,
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 4, display: "flex", flexDirection: "column", gap: 1,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }} onClick={(e) => e.stopPropagation()}>
          {TYPE_MENU.map((t) => (
            <button
              key={t}
              onClick={() => { onChangeType(node.id, t); setTypeMenuOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 8px", borderRadius: 4, border: "none",
                background: node.type === t ? "var(--bg-tertiary)" : "transparent",
                color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span>{NODE_TYPE_ICON[t]}</span>
              <span>{NODE_TYPE_LABEL[t]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Children (recursive, only if expanded) */}
      {hasChildren && node.isExpanded && (
        <div>
          {node.children
            .map((cid) => allNodes.find((n) => n.id === cid))
            .filter(Boolean)
            .sort((a, b) => (a!.order || 0) - (b!.order || 0))
            .map((child) => child && (
              <OutlineNode
                key={child.id}
                {...props}
                node={child}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function QuickBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 20, height: 20, borderRadius: 4, border: "none",
        background: "var(--bg-tertiary)", color: "var(--text-secondary)",
        fontSize: 12, cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        transition: "all 0.1s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--gold)"; e.currentTarget.style.color = "var(--text-inverse)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
    >
      {children}
    </button>
  );
}
