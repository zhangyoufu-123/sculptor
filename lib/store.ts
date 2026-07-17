import { create } from "zustand";
import type { WritingState, SuggestionOption } from "@/types/editor";

export interface Profile {
  tone: string;
  avg_sentence_length: number;
  common_imagery: string[];
  formality: string;
  keywords: string[];
}

export const useUIStore = create<{
  writingState: WritingState;
  setWritingState: (s: WritingState) => void;

  selectedText: string;
  setSelectedText: (t: string) => void;
  selectionRect: DOMRect | null;
  setSelectionRect: (r: DOMRect | null) => void;

  suggestions: SuggestionOption[];
  addSuggestion: (opt: SuggestionOption) => void;
  clearSuggestions: () => void;

  styleProfile: Profile | null;
  setStyleProfile: (p: Profile | null) => void;
}>((set) => ({
  writingState: "idle",
  setWritingState: (s) => set({ writingState: s }),

  selectedText: "",
  setSelectedText: (t) => set({ selectedText: t }),
  selectionRect: null,
  setSelectionRect: (r) => set({ selectionRect: r }),

  suggestions: [],
  addSuggestion: (opt) =>
    set((s) => ({ suggestions: [...s.suggestions, opt] })),
  clearSuggestions: () => set({ suggestions: [] }),

  styleProfile: null,
  setStyleProfile: (p) => set({ styleProfile: p }),
}));

// ═══════════════════════════════════════════════════════════════
// Context Store — global thinking context for ContextBar
// ═══════════════════════════════════════════════════════════════

export const useStore = create<{
  proposition: string;
  updateProposition: (t: string) => void;
  assumptions: string[];
  addAssumption: (a: string) => void;
  removeAssumption: (i: number) => void;
  progress: number;
  setProgress: (p: number) => void;
  evidenceCount: number;
  setEvidenceCount: (n: number) => void;
  position: string;
  setPosition: (p: string) => void;
}>((set) => ({
  proposition: "",
  updateProposition: (t) => set({ proposition: t }),
  assumptions: [],
  addAssumption: (a) => set((s) => ({ assumptions: [...s.assumptions, a] })),
  removeAssumption: (i) => set((s) => ({
    assumptions: s.assumptions.filter((_, idx) => idx !== i),
  })),
  progress: 0,
  setProgress: (p) => set({ progress: p }),
  evidenceCount: 0,
  setEvidenceCount: (n) => set({ evidenceCount: n }),
  position: "",
  setPosition: (p) => set({ position: p }),
}));
