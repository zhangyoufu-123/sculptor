// hooks/useGhostText.ts — v6.1 Cursor-style dual-layer ghost text
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { rankGhostCandidates, type GhostCandidate as RankerCandidate } from "@/lib/ai/ghost-ranker";
import { recordAccept, recordReject, shouldUseFastPath, getFeedbackSummary } from "@/lib/style/instant-preference";

const PAUSE_DELAY_MS = 400;
const DRAFT_DELAY_MS = 100; // fast draft delay
const FAST_PAUSE_MS = 200;
const INTENSITY_LABELS: Record<string, string> = {
  "1": "轻续写", "2": "标准续写", "3": "深度重构", "4": "风格实验",
};

export interface GhostCandidate {
  text: string;
  type: "draft" | "precise" | "conservative" | "jump" | "experiment";
}

export function useGhostText(editor: Editor | null, nodeContext?: { title?: string; writingTip?: string; genre?: string }) {
  const [candidates, setCandidates] = useState<GhostCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [intensity, setIntensity] = useState<string>("2");
  const [animState, setAnimState] = useState<"idle" | "accepting" | "dismissing">("idle");

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);

  const clearGhost = useCallback(() => {
    setCandidates([]);
    setActiveIndex(0);
    setAnimState("idle");
  }, []);

  const visible = candidates.length > 0;
  const activeText = candidates[activeIndex]?.text || "";

  // Helper: generate fast draft locally (no API call)
  const generateDraft = useCallback(
    (lastChars: string): GhostCandidate | null => {
      if (!lastChars || lastChars.length < 5) return null;
      
      // Local draft: complete current sentence or add simple continuation
      const lastSentence = lastChars.split(/[。！？]/).pop() || "";
      if (lastSentence.length < 3) return null;

      // Simple pattern: add a contrast or continuation
      const hasContrast = /但是|然而|不过/.test(lastChars);
      if (hasContrast) {
        return { text: "，这并不意味着我们就此放弃。", type: "draft" };
      }

      // Check for incomplete sentence patterns
      if (lastChars.endsWith("是")) {
        return { text: "一个值得深入探讨的问题。", type: "draft" };
      }
      if (lastChars.endsWith("在")) {
        return { text: "于我们如何理解其本质。", type: "draft" };
      }
      if (lastChars.endsWith("的")) {
        return { text: "核心在于实践与反思的循环。", type: "draft" };
      }

      // Default: light continuation
      if (lastChars.length > 20) {
        return { text: "从这个角度来看，这不仅仅是一个表面现象，更值得我们深入思考其背后的逻辑与动因。", type: "draft" };
      }

      return null;
    },
    []
  );

  // ── Main pause detection ────────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (candidates.length > 0) clearGhost();
      if (abortRef.current) abortRef.current.abort();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

      const isFastPath = shouldUseFastPath();
      const mainDelay = isFastPath ? FAST_PAUSE_MS : PAUSE_DELAY_MS;

      // 1. Draft timer: fast local draft at ~100ms
      draftTimerRef.current = setTimeout(() => {
        const docText = editor.getText();
        const lastChars = docText.slice(-300);
        if (!lastChars.trim()) return;

        const draft = generateDraft(lastChars);
        if (draft) {
          setCandidates([draft]);
          setActiveIndex(0);
        }
      }, DRAFT_DELAY_MS);

      // 2. Precise timer: DeepSeek API call at 400ms (or 200ms fast)
      pauseTimerRef.current = setTimeout(async () => {
        const docText = editor.getText();
        const lastChars = docText.slice(-300);
        if (!lastChars.trim()) return;

        const controller = new AbortController();
        abortRef.current = controller;
        loadingRef.current = true;

        try {
          const feedback = getFeedbackSummary();
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: lastChars,
              intent: "ghost_continue",
              intensity: ["light", "normal", "deep", "experiment"][
                parseInt(intensity) - 1
              ],
              feedback,
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
                if (event.type === "ghost_text" && event.text) {
                  rawText = event.text;
                }
              } catch { /* */ }
            }
          }

          if (!rawText) return;

          // 3. Post-processing: rank and filter
          const fullText = editor.getText();
          // Also generate alternative candidates from the raw text
          const rawCandidates: RankerCandidate[] = [
            { text: rawText, type: "precise", score: 0.5, flags: [] },
          ];

          // Generate experiment variant (slightly different)
          if (rawText.length > 30) {
            rawCandidates.push({
              text: rawText.replace(/。/g, "——").replace(/！/g, "。"),
              type: "experiment",
              score: 0.3,
              flags: [],
            });
          }

          const ranked = rankGhostCandidates({
            candidates: rawCandidates,
            currentText: lastChars,
            fullDocument: fullText,
          });

          if (ranked.length > 0) {
            const prevCandidates = candidates.length > 0 ? [candidates[0]] : [];
            const newCandidates: GhostCandidate[] = [
              ...prevCandidates.filter((c) => c.type === "draft"),
              ...ranked.map((r) => ({ text: r.text, type: r.type as GhostCandidate["type"] })),
            ];
            setCandidates(newCandidates.slice(0, 3));
            // If draft was showing, keep it active until precise arrives
            if (prevCandidates.length > 0 && prevCandidates[0].type === "draft") {
              setActiveIndex(1); // switch to first precise
            }
          }
        } catch {
          if (!controller.signal.aborted) clearGhost();
        } finally {
          loadingRef.current = false;
        }
      }, mainDelay);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [editor, intensity, candidates.length, generateDraft, clearGhost]);

  // ── Keyboard: Tab/Shift+Tab/Esc/Ctrl+digit ──────────────
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setIntensity(e.key);
        return;
      }

      if (!visible) return;

      // Shift+Tab: cycle candidates backward
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : candidates.length - 1
        );
        return;
      }

      // Tab: accept current candidate
      if (e.key === "Tab" && activeText) {
        e.preventDefault();
        e.stopPropagation();
        setAnimState("accepting");
        setTimeout(() => {
          editor.chain().focus().insertContent(activeText).run();
          recordAccept(activeText);
          clearGhost();
        }, 150); // brief animation before insert
        return;
      }

      // Esc: reject all
      if (e.key === "Escape") {
        e.preventDefault();
        setAnimState("dismissing");
        if (activeText) recordReject(activeText);
        setTimeout(() => clearGhost(), 150);
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorEl.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, visible, activeText, candidates, clearGhost]);

  return {
    candidates,
    activeIndex,
    activeText,
    visible,
    animState,
    clearGhost,
    isGhostLoading: () => loadingRef.current,
    // Legacy compat
    ghostText: { text: activeText, visible, position: { from: 0, to: 0 } },
  };
}
