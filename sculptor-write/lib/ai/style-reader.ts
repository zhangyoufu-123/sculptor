// lib/ai/style-reader.ts
import type { ContextPackage, IntentAnalysis, StyleConstraints } from "@/types/editor";

export function readStyle(
  ctx: ContextPackage,
  intent: IntentAnalysis
): StyleConstraints {
  const profile = ctx.styleProfile;
  const text = ctx.currentText;

  // Current text analysis
  const sentences = text.split(/[。！？.!?]/).filter((s) => s.trim());
  const currentAvgLength =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
      : 0;

  // Style constraints from profile
  const avgSentenceLength = profile?.avg_sentence_length || 15;
  const activeImagery = profile?.common_imagery || [];
  const toneProfile = profile?.tone || "neutral";
  const formality = profile?.formality ? String(profile.formality) : "5";

  // Observations (style shift detection)
  const observations: string[] = [];
  if (profile && currentAvgLength > 0) {
    const ratio = currentAvgLength / avgSentenceLength;
    if (ratio > 1.5) {
      observations.push(
        `句式明显变长（当前${Math.round(currentAvgLength)}字/句 vs 历史${avgSentenceLength}字/句），是否考虑回到简洁风格`
      );
    } else if (ratio < 0.6) {
      observations.push(
        `句式明显变短（当前${Math.round(currentAvgLength)}字/句），节奏加快中`
      );
    }
  }

  // Retrieval keywords (for deep retrieval in v2.2)
  const retrievalKeywords: string[] = [
    ...intent.topicWords,
    ...activeImagery.slice(0, 3),
  ];

  if (intent.emotion === "melancholy") {
    retrievalKeywords.push("忧伤", "寂静", "黄昏", "落叶");
  } else if (intent.emotion === "passionate") {
    retrievalKeywords.push("热烈", "燃烧", "光芒", "爆发");
  }

  return {
    avgSentenceLength,
    activeImagery,
    toneProfile,
    formality,
    observations,
    retrievalKeywords: Array.from(new Set(retrievalKeywords)),
  };
}
