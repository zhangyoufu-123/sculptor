import { create } from "zustand";
import type { ArchitectNode, ArchitectEdge, ArchitectScheme, ReviewIssue } from "@/types/architect";

interface ArchitectState {
  // Schemes
  schemes: ArchitectScheme[];
  activeSchemeId: string | null;

  // Current architecture
  nodes: ArchitectNode[];
  edges: ArchitectEdge[];

  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDragging: boolean;
  reviewIssues: ReviewIssue[];
  reviewScore: number | null;

  // Actions
  setNodes: (nodes: ArchitectNode[]) => void;
  setEdges: (edges: ArchitectEdge[]) => void;
  addNode: (node: ArchitectNode) => void;
  updateNode: (id: string, updates: Partial<ArchitectNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: ArchitectEdge) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setDragging: (v: boolean) => void;
  setReview: (issues: ReviewIssue[], score: number) => void;
  addScheme: (scheme: ArchitectScheme) => void;
  setActiveScheme: (id: string) => void;
  switchScheme: (id: string) => void;
  clearArchitecture: () => void;
}

export const useArchitectStore = create<ArchitectState>((set, get) => ({
  schemes: [],
  activeSchemeId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isDragging: false,
  reviewIssues: [],
  reviewScore: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNode: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.from !== id && e.to !== id),
    })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),
  removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  setDragging: (v) => set({ isDragging: v }),
  setReview: (issues, score) => set({ reviewIssues: issues, reviewScore: score }),

  addScheme: (scheme) =>
    set((s) => ({ schemes: [...s.schemes, scheme] })),

  setActiveScheme: (id) =>
    set((s) => {
      const scheme = s.schemes.find((sc) => sc.id === id);
      if (!scheme) return {};
      return {
        activeSchemeId: id,
        nodes: scheme.nodes,
        edges: scheme.edges,
      };
    }),

  switchScheme: (id) => {
    // Save current state to active scheme before switching
    const state = get();
    if (state.activeSchemeId) {
      const updated = state.schemes.map((sc) =>
        sc.id === state.activeSchemeId
          ? { ...sc, nodes: state.nodes, edges: state.edges }
          : sc
      );
      set({ schemes: updated });
    }
    // Switch
    const scheme = state.schemes.find((sc) => sc.id === id);
    if (scheme) {
      set({
        activeSchemeId: id,
        nodes: scheme.nodes,
        edges: scheme.edges,
      });
    }
  },

  clearArchitecture: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      reviewIssues: [],
      reviewScore: null,
    }),
}));
