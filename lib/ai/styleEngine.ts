import type { StyleConfig } from "@/types/editor";

function toneLabel(value: number): string {
  if (value < 15) return "very formal, academic, precise";
  if (value < 35) return "somewhat formal, professional";
  if (value < 65) return "balanced, neutral, natural";
  if (value < 85) return "conversational, warm";
  return "casual, friendly, direct";
}

function densityLabel(value: number): string {
  if (value < 20) return "ultra-concise, every word carries weight";
  if (value < 40) return "concise, lean prose";
  if (value < 60) return "balanced detail";
  if (value < 80) return "descriptive, expansive";
  return "rich, elaborate, fully detailed";
}

function sentenceLabel(value: number): string {
  if (value < 20) return "very short, punchy sentences for impact";
  if (value < 40) return "short to medium sentences";
  if (value < 60) return "mixed sentence lengths for natural rhythm";
  if (value < 80) return "longer flowing sentences";
  return "long, complex sentences with clauses";
}

function punctuationLabel(value: number): string {
  if (value < 20) return "minimal punctuation, stream-of-consciousness feel";
  if (value < 40) return "light punctuation, smooth flow";
  if (value < 60) return "standard punctuation";
  if (value < 80) return "deliberate punctuation for emphasis";
  return "heavy punctuation, dramatic pauses";
}

export function buildStyleInstruction(style: StyleConfig): string {
  return `Writing style requirements:
- Tone: ${toneLabel(style.identity.tone)}
- Density: ${densityLabel(style.identity.density)}
- Sentence rhythm: prefer ${sentenceLabel(style.rhythm.sentenceLength)}
- Punctuation: ${punctuationLabel(style.rhythm.punctuation)}
${style.imagery.length > 0 ? `- Imagery vocabulary: ${style.imagery.join(", ")}` : ""}
- Never use markdown, bullet points, or lists.
- Output plain paragraphs only.`;
}
