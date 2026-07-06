"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { getEditorExtensions } from "@/lib/editor/extensions";
import { useUIStore } from "@/lib/store";
import { useCallback, useEffect, useRef } from "react";

interface EditorCanvasProps {
  onEditorReady?: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
  onBlankDoubleClick?: () => void;
  ghostText: string;
  onGhostAccept?: () => void;
  onGhostReject?: () => void;
}

export default function EditorCanvas({
  onEditorReady,
  onBlankDoubleClick,
  ghostText,
  onGhostAccept,
  onGhostReject,
}: EditorCanvasProps) {
  const setSelectedText = useUIStore((s) => s.setSelectedText);
  const setSelectionRect = useUIStore((s) => s.setSelectionRect);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const editorRef = useRef<HTMLDivElement>(null);

  // Track last click for double-click detection on blank paragraphs
  const lastClickRef = useRef<{ time: number; pos: number }>({ time: 0, pos: -1 });

  const getGhostText = useCallback(() => ghostText || null, [ghostText]);

  const editor = useEditor({
    extensions: getEditorExtensions(getGhostText),
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
        if (!onBlankDoubleClick) return false;

        const node = view.state.doc.nodeAt(pos);
        // Check if this is an empty paragraph (no content or only whitespace)
        if (
          node &&
          node.type.name === "paragraph" &&
          node.textContent.trim() === "" &&
          !node.childCount
        ) {
          const now = Date.now();
          if (
            now - lastClickRef.current.time < 400 &&
            lastClickRef.current.pos === pos
          ) {
            // Double-click on empty paragraph detected
            lastClickRef.current = { time: 0, pos: -1 };
            onBlankDoubleClick();
            return true;
          }
          lastClickRef.current = { time: now, pos };
        }
        return false;
      },
      handleDoubleClick: () => {
        // Let handleClick detect double-clicks on blanks
        return false;
      },
    },
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
    },
  });

  const handleSelectionChange = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setWritingState("idle");
      setSelectedText("");
      setSelectionRect(null);
      return;
    }
    const text = editor.state.doc.textBetween(from, to);
    if (text.length === 0) {
      setWritingState("idle");
      return;
    }
    setSelectedText(text);
    setWritingState("selected");

    try {
      const start = editor.view.coordsAtPos(from);
      setSelectionRect({
        left: start.left,
        top: start.top,
        right: start.right,
        bottom: start.bottom,
        width: start.right - start.left,
        height: start.bottom - start.top,
        x: start.left,
        y: start.top,
      } as DOMRect);
    } catch {
      // coordsAtPos may throw during rapid edits
    }
  }, [editor, setSelectedText, setSelectionRect, setWritingState]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", handleSelectionChange);
    return () => {
      editor.off("selectionUpdate", handleSelectionChange);
    };
  }, [editor, handleSelectionChange]);

  return (
    <div
      className="editor-canvas"
      ref={editorRef}
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
        minHeight: "calc(100vh - 56px)",
        background: "transparent",
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
