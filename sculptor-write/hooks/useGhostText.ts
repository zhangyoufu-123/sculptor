// hooks/useGhostText.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { GhostTextState } from "@/types/editor";

const PAUSE_DELAY_MS = 400;
const FAST_PAUSE_MS = 200; // fast path when user acceptance rate is high
const INTENSITY_LABELS: Record<string, string> = {
  "1": "轻续写",
  "2": "标准续写",
  "3": "深度重构",
  "4": "风格实验",
};

export function useGhostText(editor: Editor | null) {
  const [ghostText, setGhostText] = useState<GhostTextState>({
    text: "",
    visible: false,
    position: { from: 0, to: 0 },
  });
  const [intensity, setIntensity] = useState<string>("2"); // default: normal

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  // Fast path: track accept/reject to adapt debounce
  const acceptCount = useRef(0);
  const rejectCount = useRef(0);

  const clearGhost = useCallback(() => {
    setGhostText({ text: "", visible: false, position: { from: 0, to: 0 } });
  }, []);

  // Pause detection
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (ghostText.visible) {
        clearGhost();
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }

      // Adaptive debounce: faster when user frequently accepts
      const isFastPath = acceptCount.current > rejectCount.current * 2 && acceptCount.current >= 3;
      const delay = isFastPath ? FAST_PAUSE_MS : PAUSE_DELAY_MS;

      pauseTimerRef.current = setTimeout(async () => {
        const docText = editor.getText();
        const lastChars = docText.slice(-300);
        if (!lastChars.trim()) return;

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
              intensity: ["light", "normal", "deep", "experiment"][
                parseInt(intensity) - 1
              ],
            }),
            signal: controller.signal,
          });

          if (!res.ok) return;

          const reader = res.body?.getReader();
          if (!reader) return;

          const decoder = new TextDecoder();
          let buffer = "";

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
                  const { from } = editor.state.selection;
                  setGhostText({
                    text: event.text,
                    visible: true,
                    position: { from, to: from },
                  });
                }
              } catch {
                // skip malformed SSE events
              }
            }
          }
        } catch {
          if (!controller.signal.aborted) {
            clearGhost();
          }
        } finally {
          loadingRef.current = false;
        }
      }, delay);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [editor, ghostText.visible, clearGhost]);

  // Keyboard: Tab accept, Esc reject, Ctrl+digit switch intensity
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + digit: switch ghost text intensity
      if ((e.ctrlKey || e.metaKey) && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setIntensity(e.key);
        return;
      }

      if (!ghostText.visible) return;

      if (e.key === "Tab" && ghostText.visible) {
        e.preventDefault();
        e.stopPropagation();

        editor.chain().focus().insertContent(ghostText.text).run();
        acceptCount.current++;
        clearGhost();
      }

      if (e.key === "Escape" && ghostText.visible) {
        e.preventDefault();
        rejectCount.current++;
        clearGhost();
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorEl.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, ghostText.visible, ghostText.text, clearGhost]);

  return { ghostText, clearGhost, isGhostLoading: () => loadingRef.current };
}
