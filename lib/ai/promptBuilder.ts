import { buildStyleInstruction } from "./styleEngine";
import { buildIntentInstruction } from "./intentParser";
import type { StyleConfig, Intent } from "@/types/editor";

export function buildPrompt(
  selectedText: string,
  intent: Intent,
  style: StyleConfig,
): string {
  return `You are a writing companion inside a Word-like editor. You never overwrite the user's voice. You only suggest variations the user can choose from.

${buildStyleInstruction(style)}

${buildIntentInstruction(intent)}

Selected text:
"""${selectedText}"""

Provide exactly 3 distinct options. Each option should differ meaningfully in approach or style. They should not be trivial variations of each other.

Respond in JSON format only:
{
  "options": [
    {"text": "...", "style_shift": "more_poetic"},
    {"text": "...", "style_shift": "more_direct"},
    {"text": "...", "style_shift": "more_detailed"}
  ]
}

Rules:
- Options must be meaningfully different from each other
- Each must be valid prose (no markdown, no lists, no bullet points)
- Total length per option: 1-4 sentences
- All options must preserve original meaning`;
}
