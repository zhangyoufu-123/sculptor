"use client";

import { useUIStore } from "@/lib/store";
import type { Intent } from "@/types/editor";

interface AIBubbleProps {
  onIntent: (intent: Intent) => void;
}

export default function AIBubble({ onIntent }: AIBubbleProps) {
  const writingState = useUIStore((s) => s.writingState);
  const selectionRect = useUIStore((s) => s.selectionRect);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);

  if (writingState !== "selected" && writingState !== "bubble_open") {
    return null;
  }

  if (!selectionRect) return null;

  const handleClick = (intent: Intent) => {
    onIntent(intent);
  };

  return (
    <div
      className="ai-bubble"
      style={{
        position: "fixed",
        left: Math.max(8, selectionRect.left - 80),
        top: Math.max(8, selectionRect.top - 48),
      }}
    >
      <button onClick={() => handleClick("rewrite")}>改写</button>
      <button onClick={() => handleClick("continue")}>续写</button>
      <button onClick={() => handleClick("explain")}>解释</button>
    </div>
  );
}
