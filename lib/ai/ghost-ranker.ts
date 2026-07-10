// lib/ai/ghost-ranker.ts
// v6.1: Cursor-style post-processing for ghost text candidates
// Dedup detection, style consistency check, structural completeness, ranking

export interface GhostCandidate {
  text: string;
  type: "draft" | "precise" | "conservative" | "jump" | "experiment";
  score: number; // 0-1 ranking score
  flags: string[]; // ["dedup", "style_mismatch", "incomplete", etc.]
}

interface RankInput {
  candidates: GhostCandidate[];
  currentText: string; // last N chars before cursor
  fullDocument: string;
  styleProfile?: {
    avg_sentence_length?: number;
    tone?: string;
    keywords?: string[];
  } | null;
  rejectedPatterns?: string[];
}

// ── Public API ─────────────────────────────────────────────

export function rankGhostCandidates(input: RankInput): GhostCandidate[] {
  const { candidates, currentText, fullDocument, styleProfile, rejectedPatterns } = input;

  return candidates
    .map((c) => ({
      ...c,
      text: truncateToComplete(c.text),
      flags: detectIssues(c.text, currentText, fullDocument, styleProfile, rejectedPatterns),
    }))
    .map((c) => ({
      ...c,
      score: calculateScore(c, currentText, styleProfile),
    }))
    .filter((c) => !c.flags.includes("exact_dup") && !c.flags.includes("nonsense"))
    .sort((a, b) => b.score - a.score);
}

// ── Issue Detection ────────────────────────────────────────

function detectIssues(
  text: string,
  currentText: string,
  fullDocument: string,
  styleProfile?: RankInput["styleProfile"],
  rejectedPatterns?: string[]
): string[] {
  const flags: string[] = [];

  // 1. Exact duplicate detection
  const cleanText = text.replace(/\s+/g, "");
  const cleanDoc = fullDocument.replace(/\s+/g, "");
  if (cleanText.length > 5 && cleanDoc.includes(cleanText)) {
    flags.push("exact_dup");
    return flags; // Don't bother with other checks if it's a dup
  }

  // 2. Near-duplicate (same starting words)
  const first5Words = text.split(/[，。\s]+/).slice(0, 5).join("");
  const lastChars = currentText.slice(-100).replace(/\s+/g, "");
  if (first5Words.length > 5 && lastChars.includes(first5Words.slice(0, 5))) {
    flags.push("near_dup");
  }

  // 3. Style consistency
  if (styleProfile?.avg_sentence_length) {
    const candidateLen = text.replace(/[。！？]/g, "").length;
    const preferred = styleProfile.avg_sentence_length;
    if (candidateLen > preferred * 2.5) flags.push("too_long");
    if (candidateLen < preferred * 0.3 && candidateLen > 0) flags.push("too_short");
  }

  // 4. Rejected pattern matching
  if (rejectedPatterns) {
    for (const pattern of rejectedPatterns) {
      if (text.includes(pattern)) {
        flags.push("rejected_pattern");
        break;
      }
    }
  }

  // 5. Incomplete sentence
  if (!/[。！？\n]$/.test(text.trim()) && text.length > 20) {
    flags.push("incomplete");
  }

  // 6. Nonsense / repetition
  const words = text.split(/[，。\s]+/).filter(Boolean);
  if (words.length >= 4) {
    const unique = new Set(words);
    if (unique.size < words.length * 0.4) {
      flags.push("repetitive");
    }
    if (unique.size < words.length * 0.2) {
      flags.push("nonsense");
    }
  }

  return flags;
}

// ── Scoring ────────────────────────────────────────────────

function calculateScore(
  candidate: GhostCandidate,
  currentText: string,
  styleProfile?: RankInput["styleProfile"]
): number {
  let score = 0.5; // baseline

  // Type-based bias
  if (candidate.type === "conservative") score += 0.15;
  if (candidate.type === "draft") score += 0.05; // draft preferred over nothing
  if (candidate.type === "experiment") score -= 0.05;

  // Penalties for flags
  const penalty = candidate.flags.length * 0.12;
  score -= penalty;

  // Style match bonus
  if (styleProfile?.tone && !candidate.flags.includes("style_mismatch")) {
    score += 0.08;
  }

  // Length appropriateness (50-200 chars for Chinese is good ghost range)
  const len = candidate.text.length;
  if (len >= 50 && len <= 200) score += 0.1;
  if (len > 300) score -= 0.1;

  // Clamp
  return Math.max(0, Math.min(1, score));
}

// ── Sentence Completion ────────────────────────────────────

function truncateToComplete(text: string): string {
  if (!text) return text;
  // Find the last sentence-ending punctuation
  const matches = text.match(/[。！？\n]/g);
  if (!matches) return text; // too short, return as-is

  // Find last complete sentence ending
  const lastIdx = Math.max(
    text.lastIndexOf("。"),
    text.lastIndexOf("！"),
    text.lastIndexOf("？")
  );

  if (lastIdx > 0 && lastIdx < text.length - 1) {
    // There's content after the last period — truncate there
    return text.slice(0, lastIdx + 1);
  }

  // If text doesn't end with punctuation but is reasonable length, keep it
  if (text.length < 150) return text;

  // Long text without closing — find last punctuation
  const lastPunc = Math.max(
    text.lastIndexOf("，"),
    text.lastIndexOf("；")
  );
  return lastPunc > 0 ? text.slice(0, lastPunc + 1) : text.slice(0, 80) + "…";
}
