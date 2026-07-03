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
