"use client";

import { useUIStore } from "@/lib/store";
import type { Intent, SuggestionOption } from "@/types/editor";
import { useCallback } from "react";

interface SuggestionPreviewProps {
  editor: any;
  intent: Intent;
  onDone: () => void;
}

export default function SuggestionPreview({
  editor,
  intent,
  onDone,
}: SuggestionPreviewProps) {
  const suggestions = useUIStore((s) => s.suggestions);
  const writingState = useUIStore((s) => s.writingState);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setWritingState = useUIStore((s) => s.setWritingState);

  if (
    suggestions.length === 0 &&
    writingState !== "streaming" &&
    writingState !== "loading"
  )
    return null;

  const handleInsert = useCallback(
    (option: SuggestionOption) => {
      if (!editor) return;
      setWritingState("inserting");

      const { from, to } = editor.state.selection;

      if (intent === "continue") {
        editor
          .chain()
          .focus()
          .insertContentAt(to, " " + option.text)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(option.text)
          .run();
      }

      clearSuggestions();
      setWritingState("idle");
      onDone();
    },
    [editor, intent, clearSuggestions, setWritingState, onDone],
  );

  if (writingState === "loading") {
    return (
      <div className="suggestion-panel">
        <div
          className="suggestion-card"
          style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}
        >
          Thinking...
        </div>
      </div>
    );
  }

  return (
    <div className="suggestion-panel">
      {suggestions.map((opt) => (
        <div key={opt.index} className="suggestion-card">
          <p className="suggestion-text">{opt.text}</p>
          <div className="suggestion-actions">
            <button onClick={() => handleInsert(opt)}>Insert</button>
          </div>
        </div>
      ))}
    </div>
  );
}
