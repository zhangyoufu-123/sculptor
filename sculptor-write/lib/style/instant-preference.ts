// lib/style/instant-preference.ts
// v6.1: Real-time preference learning from ghost text accept/reject patterns
// Based on Cursor's implicit feedback loop design

interface PreferenceState {
  // Sentence length preferences
  preferredSentenceLength: "short" | "medium" | "long";
  // Tone preferences (adjusted from accept/reject feedback)
  toneBias: Record<string, number>; // e.g. { poetic: -0.3, direct: +0.5 }
  // Structure preferences
  preferredOpeners: string[]; // favored sentence starters
  rejectedPatterns: string[]; // hated sentence patterns
  // Fast-path tracking
  consecutiveAccepts: number;
  consecutiveRejects: number;
  // Style modifiers (instant, session-only)
  activeModifiers: string[]; // e.g. ["concise", "bold"]
}

let currentPrefs: PreferenceState = {
  preferredSentenceLength: "medium",
  toneBias: {},
  preferredOpeners: [],
  rejectedPatterns: [],
  consecutiveAccepts: 0,
  consecutiveRejects: 0,
  activeModifiers: [],
};

// ── Public API ─────────────────────────────────────────────

/** Record a ghost text accept — adjusts fast-path and tone preferences */
export function recordAccept(ghostText: string): void {
  currentPrefs.consecutiveAccepts++;
  currentPrefs.consecutiveRejects = 0;

  // Learn preferred openers
  const firstWord = ghostText.split(/[，。\s]/)[0];
  if (firstWord && firstWord.length >= 2) {
    if (!currentPrefs.preferredOpeners.includes(firstWord)) {
      currentPrefs.preferredOpeners.push(firstWord);
      if (currentPrefs.preferredOpeners.length > 10) {
        currentPrefs.preferredOpeners.shift();
      }
    }
  }

  // Adjust tone bias toward accepted content
  const tones = detectTones(ghostText);
  for (const tone of tones) {
    currentPrefs.toneBias[tone] = (currentPrefs.toneBias[tone] || 0) + 0.1;
  }
}

/** Record a ghost text reject — adjusts fast-path and tone preferences */
export function recordReject(ghostText: string): void {
  currentPrefs.consecutiveRejects++;
  currentPrefs.consecutiveAccepts = 0;

  // Learn rejected patterns
  const words = ghostText.split(/[，。！？\s]+/).filter((w) => w.length >= 3);
  for (const word of words.slice(0, 3)) {
    if (!currentPrefs.rejectedPatterns.includes(word)) {
      currentPrefs.rejectedPatterns.push(word);
      if (currentPrefs.rejectedPatterns.length > 20) {
        currentPrefs.rejectedPatterns.shift();
      }
    }
  }

  // Adjust tone bias away from rejected content
  const tones = detectTones(ghostText);
  for (const tone of tones) {
    currentPrefs.toneBias[tone] = (currentPrefs.toneBias[tone] || 0) - 0.15;
  }
}

/** Check if fast-path debounce should be used (high acceptance rate) */
export function shouldUseFastPath(): boolean {
  return (
    currentPrefs.consecutiveAccepts >= 2 ||
    (currentPrefs.consecutiveAccepts > currentPrefs.consecutiveRejects * 2 &&
      currentPrefs.consecutiveAccepts >= 1)
  );
}

/** Get active style modifiers for prompt injection */
export function getStyleModifiers(): string[] {
  const modifiers: string[] = [];

  // Sentence length pref
  if (currentPrefs.preferredSentenceLength === "short") {
    modifiers.push("用短句");
  } else if (currentPrefs.preferredSentenceLength === "long") {
    modifiers.push("允许长句");
  }

  // Tone biases
  const topTones = Object.entries(currentPrefs.toneBias)
    .filter(([, v]) => v > 0.3)
    .map(([k]) => k);
  if (topTones.length > 0) {
    modifiers.push(`偏向${topTones[0]}风格`);
  }

  // Rejected patterns — inject avoidance
  if (currentPrefs.consecutiveRejects >= 3) {
    const avoidList = currentPrefs.rejectedPatterns.slice(-3).join("、");
    modifiers.push(`避免使用"${avoidList}"这类表达`);
  }

  return modifiers;
}

/** Get feedback summary for prompt injection */
export function getFeedbackSummary(): string {
  const parts: string[] = [];

  if (currentPrefs.preferredOpeners.length > 0) {
    parts.push(
      `常用开头: ${currentPrefs.preferredOpeners.slice(-5).join("、")}`
    );
  }

  if (currentPrefs.consecutiveAccepts >= 3) {
    parts.push("用户连续采纳，保持当前风格");
  }

  if (currentPrefs.consecutiveRejects >= 3) {
    parts.push("用户连续拒绝，请尝试不同的表达方向");
  }

  return parts.length > 0 ? parts.join("；") : "";
}

/** Reset session preferences (called on new document) */
export function resetPreferences(): void {
  currentPrefs = {
    preferredSentenceLength: "medium",
    toneBias: {},
    preferredOpeners: [],
    rejectedPatterns: [],
    consecutiveAccepts: 0,
    consecutiveRejects: 0,
    activeModifiers: [],
  };
}

// ── Internal ───────────────────────────────────────────────

function detectTones(text: string): string[] {
  const tones: string[] = [];
  if (/或许|也许|大概|可能/.test(text)) tones.push("探索");
  if (/必须|一定|显然|无疑|当然/.test(text)) tones.push("坚定");
  if (/但是|然而|不过|却|虽然/.test(text)) tones.push("辩证");
  if (/优美|绚丽|璀璨|静谧|温柔/.test(text)) tones.push("诗意");
  if (/直接|简单|明确|具体/.test(text)) tones.push("直接");
  if (tones.length === 0) tones.push("平实");
  return tones;
}
