// lib/ai/deep-retrieval.ts
import type { ContextPackage, IntentAnalysis, StyleConstraints, RelevantMaterial } from "@/types/editor";

/**
 * Lightweight text-based retrieval (pgvector replacement until v2.2).
 * Searches the current document context for sentences matching retrieval keywords.
 * Returns up to 5 relevant snippets ranked by keyword overlap.
 */
export function deepRetrieve(
  ctx: ContextPackage,
  intent: IntentAnalysis,
  style: StyleConstraints
): RelevantMaterial[] {
  const keywords = style.retrievalKeywords;
  if (keywords.length === 0) return [];

  const sourceText = ctx.surroundingContext || ctx.currentText;
  if (!sourceText || sourceText.length < 20) return [];

  // Split into sentences
  const sentences = sourceText
    .split(/[。！？.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && s.length < 300);

  // Score each sentence by keyword overlap
  const scored: { snippet: string; score: number }[] = [];
  for (const sentence of sentences) {
    let score = 0;
    for (const kw of keywords) {
      if (sentence.includes(kw)) score += 1;
    }
    if (score > 0) {
      scored.push({ snippet: sentence, score });
    }
  }

  // Sort by score descending, take top 5
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((s) => ({
    source: "user_corpus" as const,
    title: "current document",
    snippet: s.snippet,
    relevance: Math.min(s.score / keywords.length, 1),
  }));
}
