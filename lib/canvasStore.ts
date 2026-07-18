/**
 * Canvas Store — node-discussion mapping for ThinkingMap.
 */

import { create } from "zustand";

export interface DiscussionThread {
  nodeId: string;
  rounds: Array<{
    direction: "confirm" | "challenge" | "branch" | "reconfirm";
    question: string;
    answer: string;
    timestamp: number;
  }>;
  status: "pending" | "confirmed" | "challenged" | "branched";
}

export interface CanvasNode {
  id: string;
  label: string;
  type: "proposition" | "assumption" | "evidence" | "question" | "position";
  x: number;
  y: number;
  confidence: number;
}

export const useCanvasStore = create<{
  nodes: CanvasNode[];
  discussions: Record<string, DiscussionThread>;
  selectedNodeId: string | null;
  contextMenu: { x: number; y: number; nodeId: string } | null;

  addNode: (node: CanvasNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  selectNode: (id: string | null) => void;
  showContextMenu: (x: number, y: number, nodeId: string) => void;
  hideContextMenu: () => void;
  addDiscussionRound: (nodeId: string, round: DiscussionThread["rounds"][0]) => void;
  updateDiscussionStatus: (nodeId: string, status: DiscussionThread["status"]) => void;
}>((set, get) => ({
  nodes: [],
  discussions: {},
  selectedNodeId: null,
  contextMenu: null,

  addNode: (node) =>
    set((s) => ({
      nodes: [...s.nodes, node],
      discussions: {
        ...s.discussions,
        [node.id]: s.discussions[node.id] || {
          nodeId: node.id,
          rounds: [],
          status: "pending",
        },
      },
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
    })),

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  showContextMenu: (x, y, nodeId) => set({ contextMenu: { x, y, nodeId } }),
  hideContextMenu: () => set({ contextMenu: null }),

  addDiscussionRound: (nodeId, round) =>
    set((s) => {
      const d = s.discussions[nodeId];
      if (!d) return s;
      return {
        discussions: {
          ...s.discussions,
          [nodeId]: { ...d, rounds: [...d.rounds, round] },
        },
      };
    }),

  updateDiscussionStatus: (nodeId, status) =>
    set((s) => {
      const d = s.discussions[nodeId];
      if (!d) return s;
      return {
        discussions: {
          ...s.discussions,
          [nodeId]: { ...d, status },
        },
      };
    }),
}));
