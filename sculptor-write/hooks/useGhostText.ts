// hooks/useGhostText.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { GhostTextState } from "@/types/editor";

const PAUSE_DELAY_MS = 800;

export function useGhostText(editor: Editor | null) {
  const [ghostText, setGhostText] = useState<GhostTextState>({
    text: "",
    visible: false,
    position: { from: 0, to: 0 },
  });

  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

      pauseTimerRef.current = setTimeout(async () => {
        const docText = editor.getText();
        const lastChars = docText.slice(-300);
        if (!lastChars.trim()) return;

        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: lastChars,
              intent: "ghost_continue",
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
        }
      }, PAUSE_DELAY_MS);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [editor, ghostText.visible, clearGhost]);

  // Keyboard: Tab accept, Esc reject
  useEffect(() => {
    if (!editor || !ghostText.visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && ghostText.visible) {
        e.preventDefault();
        e.stopPropagation();

        editor.chain().focus().insertContent(ghostText.text).run();
        clearGhost();
      }

      if (e.key === "Escape" && ghostText.visible) {
        e.preventDefault();
        clearGhost();
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editorEl.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, ghostText.visible, ghostText.text, clearGhost]);

  return { ghostText, clearGhost };
}
