// lib/ai/prompts/command-palette.ts

export const INTENT_PROMPTS: Record<string, string> = {
  rewrite:
    "Rewrite the selected text to match the specified style. Keep the same meaning, facts, and key details.",
  continue:
    "Continue writing from the selected position. Match the style, tone, and rhythm of the surrounding text. Write 2-4 sentences.",
  explain:
    "Explain the selected text in simpler, clearer terms. Keep it concise and accessible.",
  shorter:
    "Make this text more concise. Cut word count by ~30% while preserving meaning. Remove redundant words and tighten the prose.",
  longer:
    "Expand this text with more detail and depth. Add context, examples, or sensory details. Make it richer without being verbose.",
  more_formal:
    "Rewrite in a more formal, professional tone. Use precise vocabulary. Avoid contractions and colloquialisms. Elevate the register.",
  more_casual:
    "Rewrite in a more casual, conversational tone. Use everyday language and contractions. Make it feel relaxed and approachable.",
  translate_en:
    "Translate the selected text to English. Preserve tone and nuance. If already in English, improve clarity and naturalness.",
  custom:
    "The user has provided a custom instruction. Follow it precisely while working with the selected text. Match the surrounding style and tone.",
};

export function getIntentPrompt(intent: string): string {
  return INTENT_PROMPTS[intent] || INTENT_PROMPTS.rewrite;
}
