// lib/ai/architect-tree.ts — v5.0 TreeLogic
// Pure tree operations: no React, no DOM, no side effects.

import type { ArchNode, NodeType } from "@/types/architect";

let _counter = 100;

/** Generate a unique node ID */
export function genId(): string { return "n" + ++_counter; }

/** Reset counter (for testing) */
export function resetCounter(v = 100): void { _counter = v; }

/** Create a new node with defaults */
export function createNode(
  parentId: string | null,
  type: NodeType = "argument",
  title = "新节点",
): ArchNode {
  return {
    id: genId(),
    type,
    title,
    parent: parentId,
    children: [],
    order: 0,
    isExpanded: true,
  };
}

// ── Tree navigation ────────────────────────────────────────

/** Get all nodes as a flat map by ID */
export function nodeMap(nodes: ArchNode[]): Map<string, ArchNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

/** Get root nodes (parent === null), sorted by order */
export function getRoots(nodes: ArchNode[]): ArchNode[] {
  return nodes.filter((n) => n.parent === null).sort((a, b) => a.order - b.order);
}

/** Get children of a node, sorted by order */
export function getChildren(node: ArchNode, nodes: ArchNode[]): ArchNode[] {
  const map = nodeMap(nodes);
  return (node.children || [])
    .map((id) => map.get(id)!)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

/** Get parent of a node */
export function getParent(node: ArchNode, nodes: ArchNode[]): ArchNode | undefined {
  if (!node.parent) return undefined;
  return nodes.find((n) => n.id === node.parent);
}

/** Get siblings (same parent, excluding self) */
export function getSiblings(node: ArchNode, nodes: ArchNode[]): ArchNode[] {
  return nodes.filter((n) => n.parent === node.parent && n.id !== node.id)
    .sort((a, b) => a.order - b.order);
}

/** Get node depth (0 = root) */
export function getDepth(node: ArchNode, nodes: ArchNode[]): number {
  let depth = 0;
  let current: ArchNode | undefined = node;
  while (current?.parent) {
    depth++;
    current = nodes.find((n) => n.id === current!.parent);
  }
  return depth;
}

// ── Tree mutations (return new arrays, no side effects) ─────

/** Add a child node after a parent */
export function addChild(
  nodes: ArchNode[],
  parentId: string,
  child: ArchNode,
): ArchNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, child.id] };
    }
    return n;
  }).concat({ ...child, parent: parentId, order: (nodes.filter((x) => x.parent === parentId).length) });
}

/** Add a sibling after a node */
export function addSibling(
  nodes: ArchNode[],
  afterId: string,
  sibling: ArchNode,
): ArchNode[] {
  const after = nodes.find((n) => n.id === afterId);
  if (!after) return nodes;
  const newOrder = after.order + 1;

  // Shift orders of following siblings
  const updated = nodes.map((n) => {
    if (n.parent === after.parent && n.order >= newOrder) {
      return { ...n, order: n.order + 1 };
    }
    return n;
  });

  return updated.concat({
    ...sibling,
    parent: after.parent,
    order: newOrder,
  });
}

/** Delete a node and all its descendants */
export function deleteNode(nodes: ArchNode[], nodeId: string): ArchNode[] {
  const toDelete = new Set<string>();
  const collect = (id: string) => {
    toDelete.add(id);
    const node = nodes.find((n) => n.id === id);
    node?.children.forEach(collect);
  };
  collect(nodeId);

  return nodes
    .filter((n) => !toDelete.has(n.id))
    .map((n) => ({
      ...n,
      children: n.children.filter((cid) => !toDelete.has(cid)),
    }));
}

/** Move a node: change its parent and/or order */
export function moveNode(
  nodes: ArchNode[],
  nodeId: string,
  newParent: string | null,
  newOrder: number,
): ArchNode[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return nodes;

  const oldParent = node.parent;

  return nodes.map((n) => {
    // Update the moved node
    if (n.id === nodeId) {
      return { ...n, parent: newParent, order: newOrder };
    }
    // Remove from old parent's children
    if (n.id === oldParent) {
      return { ...n, children: n.children.filter((cid) => cid !== nodeId) };
    }
    // Add to new parent's children
    if (n.id === newParent) {
      return { ...n, children: [...n.children, nodeId] };
    }
    return n;
  });
}

/** Toggle expanded state */
export function toggleExpand(nodes: ArchNode[], nodeId: string): ArchNode[] {
  return nodes.map((n) =>
    n.id === nodeId ? { ...n, isExpanded: !n.isExpanded } : n,
  );
}

/** Update a node's fields */
export function updateNode(
  nodes: ArchNode[],
  nodeId: string,
  updates: Partial<ArchNode>,
): ArchNode[] {
  return nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));
}

/** Expand all nodes */
export function expandAll(nodes: ArchNode[]): ArchNode[] {
  return nodes.map((n) => ({ ...n, isExpanded: true }));
}

/** Collapse all nodes to a given depth (0 = root only) */
export function collapseToDepth(nodes: ArchNode[], maxDepth: number): ArchNode[] {
  const depthMap = new Map<string, number>();
  const calcDepth = (id: string, d: number) => {
    depthMap.set(id, d);
    const node = nodes.find((n) => n.id === id);
    node?.children.forEach((cid) => calcDepth(cid, d + 1));
  };
  getRoots(nodes).forEach((r) => calcDepth(r.id, 0));

  return nodes.map((n) => ({
    ...n,
    isExpanded: (depthMap.get(n.id) ?? 0) < maxDepth,
  }));
}

// ── Serialization ───────────────────────────────────────────

/** Convert tree to legacy format (with positions + edges) for API compat */
export function toLegacyFormat(nodes: ArchNode[]): {
  nodes: { id: string; type: string; label: string; position: { x: number; y: number }; children: string[] }[];
  edges: { id: string; from: string; to: string; relation: string }[];
} {
  const resultNodes = nodes.map((n, i) => {
    const depth = getDepth(n, nodes);
    const siblings = getSiblings(n, nodes);
    const x = 100 + siblings.findIndex((s) => s.id === n.id) * 200 || 100 + i * 100;
    return {
      id: n.id,
      type: n.type,
      label: n.title,
      position: { x, y: 50 + depth * 110 },
      children: n.children,
    };
  });

  const resultEdges: { id: string; from: string; to: string; relation: string }[] = [];
  let eid = 0;
  for (const n of nodes) {
    for (const cid of n.children) {
      resultEdges.push({
        id: "e" + ++eid,
        from: n.id,
        to: cid,
        relation: "elaborates",
      });
    }
  }

  return { nodes: resultNodes, edges: resultEdges };
}

/** Build tree from flat node array (auto-detect roots by parent field) */
export function buildTree(nodes: ArchNode[]): ArchNode[] {
  // Ensure children arrays match parent references
  const byParent = new Map<string | null, ArchNode[]>();
  for (const n of nodes) {
    const key = n.parent;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }

  return nodes.map((n) => {
    const children = (byParent.get(n.id) || []).map((c) => c.id);
    return { ...n, children };
  });
}
