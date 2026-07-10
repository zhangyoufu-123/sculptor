// hooks/useGhostText.ts — v7.0: cursor-stay + after-punctuation triggers
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { rankGhostCandidates, type GhostCandidate as RankerCandidate } from "@/lib/ai/ghost-ranker";
import { recordAccept, recordReject, shouldUseFastPath, getFeedbackSummary } from "@/lib/style/instant-preference";

const CURSOR_STAY_MS = 800;
const PUNCTUATION_MS = 400;

export interface GhostCandidate {
  text: string;
  type: "draft" | "precise" | "conservative" | "jump" | "experiment";
}

export function useGhostText(editor: Editor | null, nodeContext?: { title?: string; writingTip?: string; genre?: string }) {
  const [candidates, setCandidates] = useState<GhostCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [animState, setAnimState] = useState<"idle" | "accepting" | "dismissing">("idle");

  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const punctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const rejectCountRef = useRef(0);
  const cursorPosRef = useRef(0);

  const clearGhost = useCallback(() => {
    setCandidates([]);
    setActiveIndex(0);
    setAnimState("idle");
  }, []);

  const visible = candidates.length > 0;
  const activeText = candidates[activeIndex]?.text || "";

  // ── fetchGhostText helper ──────────────────────────────
  const fetchGhostText = useCallback(async (docText: string, lastChars: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lastChars,
          intent: "ghost_continue",
          intensity: "normal",
          feedback: getFeedbackSummary(),
          full_document: docText,
          nodeContext: nodeContext || null,
        }),
        signal: controller.signal,
      });

      if (!res.ok) return;
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "ghost_text" && event.text) rawText = event.text;
          } catch { /* */ }
        }
      }

      if (!rawText) return;

      // v7.0: Single candidate by default
      setCandidates([{ text: rawText, type: "precise" }]);
      setActiveIndex(0);
    } catch {
      if (!controller.signal.aborted) clearGhost();
    } finally {
      loadingRef.current = false;
    }
  }, [nodeContext, clearGhost]);

  // ── v7.0 Triggers ──────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (rejectCountRef.current >= 3) return;
      if (candidates.length > 0) clearGhost();
      if (abortRef.current) abortRef.current.abort();
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      if (punctTimerRef.current) clearTimeout(punctTimerRef.current);

      const docText = editor.getText();
      const lastChars = docText.slice(-300);
      if (!lastChars.trim()) return;
      cursorPosRef.current = editor.state.selection.from;

      // Trigger 1: After punctuation → 400ms
      if (/[。！？]/.test(lastChars.slice(-1))) {
        punctTimerRef.current = setTimeout(() => {
          fetchGhostText(docText, lastChars);
        }, PUNCTUATION_MS);
        return;
      }

      // Trigger 2: Cursor stay 800ms
      cursorTimerRef.current = setTimeout(() => {
        if (editor.state.selection.from === cursorPosRef.current) {
          fetchGhostText(docText, lastChars);
        }
      }, CURSOR_STAY_MS);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      if (punctTimerRef.current) clearTimeout(punctTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [editor, fetchGhostText, candidates.length, clearGhost]);

  // ── Keyboard ───────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      // Tab: accept
      if (e.key === "Tab" && activeText && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setAnimState("accepting");
        rejectCountRef.current = 0; // reset reject counter
        setTimeout(() => {
          editor.chain().focus().insertContent(activeText).run();
          recordAccept(activeText);
          clearGhost();
        }, 150);
        return;
      }

      // Esc: reject
      if (e.key === "Escape") {
        e.preventDefault();
        setAnimState("dismissing");
        rejectCountRef.current++;
        if (activeText) recordReject(activeText);
        setTimeout(() => clearGhost(), 150);
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener("keydown", handleKeyDown, true);
    return () => editorEl.removeEventListener("keydown", handleKeyDown, true);
  }, [editor, visible, activeText, clearGhost]);

  return {
    candidates,
    activeIndex,
    activeText,
    visible,
    animState,
    clearGhost,
    isGhostLoading: () => loadingRef.current,
    ghostText: { text: activeText, visible, position: { from: 0, to: 0 } },
  };
}
