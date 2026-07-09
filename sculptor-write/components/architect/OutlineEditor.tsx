"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { NodeType } from "@/types/architect";
import { NODE_TYPE_ICON, NODE_TYPE_LABEL } from "@/types/architect";
import OutlineNode from "./OutlineNode";
import type { OutlineState } from "@/hooks/useOutlineEditor";

const TYPE_MENU: NodeType[] = ["thesis", "argument", "evidence", "counterargument", "background", "transition", "hook", "rebuttal", "conclusion", "imagery"];

interface OutlineEditorProps {
  state: OutlineState;
  // From hook
  moveFocus: (dir: "up" | "down", shiftKey?: boolean) => void;
  focusParent: () => void;
  focusChild: () => void;
  addNodeAfter: (type?: NodeType) => void;
  addChildNode: (type?: NodeType) => void;
  startEditing: (id: string) => void;
  saveEdit: (id: string, title: string, summary?: string) => void;
  cancelEdit: () => void;
  removeNode: (id: string) => void;
  removeSelected?: () => void;
  countDescendants?: (id: string) => number;
  collectDescendantIds?: (id: string) => Set<string>;
  shiftNode: (dir: "up" | "down") => void;
  indentNode: () => void;
  unindentNode: () => void;
  toggleNode: (id: string) => void;
  changeType: (id: string, type: NodeType) => void;
  cyclePriority?: (id: string) => void;
  setTargetWords?: (id: string, words: number) => void;
  doExpandAll: () => void;
  doCollapseLevel: () => void;
  setEditingId: (id: string | null) => void;
  setFocusId: (id: string | null) => void;
  toggleSelect?: (id: string) => void;
  selectRange?: (from: string, to: string) => void;
  // Search
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  getSearchResults?: () => string[];
  // Editing state
  editTitle: string;
  editSummary: string;
  onEditTitleChange: (v: string) => void;
  onEditSummaryChange: (v: string) => void;
  // Autocomplete
  acVisible?: boolean;
  acSuggestion?: string;
  acAccept?: () => string | null;
  acDismiss?: () => void;
  acTrigger?: (text: string, nodeId: string) => void;
  // AI Fill
  onAIFill?: (nodeId: string) => void;
}

export default function OutlineEditor({
  state, moveFocus, focusParent, focusChild,
  addNodeAfter, addChildNode,
  startEditing, saveEdit, cancelEdit, removeNode,
  removeSelected: _removeSelected,
  countDescendants: _countDescendants,
  collectDescendantIds: _collectDescendantIds,
  shiftNode, indentNode, unindentNode, toggleNode,
  changeType, cyclePriority: _cyclePriority,
  setTargetWords: _setTargetWords,
  doExpandAll, doCollapseLevel,
  setEditingId, setFocusId,
  toggleSelect: _toggleSelect,
  selectRange: _selectRange,
  searchQuery: _searchQuery = "",
  setSearchQuery: _setSearchQuery,
  getSearchResults: _getSearchResults,
  editTitle, editSummary, onEditTitleChange, onEditSummaryChange,
  acVisible, acSuggestion, acAccept, acDismiss, acTrigger,
  onAIFill,
}: OutlineEditorProps) {

  // Default implementations for optional props
  const removeSelected = _removeSelected || (() => {});
  const countDescendants = _countDescendants || (() => 0);
  const collectDescendantIds = _collectDescendantIds || (() => new Set<string>());
  const cyclePriority = _cyclePriority || (() => {});
  const setTargetWords = _setTargetWords || (() => {});
  const toggleSelect = _toggleSelect || (() => {});
  const selectRange = _selectRange || (() => {});
  const searchQuery = _searchQuery;
  const setSearchQuery = _setSearchQuery || ((_q: string) => {});
  // Stable fallback — inline arrow in useEffect deps causes infinite re-renders
  const getSearchResultsNoop = useRef(() => [] as string[]);
  const getSearchResults = _getSearchResults || getSearchResultsNoop.current;

  const { nodes, focusId, editingId, selectedIds } = state;

  // ── Local UI state ───────────────────────────────────────

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchResultIdx, setSearchResultIdx] = useState(0);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [typeMenuPos, setTypeMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [targetWordsOpen, setTargetWordsOpen] = useState(false);
  const [targetWordsInput, setTargetWordsInput] = useState("");
  const [targetWordsNodeId, setTargetWordsNodeId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Get root nodes sorted by order
  const roots = nodes
    .filter((n) => n.parent === null)
    .sort((a, b) => a.order - b.order);

  // ── Computed search state ────────────────────────────────

  const activeSearchSet = new Set(searchResults);

  // ── Calculate batch delete info ──────────────────────────

  const getBatchDeleteInfo = useCallback(() => {
    if (selectedIds.size === 0) return { count: 0, totalWithDescendants: 0 };
    const allIds = new Set<string>(selectedIds);
    for (const id of selectedIds) {
      const descendants = collectDescendantIds(id);
      descendants.forEach((d) => allIds.add(d));
    }
    return {
      count: selectedIds.size,
      totalWithDescendants: allIds.size,
    };
  }, [selectedIds, collectDescendantIds]);

  // ── Focus node element ref for Cmd+T positioning ─────────

  const getFocusedNodeElement = useCallback((): DOMRect | null => {
    if (!editorRef.current) return null;
    const el = editorRef.current.querySelector('[data-focused="true"]');
    return el ? el.getBoundingClientRect() : null;
  }, []);

  // ── Stable callback refs (prevents infinite re-renders) ───
  const callbacksRef = useRef({
    editingId, focusId, searchVisible, confirmDelete, confirmBatchDelete,
    typeMenuOpen, targetWordsOpen, selectedIds, nodes,
    moveFocus, focusParent, focusChild, startEditing, addNodeAfter,
    addChildNode, unindentNode, shiftNode, doExpandAll, doCollapseLevel,
    cyclePriority, onAIFill, getFocusedNodeElement, setSearchVisible,
    setSearchQuery, setSearchResults, setSearchResultIdx,
    setConfirmDelete, setConfirmBatchDelete, setTypeMenuOpen, setTypeMenuPos,
    setTargetWordsOpen, setTargetWordsNodeId, setTargetWordsInput,
    removeNode,
  });
  callbacksRef.current = {
    editingId, focusId, searchVisible, confirmDelete, confirmBatchDelete,
    typeMenuOpen, targetWordsOpen, selectedIds, nodes,
    moveFocus, focusParent, focusChild, startEditing, addNodeAfter,
    addChildNode, unindentNode, shiftNode, doExpandAll, doCollapseLevel,
    cyclePriority, onAIFill, getFocusedNodeElement, setSearchVisible,
    setSearchQuery, setSearchResults, setSearchResultIdx,
    setConfirmDelete, setConfirmBatchDelete, setTypeMenuOpen, setTypeMenuPos,
    setTargetWordsOpen, setTargetWordsNodeId, setTargetWordsInput,
    removeNode,
  };

  // ── Keyboard shortcuts ───────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const cb = callbacksRef.current;
    const mod = e.metaKey || e.ctrlKey;

    // ── Global shortcuts (work even when editing) ──────────

    // Cmd+F: toggle search
    if (e.key === "f" && mod) {
      e.preventDefault();
      cb.setSearchVisible((prev) => {
        if (!prev) {
          cb.setSearchQuery("");
          cb.setSearchResults([]);
          cb.setSearchResultIdx(0);
        }
        return !prev;
      });
      return;
    }

    // Escape: close modals / search
    if (e.key === "Escape") {
      if (cb.searchVisible) {
        e.preventDefault();
        cb.setSearchVisible(false);
        cb.setSearchQuery("");
        cb.setSearchResults([]);
        return;
      }
      if (cb.confirmDelete) {
        e.preventDefault();
        cb.setConfirmDelete(null);
        return;
      }
      if (cb.confirmBatchDelete) {
        e.preventDefault();
        cb.setConfirmBatchDelete(false);
        return;
      }
      if (cb.typeMenuOpen) {
        e.preventDefault();
        cb.setTypeMenuOpen(false);
        return;
      }
      if (cb.targetWordsOpen) {
        e.preventDefault();
        cb.setTargetWordsOpen(false);
        return;
      }
    }

    // Don't intercept other keys when editing
    if (cb.editingId) return;

    // Cmd+J: AI Fill
    if (e.key === "j" && mod && cb.focusId && cb.onAIFill) {
      e.preventDefault();
      cb.onAIFill(cb.focusId);
      return;
    }

    // Cmd+Shift+[: collapse to depth 1
    if (e.key === "[" && mod && e.shiftKey) {
      e.preventDefault();
      cb.doCollapseLevel();
      return;
    }

    // Cmd+Shift+]: expand all
    if (e.key === "]" && mod && e.shiftKey) {
      e.preventDefault();
      cb.doExpandAll();
      return;
    }

    // Cmd+T: type switch popup
    if (e.key === "t" && mod && cb.focusId) {
      e.preventDefault();
      const rect = cb.getFocusedNodeElement();
      if (rect) {
        cb.setTypeMenuPos({ x: rect.left + 20, y: rect.bottom + 4 });
      } else {
        cb.setTypeMenuPos({ x: 200, y: 200 });
      }
      cb.setTypeMenuOpen(true);
      return;
    }

    // Cmd+W: target words
    if (e.key === "w" && mod && cb.focusId) {
      e.preventDefault();
      const node = cb.nodes.find((n) => n.id === cb.focusId);
      cb.setTargetWordsNodeId(cb.focusId);
      cb.setTargetWordsInput(node?.targetWords ? String(node.targetWords) : "");
      cb.setTargetWordsOpen(true);
      return;
    }

    // Cmd+P: cycle priority
    if (e.key === "p" && mod && cb.focusId) {
      e.preventDefault();
      cb.cyclePriority(cb.focusId);
      return;
    }

    if (e.key === "ArrowDown") { e.preventDefault(); cb.moveFocus("down", e.shiftKey); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); cb.moveFocus("up", e.shiftKey); return; }
    if (e.key === "ArrowLeft" && mod) { e.preventDefault(); cb.doCollapseLevel(); return; }
    if (e.key === "ArrowRight" && mod) { e.preventDefault(); cb.doExpandAll(); return; }
    if (e.key === "ArrowLeft" && !mod) { e.preventDefault(); cb.focusParent(); return; }
    if (e.key === "ArrowRight" && !mod) { e.preventDefault(); cb.focusChild(); return; }

    if (e.key === "Enter" && !mod) {
      e.preventDefault();
      if (cb.focusId) cb.startEditing(cb.focusId);
      return;
    }
    if (e.key === "Enter" && mod && cb.focusId) {
      e.preventDefault(); cb.addNodeAfter(); return;
    }
    if (e.key === "Tab" && !mod && cb.focusId) {
      e.preventDefault(); cb.addChildNode(); return;
    }
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault(); cb.unindentNode(); return;
    }
    // Cmd+Backspace: show delete confirmation
    if ((e.key === "Backspace" || e.key === "Delete") && mod && cb.focusId) {
      e.preventDefault();
      if (cb.selectedIds.size > 1) {
        cb.setConfirmBatchDelete(true);
      } else {
        cb.setConfirmDelete(cb.focusId);
      }
      return;
    }
    if (e.key === "ArrowUp" && e.altKey) {
      e.preventDefault(); cb.shiftNode("up"); return;
    }
    if (e.key === "ArrowDown" && e.altKey) {
      e.preventDefault(); cb.shiftNode("down"); return;
    }
    if (e.key === " " && cb.focusId) {
      e.preventDefault(); cb.startEditing(cb.focusId); return;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Update search results when query changes ─────────────

  useEffect(() => {
    const results = getSearchResults();
    setSearchResults(results);
    if (results.length > 0) {
      setSearchResultIdx(0);
      if (results[0]) {
        setFocusId(results[0]);
      }
    }
  }, [searchQuery, getSearchResults, setFocusId]);

  // ── Search Enter: jump to next result ────────────────────

  const handleSearchEnter = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIdx = (searchResultIdx + 1) % searchResults.length;
    setSearchResultIdx(nextIdx);
    const targetId = searchResults[nextIdx];
    if (targetId) {
      setFocusId(targetId);
      // Scroll to node
      setTimeout(() => {
        const el = editorRef.current?.querySelector(`[data-node-id="${targetId}"]`);
        if (el) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 50);
    }
  }, [searchResultIdx, searchResults, setFocusId]);

  const handleSearchPrev = useCallback(() => {
    if (searchResults.length === 0) return;
    const nextIdx = (searchResultIdx - 1 + searchResults.length) % searchResults.length;
    setSearchResultIdx(nextIdx);
    const targetId = searchResults[nextIdx];
    if (targetId) {
      setFocusId(targetId);
      setTimeout(() => {
        const el = editorRef.current?.querySelector(`[data-node-id="${targetId}"]`);
        if (el) {
          el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 50);
    }
  }, [searchResultIdx, searchResults, setFocusId]);

  // ── Delete confirmation handlers ─────────────────────────

  const handleConfirmDelete = useCallback(() => {
    if (confirmDelete) {
      removeNode(confirmDelete);
      setConfirmDelete(null);
    }
  }, [confirmDelete, removeNode]);

  const handleConfirmBatchDelete = useCallback(() => {
    removeSelected();
    setConfirmBatchDelete(false);
  }, [removeSelected]);

  // ── Target words handler ─────────────────────────────────

  const handleTargetWordsSubmit = useCallback(() => {
    if (targetWordsNodeId) {
      const num = parseInt(targetWordsInput, 10);
      if (!isNaN(num) && num > 0) {
        setTargetWords(targetWordsNodeId, num);
      } else if (targetWordsInput === "" || targetWordsInput === "0") {
        setTargetWords(targetWordsNodeId, 0);
      }
    }
    setTargetWordsOpen(false);
    setTargetWordsNodeId(null);
  }, [targetWordsNodeId, targetWordsInput, setTargetWords]);

  // ── Delete button handler (from OutlineNode) ─────────────

  const handleNodeDelete = useCallback((id: string) => {
    setConfirmDelete(id);
  }, []);

  // ── Render ───────────────────────────────────────────────

  const batchInfo = getBatchDeleteInfo();

  return (
    <div
      ref={editorRef}
      style={{
        flex: 1, overflow: "auto", background: "var(--bg-primary)",
        fontFamily: "var(--font-ui)", userSelect: "none",
        position: "relative",
      }}
      tabIndex={0}
    >
      {/* Header */}
      <div style={{
        display: "flex", gap: 4, padding: "8px 12px",
        borderBottom: "1px solid var(--border-light)",
        background: "var(--bg-secondary)", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>大纲编辑器</span>
        <div style={{ flex: 1 }} />
        <HeaderBtn onClick={doExpandAll} title="展开全部 (⌘→ / ⌘⇧])">展开</HeaderBtn>
        <HeaderBtn onClick={doCollapseLevel} title="折叠至一级 (⌘← / ⌘⇧[)">折叠</HeaderBtn>
      </div>

      {/* Search bar */}
      {searchVisible && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-light)",
          background: "var(--bg-tertiary)",
        }}>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>🔍</span>
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSearchEnter(); }
              if (e.key === "Escape") { e.preventDefault(); setSearchVisible(false); setSearchQuery(""); setSearchResults([]); }
            }}
            placeholder="搜索节点标题..."
            style={{
              flex: 1, fontSize: 12, padding: "3px 8px",
              background: "var(--bg-primary)", color: "var(--text-primary)",
              border: "1px solid var(--border)", borderRadius: 4,
              outline: "none",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 40, textAlign: "center" }}>
            {searchResults.length > 0
              ? `${searchResultIdx + 1}/${searchResults.length}`
              : searchQuery ? "0" : ""}
          </span>
          <button
            onClick={handleSearchPrev}
            title="上一个结果"
            style={iconBtnStyle}
          >
            ↑
          </button>
          <button
            onClick={handleSearchEnter}
            title="下一个结果"
            style={iconBtnStyle}
          >
            ↓
          </button>
          <button
            onClick={() => { setSearchVisible(false); setSearchQuery(""); setSearchResults([]); }}
            title="关闭"
            style={{ ...iconBtnStyle, fontSize: 14 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Node tree */}
      <div style={{ padding: "0 0 200px 0" }}>
        {roots.length === 0 ? (
          <div style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: 40 }}>
            <p style={{ marginBottom: 8 }}>空架构</p>
            <p style={{ fontSize: 11 }}>按 Enter 添加根节点，或在 AI 对话面板中描述你的写作意图</p>
          </div>
        ) : (
          roots.map((root) => (
            <OutlineNode
              key={root.id}
              node={root}
              allNodes={nodes}
              depth={0}
              isFocused={focusId === root.id}
              isEditing={editingId === root.id}
              isHighlighted={false}
              isSelected={selectedIds.has(root.id)}
              isSearchMatch={activeSearchSet.has(root.id)}
              searchOpacity={searchQuery ? (activeSearchSet.has(root.id) ? 1 : 0.3) : 1}
              editTitle={editTitle}
              editSummary={editSummary}
              onFocus={(id) => {
                setFocusId(id);
                setEditingId(null);
              }}
              onStartEdit={startEditing}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onToggle={toggleNode}
              onChangeType={changeType}
              onDelete={handleNodeDelete}
              onAddChild={() => addChildNode()}
              onAddSibling={() => addNodeAfter()}
              onEditTitleChange={onEditTitleChange}
              onEditSummaryChange={onEditSummaryChange}
              acVisible={acVisible}
              acSuggestion={acSuggestion}
              acAccept={acAccept}
              acDismiss={acDismiss}
              acTrigger={acTrigger}
            />
          ))
        )}
      </div>

      {/* ── Delete confirmation modal (single) ─────────────── */}
      {confirmDelete && (
        <div style={overlayStyle} onClick={() => setConfirmDelete(null)}>
          <div style={modalCardStyle} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 16 }}>
              删除此节点及其所有 <strong>{countDescendants(confirmDelete)}</strong> 个子节点？
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDelete(null)} style={cancelBtnStyle}>取消</button>
              <button onClick={handleConfirmDelete} style={dangerBtnStyle}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch delete confirmation ──────────────────────── */}
      {confirmBatchDelete && (
        <div
          style={overlayStyle}
          onClick={() => setConfirmBatchDelete(false)}
        >
          <div
            style={modalCardStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 16 }}>
              删除 <strong>{batchInfo.count}</strong> 个节点及它们的子节点？
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmBatchDelete(false)}
                style={cancelBtnStyle}
              >
                取消
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                style={dangerBtnStyle}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Type switch popup (Cmd+T) ──────────────────────── */}
      {typeMenuOpen && typeMenuPos && (
        <>
          {/* Backdrop to catch clicks outside */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 60 }}
            onClick={() => setTypeMenuOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              left: typeMenuPos.x,
              top: typeMenuPos.y,
              zIndex: 70,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              maxHeight: 300,
              overflow: "auto",
            }}
          >
            {TYPE_MENU.map((t) => {
              const isActive = focusId && nodes.find((n) => n.id === focusId)?.type === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (focusId) changeType(focusId, t);
                    setTypeMenuOpen(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 8px", borderRadius: 4, border: "none",
                    background: isActive ? "var(--bg-tertiary)" : "transparent",
                    color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
                    textAlign: "left", whiteSpace: "nowrap",
                  }}
                >
                  <span>{NODE_TYPE_ICON[t]}</span>
                  <span>{NODE_TYPE_LABEL[t]}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Target words overlay (Cmd+W) ───────────────────── */}
      {targetWordsOpen && (
        <div
          style={overlayStyle}
          onClick={() => setTargetWordsOpen(false)}
        >
          <div
            style={modalCardStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
              设置目标字数
            </div>
            <input
              autoFocus
              type="number"
              min={0}
              value={targetWordsInput}
              onChange={(e) => setTargetWordsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleTargetWordsSubmit(); }
                if (e.key === "Escape") { e.preventDefault(); setTargetWordsOpen(false); }
              }}
              placeholder="例如 500"
              style={{
                width: "100%", fontSize: 14, padding: "6px 10px",
                background: "var(--bg-primary)", color: "var(--text-primary)",
                border: "1px solid var(--border)", borderRadius: 6,
                outline: "none", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setTargetWordsOpen(false)} style={cancelBtnStyle}>
                取消
              </button>
              <button onClick={handleTargetWordsSubmit} style={primaryBtnStyle}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      <div style={{
        position: "fixed", bottom: 12, right: 12, zIndex: 5,
        display: "flex", gap: 8, opacity: 0.4, pointerEvents: "none",
        flexWrap: "wrap", justifyContent: "flex-end",
      }}>
        <Kbd>↵ 编辑</Kbd>
        <Kbd>Tab 子节点</Kbd>
        <Kbd>⌘↵ 同级</Kbd>
        <Kbd>Alt↑↓ 移动</Kbd>
        <Kbd>⇧Tab 提升</Kbd>
        <Kbd>⌘F 搜索</Kbd>
        <Kbd>⌘T 类型</Kbd>
        <Kbd>⌘W 字数</Kbd>
        <Kbd>⌘P 优先级</Kbd>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalCardStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  borderRadius: 12,
  border: "1px solid var(--gold)",
  padding: 24,
  minWidth: 320,
  maxWidth: 440,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 13,
  cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: 6,
  border: "none",
  background: "#e53935",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 600,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: 6,
  border: "none",
  background: "var(--gold)",
  color: "var(--bg-primary)",
  fontSize: 13,
  cursor: "pointer",
  fontWeight: 600,
};

const iconBtnStyle: React.CSSProperties = {
  width: 24, height: 24,
  borderRadius: 4,
  border: "1px solid var(--border-light)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// ── Sub-components ──────────────────────────────────────────

function HeaderBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border-light)",
        background: "transparent", color: "var(--text-secondary)", fontSize: 11,
        cursor: "pointer", transition: "all 0.1s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, color: "var(--text-tertiary)",
      background: "var(--bg-secondary)", padding: "2px 6px",
      borderRadius: 4, border: "1px solid var(--border-light)",
    }}>
      {children}
    </span>
  );
}
