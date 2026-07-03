import type { Intent } from "@/types/editor";

export function buildIntentInstruction(intent: Intent): string {
  switch (intent) {
    case "rewrite":
      return "Rewrite the selected text to match the specified style. Keep the same meaning, facts, and key details.";
    case "continue":
      return "Continue writing from the selected position. Match the style, tone, and rhythm of the surrounding text. Write 2-4 sentences.";
    case "explain":
      return "Explain the selected text in simpler, clearer terms. Keep it concise and accessible. Do not add new information beyond what the text contains.";
  }
}
