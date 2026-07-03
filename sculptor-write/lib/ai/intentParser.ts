import type { Intent } from "@/types/editor";

export function buildIntentInstruction(intent: Intent): string {
  switch (intent) {
    case "rewrite":
      return "Rewrite the selected text to match the specified style. Keep the same meaning, facts, and key details.";
    case "continue":
      return "Continue writing from the selected position. Match the style, tone, and rhythm of the surrounding text. Write 2-4 sentences.";
    case "explain":
      return "Explain the selected text in simpler, clearer terms. Keep it concise and accessible.";
    case "shorter":
      return "Make this text more concise. Cut word count by ~30% while preserving meaning. Remove redundant words and tighten the prose.";
    case "longer":
      return "Expand this text with more detail and depth. Add context, examples, or sensory details. Make it richer without being verbose.";
    case "more_formal":
      return "Rewrite in a more formal, professional tone. Use precise vocabulary. Avoid contractions and colloquialisms.";
    case "more_casual":
      return "Rewrite in a more casual, conversational tone. Use everyday language and contractions. Make it feel relaxed and approachable.";
    case "translate_en":
      return "Translate the selected text to English. Preserve tone and nuance. If already in English, improve clarity and naturalness.";
  }
}
