// lib/ai/architect-layout.ts
// Simple dagre-style auto-layout for architecture nodes.
// Respects manual positions when layout_data.manual = true.

import type { ArchitectNode } from "@/types/architect";

const H_SPACING = 200;
const V_SPACING = 100;
const START_X = 300;
const START_Y = 80;

interface LayoutData {
  manual: boolean;
  positions: Record<string, { x: number; y: number }>;
}

/**
 * Compute auto-layout positions based on children hierarchy.
 * Each generation gets a new row; siblings spread horizontally.
 */
export function autoLayout(nodes: ArchitectNode[], layoutData?: LayoutData | null): ArchitectNode[] {
  if (!nodes || nodes.length === 0) return nodes;

  // Build parent map
  const parentMap: Record<string, string | null> = {};
  for (const n of nodes) {
    for (const childId of n.children || []) {
      parentMap[childId] = n.id;
    }
  }

  // Find roots (no parent)
  const roots = nodes.filter(n => !parentMap[n.id]);

  // If layout is manual and positions exist, use those
  if (layoutData?.manual && layoutData.positions) {
    return nodes.map(n => {
      const pos = layoutData.positions[n.id];
      return pos ? { ...n, position: pos } : n;
    });
  }

  // BFS layout: rows by generation
  const visited = new Set<string>();
  const rows: string[][] = [];
  const queue: { id: string; depth: number }[] = roots.map(r => ({ id: r.id, depth: 0 }));

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (!rows[depth]) rows[depth] = [];
    rows[depth].push(id);

    const node = nodes.find(n => n.id === id);
    if (node?.children) {
      for (const childId of node.children) {
        if (!visited.has(childId)) queue.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  // Assign positions
  const updated = [...nodes];
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const totalWidth = (row.length - 1) * H_SPACING;
    const startX = START_X + (rowIdx % 2 === 1 ? 40 : 0); // slight stagger
    for (let col = 0; col < row.length; col++) {
      const node = updated.find(n => n.id === row[col]);
      if (node) {
        node.position = {
          x: startX + col * H_SPACING - totalWidth / 2 + 300,
          y: START_Y + rowIdx * V_SPACING,
        };
      }
    }
  }

  return updated;
}

/**
 * Mark layout as manually adjusted.
 */
export function markManual(layoutData: LayoutData | null, nodeId: string, position: { x: number; y: number }): LayoutData {
  const data = layoutData || { manual: true, positions: {} };
  data.manual = true;
  data.positions[nodeId] = position;
  return data;
}

/**
 * Reset to auto-layout.
 */
export function resetLayout(): LayoutData {
  return { manual: false, positions: {} };
}

/**
 * Check node children count constraints for [+] button.
 */
export function canAddChild(node: ArchitectNode, allNodes: ArchitectNode[], depth = 0): { allowed: boolean; reason?: string } {
  const childCount = (node.children || []).length;

  // Determine depth by checking if this node has a parent
  const hasParent = allNodes.some(n => (n.children || []).includes(node.id));
  const effectiveDepth = hasParent ? depth + 1 : depth;

  if (effectiveDepth >= 3) return { allowed: false, reason: "已达到三级深度，建议精简" };
  if (effectiveDepth === 2 && childCount >= 4) return { allowed: false, reason: "子要点过多，建议精简" };
  if (effectiveDepth === 1 && childCount >= 6) return { allowed: false, reason: "二级节点过多，建议拆分或合并" };

  return { allowed: true };
}
