"use client";

import { useState, useCallback, useRef } from "react";
import type { ArchNode, NodeType } from "@/types/architect";
import {
  createNode, addChild, addSibling, deleteNode, moveNode,
  toggleExpand, updateNode, expandAll, collapseToDepth,
  getChildren, getSiblings, getDepth, getRoots, nodeMap, genId, resetCounter,
} from "@/lib/ai/architect-tree";

export interface OutlineState {
  nodes: ArchNode[];
  focusId: string | null;
  editingId: string | null;
  selectedIds: Set<string>;
  chatPanelOpen: boolean;
  visualMode: "tree" | "graph";
}

export function useOutlineEditor(initialNodes: ArchNode[] = []) {
  const [nodes, setNodes] = useState<ArchNode[]>(initialNodes);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  const [visualMode, setVisualMode] = useState<"tree" | "graph">("tree");
  const [searchQuery, setSearchQuery] = useState("");

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const focusNode = nodes.find((n) => n.id === focusId);

  // ── Navigation ────────────────────────────────────────────

  const moveFocus = useCallback((dir: "up" | "down", shiftKey?: boolean) => {
    if (!focusId) {
      const roots = getRoots(nodesRef.current);
      if (roots.length) {
        const target = roots[0];
        setFocusId(target.id);
        if (shiftKey) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.add(target.id);
            return next;
          });
        }
      }
      return;
    }
    const node = nodesRef.current.find((n) => n.id === focusId);
    if (!node) return;

    const siblings = nodesRef.current.filter((n) => n.parent === node.parent)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === focusId);

    if (dir === "down" && idx < siblings.length - 1) {
      const target = siblings[idx + 1];
      setFocusId(target.id);
      if (shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.add(target.id);
          // Also include currently focused node
          next.add(focusId);
          return next;
        });
      } else {
        setSelectedIds(new Set());
      }
    } else if (dir === "up" && idx > 0) {
      const target = siblings[idx - 1];
      setFocusId(target.id);
      if (shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.add(target.id);
          next.add(focusId);
          return next;
        });
      } else {
        setSelectedIds(new Set());
      }
    }
  }, [focusId]);

  const focusParent = useCallback(() => {
    if (!focusId) return;
    const node = nodesRef.current.find((n) => n.id === focusId);
    if (node?.parent) setFocusId(node.parent);
    setSelectedIds(new Set());
  }, [focusId]);

  const focusChild = useCallback(() => {
    if (!focusId) return;
    const node = nodesRef.current.find((n) => n.id === focusId);
    if (node?.children.length) setFocusId(node.children[0]);
    setSelectedIds(new Set());
  }, [focusId]);

  // ── Selection range ────────────────────────────────────────

  /**
   * Select all nodes between fromId and toId in visual order (same level siblings).
   */
  const selectRange = useCallback((fromId: string, toId: string) => {
    const fromNode = nodesRef.current.find((n) => n.id === fromId);
    const toNode = nodesRef.current.find((n) => n.id === toId);
    if (!fromNode || !toNode || fromNode.parent !== toNode.parent) return;

    const siblings = nodesRef.current
      .filter((n) => n.parent === fromNode.parent)
      .sort((a, b) => a.order - b.order);

    const fromIdx = siblings.findIndex((s) => s.id === fromId);
    const toIdx = siblings.findIndex((s) => s.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);

    setSelectedIds(new Set(siblings.slice(start, end + 1).map((s) => s.id)));
  }, []);

  // ── Create nodes ───────────────────────────────────────────

  const addNodeAfter = useCallback((type: NodeType = "argument") => {
    if (!focusId) {
      const child = createNode(null, type, "新节点");
      setNodes((prev) => [...prev, { ...child }]);
      setFocusId(child.id);
      setEditingId(child.id);
      setSelectedIds(new Set());
      return;
    }
    const sibling = createNode(null, type, "新节点");
    setNodes((prev) => addSibling(prev, focusId, sibling));
    setFocusId(sibling.id);
    setEditingId(sibling.id);
    setSelectedIds(new Set());
  }, [focusId]);

  const addChildNode = useCallback((type: NodeType = "evidence") => {
    if (!focusId) return;
    const child = createNode(null, type, "新节点");
    setNodes((prev) => addChild(prev, focusId, child));
    // Auto-expand parent
    setNodes((prev) => prev.map((n) => n.id === focusId ? { ...n, isExpanded: true } : n));
    setFocusId(child.id);
    setEditingId(child.id);
    setSelectedIds(new Set());
  }, [focusId]);

  // ── Edit / Delete ──────────────────────────────────────────

  const startEditing = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const saveEdit = useCallback((id: string, title: string, summary?: string) => {
    setNodes((prev) => updateNode(prev, id, { title, summary }));
    setEditingId(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const removeNode = useCallback((id: string) => {
    setNodes((prev) => deleteNode(prev, id));
    if (focusId === id) setFocusId(null);
    setEditingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [focusId]);

  // ── Batch delete selected ──────────────────────────────────

  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    let updated = nodesRef.current;
    for (const id of selectedIds) {
      updated = deleteNode(updated, id);
    }
    setNodes(updated);
    // If focused node was among deleted, clear focus
    if (focusId && selectedIds.has(focusId)) {
      setFocusId(null);
    }
    setEditingId(null);
    setSelectedIds(new Set());
  }, [focusId, selectedIds]);

  // ── Count descendants ──────────────────────────────────────

  const countDescendants = useCallback((id: string): number => {
    const count = (nodeId: string): number => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node || !node.children.length) return 0;
      let total = node.children.length;
      for (const cid of node.children) {
        total += count(cid);
      }
      return total;
    };
    return count(id);
  }, []);

  /** Recursively collect all descendant IDs of a node (for batch delete count) */
  const collectDescendantIds = useCallback((id: string): Set<string> => {
    const result = new Set<string>();
    const collect = (nodeId: string) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;
      for (const cid of node.children) {
        result.add(cid);
        collect(cid);
      }
    };
    collect(id);
    return result;
  }, []);

  // ── Reorder / Move ─────────────────────────────────────────

  const shiftNode = useCallback((dir: "up" | "down") => {
    if (!focusId) return;
    const node = nodesRef.current.find((n) => n.id === focusId);
    if (!node) return;

    const siblings = nodesRef.current
      .filter((n) => n.parent === node.parent)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === focusId);
    if (dir === "up" && idx <= 0) return;
    if (dir === "down" && idx >= siblings.length - 1) return;

    const target = siblings[dir === "up" ? idx - 1 : idx + 1];
    const swapOrder = target.order;

    setNodes((prev) => prev.map((n) => {
      if (n.id === focusId) return { ...n, order: swapOrder };
      if (n.id === target.id) return { ...n, order: node.order };
      return n;
    }));
  }, [focusId]);

  const indentNode = useCallback(() => {
    if (!focusId) return;
    const node = nodesRef.current.find((n) => n.id === focusId);
    if (!node) return;

    // Find previous sibling to become new parent
    const siblings = nodesRef.current
      .filter((n) => n.parent === node.parent)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === focusId);
    if (idx <= 0) return; // No previous sibling to indent under

    const newParent = siblings[idx - 1];
    setNodes((prev) => {
      // Remove from old parent's children, add to new parent's children
      return prev.map((n) => {
        if (n.id === focusId) return { ...n, parent: newParent.id, order: newParent.children.length };
        if (n.id === node.parent) return { ...n, children: n.children.filter((c) => c !== focusId) };
        if (n.id === newParent.id) return { ...n, children: [...n.children, focusId], isExpanded: true };
        return n;
      });
    });
  }, [focusId]);

  const unindentNode = useCallback(() => {
    if (!focusId) return;
    const node = nodesRef.current.find((n) => n.id === focusId);
    if (!node?.parent) return;

    const parent = nodesRef.current.find((n) => n.id === node.parent);
    if (!parent?.parent) return; // Can't unindent below root level

    const grandparentId = parent.parent;
    setNodes((prev) => prev.map((n) => {
      if (n.id === focusId) return { ...n, parent: grandparentId, order: 0 };
      if (n.id === node.parent) return { ...n, children: n.children.filter((c) => c !== focusId) };
      if (n.id === grandparentId) return { ...n, children: [...n.children, focusId] };
      return n;
    }));
  }, [focusId]);

  // ── Expand / Collapse ──────────────────────────────────────

  const toggleNode = useCallback((id: string) => {
    setNodes((prev) => toggleExpand(prev, id));
  }, []);

  const doExpandAll = useCallback(() => {
    setNodes((prev) => expandAll(prev));
  }, []);

  const doCollapseLevel = useCallback(() => {
    setNodes((prev) => collapseToDepth(prev, 1));
  }, []);

  // ── Type change ────────────────────────────────────────────

  const changeType = useCallback((id: string, type: NodeType) => {
    setNodes((prev) => updateNode(prev, id, { type }));
  }, []);

  // ── Priority cycle ─────────────────────────────────────────

  const cyclePriority = useCallback((id: string) => {
    setNodes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      const next: Record<string, ArchNode["priority"]> = {
        "undefined": "high",
        "high": "medium",
        "medium": "low",
        "low": undefined,
      };
      const key = n.priority || "undefined";
      return { ...n, priority: next[key] };
    }));
  }, []);

  // ── Target words ───────────────────────────────────────────

  const setTargetWords = useCallback((id: string, words: number) => {
    setNodes((prev) => updateNode(prev, id, { targetWords: words }));
  }, []);

  // ── Selection ──────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Search ─────────────────────────────────────────────────

  const getSearchResults = useCallback((): string[] => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodesRef.current
      .filter((n) => n.title.toLowerCase().includes(q))
      .map((n) => n.id);
  }, [searchQuery]);

  // ── Bulk replace (for AI generation) ───────────────────────

  const replaceAll = useCallback((newNodes: ArchNode[]) => {
    setNodes(newNodes);
    setFocusId(null);
    setEditingId(null);
    setSelectedIds(new Set());
  }, []);

  // ── AI interactions ────────────────────────────────────────

  const highlightNodes = useRef<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const flashNodes = useCallback((ids: string[]) => {
    setHighlighted(new Set(ids));
    setTimeout(() => setHighlighted(new Set()), 3000);
  }, []);

  // ── Exposed state ──────────────────────────────────────────

  const state: OutlineState = {
    nodes, focusId, editingId, selectedIds, chatPanelOpen, visualMode,
  };

  return {
    state,
    // navigation
    focusNode, moveFocus, focusParent, focusChild,
    // create
    addNodeAfter, addChildNode,
    // edit/delete
    startEditing, saveEdit, cancelEdit, removeNode, removeSelected,
    // count
    countDescendants, collectDescendantIds,
    // reorder
    shiftNode, indentNode, unindentNode,
    // expand
    toggleNode, doExpandAll, doCollapseLevel,
    // type
    changeType,
    // priority / target words
    cyclePriority, setTargetWords,
    // selection
    toggleSelect, selectRange,
    // search
    searchQuery, setSearchQuery, getSearchResults,
    // bulk
    replaceAll, setNodes, setFocusId, setEditingId,
    setChatPanelOpen, setVisualMode,
    // AI highlight
    highlighted, flashNodes,
  };
}
