"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { getEditorExtensions } from "@/lib/editor/extensions";
import { useUIStore } from "@/lib/store";
import { useCallback, useEffect, useRef } from "react";

interface EditorCanvasProps {
  onEditorReady?: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
}

export default function EditorCanvas({ onEditorReady }: EditorCanvasProps) {
  const setSelectedText = useUIStore((s) => s.setSelectedText);
  const setSelectionRect = useUIStore((s) => s.setSelectionRect);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: getEditorExtensions(),
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
    <div className="editor-canvas" ref={editorRef}>
      <EditorContent editor={editor} />
    </div>
  );
}
