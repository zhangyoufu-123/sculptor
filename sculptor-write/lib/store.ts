import { create } from "zustand";
import type {
  WritingState,
  StyleConfig,
  SuggestionOption,
} from "@/types/editor";

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

  stylePanelOpen: boolean;
  setStylePanelOpen: (v: boolean) => void;

  style: StyleConfig;
  updateStyle: (partial: Partial<StyleConfig>) => void;
  updateIdentity: (partial: Partial<StyleConfig["identity"]>) => void;
  updateRhythm: (partial: Partial<StyleConfig["rhythm"]>) => void;
  addImagery: (tag: string) => void;
  removeImagery: (tag: string) => void;
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

  stylePanelOpen: false,
  setStylePanelOpen: (v) => set({ stylePanelOpen: v }),

  style: {
    identity: { tone: 50, density: 50 },
    rhythm: { sentenceLength: 50, punctuation: 50 },
    imagery: [],
  },
  updateStyle: (partial) =>
    set((s) => ({ style: { ...s.style, ...partial } })),
  updateIdentity: (partial) =>
    set((s) => ({
      style: {
        ...s.style,
        identity: { ...s.style.identity, ...partial },
      },
    })),
  updateRhythm: (partial) =>
    set((s) => ({
      style: {
        ...s.style,
        rhythm: { ...s.style.rhythm, ...partial },
      },
    })),
  addImagery: (tag) =>
    set((s) => {
      if (s.style.imagery.includes(tag)) return s;
      return {
        style: { ...s.style, imagery: [...s.style.imagery, tag] },
      };
    }),
  removeImagery: (tag) =>
    set((s) => ({
      style: {
        ...s.style,
        imagery: s.style.imagery.filter((t) => t !== tag),
      },
    })),
}));
