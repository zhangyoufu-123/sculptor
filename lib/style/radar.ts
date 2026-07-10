// lib/style/radar.ts
// Generates radar chart data for style visualization
// Dimensions: sentence length, imagery novelty, tone restraint, rhetoric density, pace

export interface RadarPoint {
  dimension: string;
  current: number; // 0-100
  baseline: number; // 0-100 (historical average)
}

export interface RadarData {
  points: RadarPoint[];
  summary: string;
}

/**
 * Compute radar data from current text and style profile.
 * Pure computation — no external API calls.
 */
export function computeRadarData(
  currentText: string,
  historicalAvgSentenceLength: number,
  historicalImagery: string[],
  historicalTone: string
): RadarData {
  // Sentence length (normalized 0-100, baseline ~50 = 15 chars)
  const sentences = currentText.split(/[。！？.!?]/).filter((s) => s.trim());
  const currentAvgLen =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
      : 15;
  const sentenceScore = Math.min(100, (currentAvgLen / 30) * 100);
  const baselineSentence = Math.min(100, (historicalAvgSentenceLength / 30) * 100);

  // Imagery novelty (frequency of unique imagery vs historical)
  const imageryWords = ["光", "影", "风", "雨", "夜", "月", "花", "树", "水", "火"];
  let imageryCount = 0;
  for (const w of imageryWords) {
    if (currentText.includes(w)) imageryCount++;
  }
  const imageryScore = Math.min(100, imageryCount * 15);
  const baselineImagery = Math.min(100, historicalImagery.length * 15);

  // Tone restraint (formality proxy — more formal = higher restraint)
  const formalMarkers = ["的", "了", "是", "在", "和", "也", "都"];
  let formalCount = 0;
  for (const m of formalMarkers) {
    const matches = currentText.match(new RegExp(m, "g"));
    if (matches) formalCount += matches.length;
  }
  const restraintScore = Math.min(100, 50 + (formalCount / Math.max(1, currentText.length)) * 500);
  const baselineRestraint = historicalTone === "formal" ? 70 : historicalTone === "casual" ? 30 : 50;

  // Rhetoric density (metaphors, parallel structures)
  const rhetoricMarkers = ["像", "如", "仿佛", "犹如", "如同", "若", "似"];
  let rhetoricCount = 0;
  for (const r of rhetoricMarkers) {
    if (currentText.includes(r)) rhetoricCount++;
  }
  const rhetoricScore = Math.min(100, rhetoricCount * 20);
  const baselineRhetoric = 40; // neutral baseline

  // Pace (sentence count / total length proxy)
  const paceScore = Math.min(100, Math.max(0, 100 - currentAvgLen * 2));
  const baselinePace = Math.min(100, Math.max(0, 100 - historicalAvgSentenceLength * 2));

  return {
    points: [
      { dimension: "句长", current: Math.round(sentenceScore), baseline: Math.round(baselineSentence) },
      { dimension: "意象", current: Math.round(imageryScore), baseline: Math.round(baselineImagery) },
      { dimension: "克制", current: Math.round(restraintScore), baseline: Math.round(baselineRestraint) },
      { dimension: "修辞", current: Math.round(rhetoricScore), baseline: Math.round(baselineRhetoric) },
      { dimension: "节奏", current: Math.round(paceScore), baseline: Math.round(baselinePace) },
    ],
    summary: `句长${Math.round(currentAvgLen)}字${currentAvgLen > historicalAvgSentenceLength * 1.3 ? "（偏长）" : currentAvgLen < historicalAvgSentenceLength * 0.7 ? "（偏短）" : ""}`,
  };
}
