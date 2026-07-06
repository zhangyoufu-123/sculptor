// lib/ai/intent-analyzer.ts
import type { ContextPackage, IntentAnalysis } from "@/types/editor";

// Chinese genre signal words
const FICTION_SIGNALS = ["她", "他", "说", "走", "看", "想", "感觉", "突然", "仿佛"];
const ESSAY_SIGNALS = ["人生", "岁月", "记忆", "故乡", "或许", "时光"];
const REPORT_SIGNALS = ["数据", "报告", "分析", "研究表明", "据统计", "结论"];
const ARGUMENT_SIGNALS = ["因为", "所以", "因此", "然而", "但是", "由此可见"];

const EMOTION_MAP: Record<string, IntentAnalysis["emotion"]> = {
  "静": "calm", "平静": "calm", "安": "calm",
  "紧张": "tense", "急": "tense", "紧": "tense",
  "悲伤": "melancholy", "忧伤": "melancholy", "泪": "melancholy",
  "激情": "passionate", "热": "passionate", "激烈": "passionate",
};

export function analyzeIntent(
  ctx: ContextPackage,
  explicitIntent?: string
): IntentAnalysis {
  const text = ctx.currentText;

  // Genre detection
  let genre: IntentAnalysis["genre"] = "unknown";
  const fictionScore = FICTION_SIGNALS.filter((s) => text.includes(s)).length;
  const essayScore = ESSAY_SIGNALS.filter((s) => text.includes(s)).length;
  const reportScore = REPORT_SIGNALS.filter((s) => text.includes(s)).length;
  const argumentScore = ARGUMENT_SIGNALS.filter((s) => text.includes(s)).length;

  const scores: [IntentAnalysis["genre"], number][] = [
    ["fiction", fictionScore],
    ["essay", essayScore],
    ["report", reportScore],
    ["prose", argumentScore * 0.5 + essayScore * 0.5],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  genre = scores[0][0];

  // Function detection
  let func: IntentAnalysis["function"] = "rewrite";
  if (explicitIntent === "continue" || explicitIntent === "ghost_continue") {
    func = "continue";
  } else if (text.length < 30 && !text.endsWith("。")) {
    func = "continue";
  } else if (text.includes("为什么") || text.includes("原因")) {
    func = "explain";
  } else if (argumentScore > 2) {
    func = "argue";
  } else if (text.length > 100 && fictionScore > 2) {
    func = "describe";
  }

  // Emotion detection
  let emotion: IntentAnalysis["emotion"] = "neutral";
  for (const [key, val] of Object.entries(EMOTION_MAP)) {
    if (text.includes(key)) {
      emotion = val;
      break;
    }
  }

  // Pace detection
  const sentences = text.split(/[。！？.!?]/).filter((s) => s.trim());
  const avgLength =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
      : 0;
  let pace: IntentAnalysis["pace"] = "medium";
  if (avgLength < 15) pace = "fast";
  else if (avgLength > 40) pace = "slow";

  // Topic words
  const words = text.replace(/[，。！？、；：""''《》\n]/g, " ").split(/\s+/);
  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    if (w.length >= 2) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }
  const topicWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  return { genre, function: func, emotion, pace, topicWords };
}
