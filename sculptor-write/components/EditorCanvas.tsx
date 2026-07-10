"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { getEditorExtensions } from "@/lib/editor/extensions";
import { useUIStore } from "@/lib/store";
import { useCallback, useEffect, useRef } from "react";
import type { GhostCandidate } from "@/extensions/ai/GhostText";

interface EditorCanvasProps {
  onEditorReady?: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
  onBlankDoubleClick?: () => void;
  ghostCandidates: GhostCandidate[];
  ghostActiveIndex: number;
  isGhostLoading?: () => boolean;
  onGhostAccept?: () => void;
  onGhostReject?: () => void;
}

export default function EditorCanvas({
  onEditorReady,
  onBlankDoubleClick,
  ghostCandidates,
  ghostActiveIndex,
  isGhostLoading,
  onGhostAccept,
  onGhostReject,
}: EditorCanvasProps) {
  const setSelectedText = useUIStore((s) => s.setSelectedText);
  const setSelectionRect = useUIStore((s) => s.setSelectionRect);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const editorRef = useRef<HTMLDivElement>(null);

  const lastClickRef = useRef<{ time: number; pos: number }>({ time: 0, pos: -1 });

  const getCandidates = useCallback(() => ghostCandidates, [ghostCandidates]);
  const getActiveIndex = useCallback(() => ghostActiveIndex, [ghostActiveIndex]);

  const editor = useEditor({
    extensions: getEditorExtensions(getCandidates, getActiveIndex, isGhostLoading),
    editorProps: {
      attributes: {
        class: "prose focus:outline-none max-w-none",
      },
      handleDOMEvents: {
        keydown: () => {
          if (useUIStore.getState().suggestions.length > 0) {
            clearSuggestions();
          }
          return false;
        },
      },
      handleClick: (view, pos, event) => {
        const now = Date.now();
        const prev = lastClickRef.current;
        lastClickRef.current = { time: now, pos };

        // Blank paragraph double-click → trigger intent channel
        if (
          now - prev.time < 400 &&
          pos === prev.pos &&
          onBlankDoubleClick
        ) {
          const node = view.state.doc.nodeAt(pos);
          const isEmpty =
            node && node.textContent.trim() === "";
          if (isEmpty) {
            onBlankDoubleClick();
            return true;
          }
        }
        return false;
      },
    },
  });

  // Track text selection for EchoWall (v6.0 intent channel)
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectedText("");
        setSelectionRect(null);
        setWritingState("idle");
        return;
      }
      const text = editor.state.doc.textBetween(from, to);
      setSelectedText(text);
      const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
      setSelectionRect(
        rect
          ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } as DOMRect
          : { top: 0, left: 0, width: 0, height: 0 } as DOMRect
      );
    };
    editor.on("selectionUpdate", handler);
    return () => { editor.off("selectionUpdate", handler); };
  }, [editor]);

  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  return (
    <div
      ref={editorRef}
      style={{
        padding: "64px 48px",
        minHeight: "80vh",
        caretColor: "var(--gold)",
        fontFamily: "'Source Serif 4', serif",
        fontSize: "18px",
        lineHeight: 1.8,
        color: "var(--text-primary)",
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
