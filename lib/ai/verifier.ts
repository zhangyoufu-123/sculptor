// ============================================================
// Sculptor Verification Layer — 验证层
// ============================================================
// Core principle:
// "宁可回答'我无法确定'，也不要编造一个流畅的答案。"
//
// This is NOT a RAG system. It's a verification engine that
// runs AFTER content is generated, BEFORE it's shown to the user.
// ============================================================

// ── Types ───────────────────────────────────────────────────

export interface Statement {
  /** The original text of this statement */
  text: string;
  /** Classification: fact, inference, uncertain, or claim */
  type: "fact" | "inference" | "uncertain" | "claim";
  /** Confidence score 0–1 based on signal strength */
  confidence: number;
  /** Whether this statement should carry a source requirement note */
  requiresSource: boolean;
}

export interface VerifiedResponse {
  /** All extracted and classified statements */
  statements: Statement[];
  /** Count of fact statements */
  factCount: number;
  /** Count of inference statements */
  inferenceCount: number;
  /** Count of uncertain statements */
  uncertainCount: number;
  /** Count of claim statements */
  claimCount: number;
  /** Overall confidence 0–1 (ratio of facts to total, weighted) */
  overallConfidence: number;
  /** True if any fact statements lack source citations */
  needsVerification: boolean;
  /** Human-readable summary (Chinese) */
  summary: string;
}

// ── Signal Word Dictionaries ────────────────────────────────
// All pattern matching is rule-based — no LLM calls needed.

/** Keywords / patterns that mark a statement as verifiable FACT */
const FACT_SIGNALS: RegExp[] = [
  // Dates — any year/month/day pattern
  /\d{4}\s*年/,
  /\d{1,2}\s*月/,
  /\d{1,2}\s*日/,
  // Percentages and ratios
  /\d+(\.\d+)?\s*%/,
  /\d+(\.\d+)?百分比/,
  // Explicit numbers (statistics, counts, measurements)
  /[\d,]+(\.\d+)?\s*(人|元|万|亿|吨|公里|米|克|小时|分钟|天|周|岁|次|倍|件|项|个|条|篇)/,
  // Citations and attributions
  /根据[^\s，。；！？]{2,}/,
  /据[^\s，。；！？]{2,}(报道|统计|调查|研究|显示|指出|称)/,
  /《[^》]+》/,
  /[^\s，。；！？]{2,}(指出|表明|发现|证实|发布|宣布|称|报告)/,
  // Named entities (organizations, people with titles)
  /[^\s，。；！？]{2,}(主席|总统|总理|教授|博士|主任|局长|部长|CEO|创始人|发言人)/,
  // Explicit source markers
  /来源[：:]/,
  /引用[：:]/,
  /资料来源/,
  // Dates in ISO or relative formats
  /\d{4}-\d{2}-\d{2}/,
  /\d{4}\/\d{1,2}\/\d{1,2}/,
];

/** Keywords / patterns that mark reasoning / INFERENCE */
const INFERENCE_SIGNALS: RegExp[] = [
  // Causal reasoning
  /因此/,
  /所以/,
  /由此可见/,
  /从而/,
  /因而/,
  /可见/,
  // Deductive markers
  /意味着/,
  /这说明/,
  /这表示/,
  /这暗示/,
  /表明[了]?/,
  // Inference phrases
  /可以推断/,
  /可以得出/,
  /得出结论/,
  /综上所述/,
  /总之/,
  /总的来说/,
  /归根结底/,
  // Logical connectors that imply reasoning
  /换言之/,
  /也就是说/,
  /换句话说/,
  // Consequence markers
  /其结果是/,
  /导致/,
  /造成/,
  /引起/,
];

/** Keywords / patterns that mark UNCERTAINTY / hedging */
const UNCERTAIN_SIGNALS: RegExp[] = [
  // Core hedging words
  /可能/,
  /或许/,
  /也许/,
  /似乎/,
  /好像/,
  /仿佛/,
  /大概/,
  /大约/,
  /左右/,
  /差不多/,
  // Tentative claims
  /据称/,
  /据说/,
  /据悉/,
  /传言/,
  /谣传/,
  /传闻/,
  /小道消息/,
  // Probability hedging
  /说不定/,
  /不一定/,
  /未必/,
  /难说/,
  // Subjective qualification
  /某种程度[上]?/,
  /一定程度上/,
  /一般[来]?说/,
  /通常[来]?说/,
  /普遍认为/,
  // Unverified sources
  /尚未证实/,
  /未经证实/,
  /有待确认/,
  /未[能得]?确定/,
  /尚无定论/,
  /存疑/,
];

/** Keywords / patterns that mark subjective CLAIMS (opinions) */
const CLAIM_SIGNALS: RegExp[] = [
  // First-person opinion
  /我认为/,
  /我觉得/,
  /依我看/,
  /我个人[认为觉得]/,
  /我坚信/,
  // Superlatives (subjective judgment)
  /最好[的]?/,
  /最差[的]?/,
  /最[优棒强厉害出色]的/,
  /最[烂糟弱差坏]的/,
  /无与伦比/,
  /举世无双/,
  /空前绝后/,
  // Value judgments
  /值得[一]?[做看读听尝试]/,
  /建议[大]?[家]?/,
  /推荐/,
  /强烈[推荐建议]/,
  /必须[要]?/,
  /应该/,
  /应当/,
  /理所应当/,
  // Emotional / aesthetic judgments
  /令人[震惊惊叹感动愤怒失望]/,
  /不可思议/,
  /难以[想象置信理解]/,
  /不得不说/,
  // Absolute claims without evidence
  /绝对是/,
  /毫无疑问/,
  /毋庸置疑/,
  /显然/,
  /明摆着/,
];

// ── Statement Segmentation ──────────────────────────────────

/**
 * Split text into individual statements using Chinese punctuation
 * and natural sentence boundaries.
 */
export function splitStatements(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  // Split on Chinese sentence-ending punctuation and newlines
  // We keep the delimiter attached to its sentence for context
  const raw = text.split(/(?<=[。！？\n])/g);

  return raw
    .map((s) => s.trim())
    .filter((s) => {
      // Drop empty segments
      if (s.length === 0) return false;
      // Drop segments that are only punctuation or whitespace
      if (/^[\s。！？，、；：·…—\-]+$/.test(s)) return false;
      return true;
    });
}

// ── Statement Classification ────────────────────────────────

/**
 * Count how many signal patterns from a given list match the text.
 */
function countMatches(text: string, signals: RegExp[]): number {
  let count = 0;
  for (const pattern of signals) {
    if (pattern.test(text)) count++;
  }
  return count;
}

/**
 * Classify a single statement as fact, inference, uncertain, or claim.
 * Uses a priority-based rule system:
 *   Uncertain takes priority (hedging overrides everything)
 *   Then claims (opinions override facts)
 *   Then facts vs inference determined by signal count
 */
export function classifyStatement(text: string): Statement {
  const trimmed = text.trim();

  // Score each category by signal match count
  const factHits = countMatches(trimmed, FACT_SIGNALS);
  const inferenceHits = countMatches(trimmed, INFERENCE_SIGNALS);
  const uncertainHits = countMatches(trimmed, UNCERTAIN_SIGNALS);
  const claimHits = countMatches(trimmed, CLAIM_SIGNALS);

  // ── Priority-based classification ──

  // 1. Uncertain takes highest priority — if hedging is present,
  //    the statement is inherently unverifiable
  if (uncertainHits > 0) {
    const confidence = Math.max(0.1, 1.0 / (1 + uncertainHits));
    return {
      text: trimmed,
      type: "uncertain",
      confidence,
      requiresSource: true, // uncertain claims need source verification most
    };
  }

  // 2. Claims (opinions) take second priority
  if (claimHits > 0) {
    const confidence = Math.max(0.15, 1.0 / (1 + claimHits));
    return {
      text: trimmed,
      type: "claim",
      confidence,
      requiresSource: false, // opinions don't strictly require sources
    };
  }

  // 3. Fact vs Inference — determined by which has more signal hits
  if (factHits > 0 && factHits >= inferenceHits) {
    const confidence = Math.min(1.0, 0.5 + factHits * 0.15);
    return {
      text: trimmed,
      type: "fact",
      confidence,
      requiresSource: true, // all facts need source verification
    };
  }

  if (inferenceHits > 0) {
    const confidence = Math.min(0.8, 0.3 + inferenceHits * 0.15);
    return {
      text: trimmed,
      type: "inference",
      confidence,
      requiresSource: false, // inferences are logical, not directly sourced
    };
  }

  // 4. Default: no strong signals — treat as low-confidence claim
  //    (most likely a descriptive/neutral statement)
  return {
    text: trimmed,
    type: "claim",
    confidence: 0.4,
    requiresSource: false,
  };
}

// ── Main Verification Pipeline ──────────────────────────────

/**
 * The core verification function.
 * Takes AI-generated text and produces a structured verification
 * result with fact/inference/uncertain/claim breakdown.
 */
export function verifyStatements(text: string): VerifiedResponse {
  const segments = splitStatements(text);
  const statements: Statement[] = segments.map(classifyStatement);

  const factCount = statements.filter((s) => s.type === "fact").length;
  const inferenceCount = statements.filter((s) => s.type === "inference").length;
  const uncertainCount = statements.filter((s) => s.type === "uncertain").length;
  const claimCount = statements.filter((s) => s.type === "claim").length;

  // Needs verification if any fact statements exist (they need sources)
  const needsVerification = factCount > 0;

  // Overall confidence: weighted average, facts contribute most
  const total = statements.length;
  let overallConfidence: number;
  if (total === 0) {
    overallConfidence = 0;
  } else {
    const weightedSum = statements.reduce((sum, s) => {
      // Facts and inferences contribute positively
      // Uncertain and claims drag confidence down
      const weight =
        s.type === "fact"
          ? 1.0
          : s.type === "inference"
            ? 0.6
            : s.type === "claim"
              ? 0.3
              : 0.1; // uncertain
      return sum + s.confidence * weight;
    }, 0);
    const maxPossible = statements.reduce((sum, s) => {
      // Max weight per statement type (same as above but with confidence=1)
      const w =
        s.type === "fact" ? 1.0 : s.type === "inference" ? 0.6 : s.type === "claim" ? 0.3 : 0.1;
      return sum + w;
    }, 0);
    overallConfidence = maxPossible > 0 ? weightedSum / maxPossible : 0;
  }

  // Build human-readable summary
  const parts: string[] = [];
  if (factCount > 0) parts.push(`[事实] ${factCount} 条`);
  if (inferenceCount > 0) parts.push(`[推理] ${inferenceCount} 条`);
  if (uncertainCount > 0) parts.push(`[不确定] ${uncertainCount} 条`);
  if (claimCount > 0) parts.push(`[观点] ${claimCount} 条`);

  const summary =
    parts.length > 0
      ? parts.join("  ") +
        `  |  置信度: ${Math.round(overallConfidence * 100)}%` +
        (needsVerification ? "  ⚠ 需要来源验证" : "")
      : "[空] 无有效陈述";

  return {
    statements,
    factCount,
    inferenceCount,
    uncertainCount,
    claimCount,
    overallConfidence,
    needsVerification,
    summary,
  };
}

// ── Verification Context (Pre-Response Summary) ─────────────

/**
 * Generate a compact pre-response summary showing the fact/inference
 * breakdown. Designed to be shown BEFORE the AI response to set
 * appropriate expectations about reliability.
 *
 * Format:
 *   [事实] 2 条
 *   [推理] 3 条
 *   [不确定] 1 条
 */
export function generateVerificationContext(text: string): string {
  const result = verifyStatements(text);

  const lines: string[] = [];
  if (result.factCount > 0) lines.push(`[事实] ${result.factCount} 条`);
  if (result.inferenceCount > 0) lines.push(`[推理] ${result.inferenceCount} 条`);
  if (result.uncertainCount > 0) lines.push(`[不确定] ${result.uncertainCount} 条`);
  if (result.claimCount > 0) lines.push(`[观点] ${result.claimCount} 条`);

  if (lines.length === 0) return "[空]";

  return lines.join("\n");
}

// ── Strip / Mark Uncertain Claims ───────────────────────────

/**
 * Remove or mark uncertain claims from the output.
 * Adds "[证据不足]" prefix to statements classified as uncertain.
 * Returns the sanitized text.
 */
export function stripUncertainClaims(text: string): string {
  const segments = splitStatements(text);

  const processed = segments.map((seg) => {
    const classification = classifyStatement(seg);
    if (classification.type === "uncertain") {
      return `[证据不足] ${seg}`;
    }
    return seg;
  });

  // Rejoin — preserve original spacing by joining at the split points
  return processed.join("");
}

// ── Source Requirement Annotation ───────────────────────────

/**
 * Annotate the text with source requirements:
 * - Fact statements get a trailing "需要来源验证" note
 * - Inference statements get a trailing "这是推理，不是事实" note
 *
 * Useful for editorial review before publishing.
 */
export function addSourceRequirements(text: string): string {
  const segments = splitStatements(text);

  const annotated = segments.map((seg) => {
    const classification = classifyStatement(seg);
    if (classification.type === "fact") {
      return `${seg} 【需要来源验证】`;
    }
    if (classification.type === "inference") {
      return `${seg} 【这是推理，不是事实】`;
    }
    if (classification.type === "uncertain") {
      return `${seg} 【证据不足，需核实】`;
    }
    // claims and defaults — no annotation
    return seg;
  });

  return annotated.join("");
}

// ── Confidence Scoring ──────────────────────────────────────

/**
 * Return a confidence score 0.0–1.0 for the given text.
 * Higher ratio of facts to uncertain claims = higher confidence.
 *
 * Formula:
 *   confidence = (factCount * 1.0 + inferenceCount * 0.5) /
 *                max(1, total - uncertainCount * 0.5)
 *
 * This penalizes uncertain content while rewarding factual content.
 */
export function getConfidenceScore(text: string): number {
  const result = verifyStatements(text);

  if (result.statements.length === 0) return 0;

  // Weighted scoring: facts full weight, inferences half, claims quarter, uncertain zero
  const score =
    result.factCount * 1.0 +
    result.inferenceCount * 0.6 +
    result.claimCount * 0.2 +
    result.uncertainCount * 0.0;

  const maxScore = result.statements.length * 1.0;

  return maxScore > 0 ? Math.round((score / maxScore) * 100) / 100 : 0;
}

// ── Utility: Quick Classification Check ─────────────────────

/**
 * Quick check: does this text contain any verifiable facts?
 */
export function hasFacts(text: string): boolean {
  const segments = splitStatements(text);
  return segments.some((s) => classifyStatement(s).type === "fact");
}

/**
 * Quick check: does this text contain uncertain / unverified claims?
 */
export function hasUncertainClaims(text: string): boolean {
  const segments = splitStatements(text);
  return segments.some((s) => classifyStatement(s).type === "uncertain");
}

/**
 * Get the dominant type of content in the text.
 * Returns the classification with the highest count.
 */
export function getDominantType(text: string): Statement["type"] {
  const result = verifyStatements(text);
  const counts: Record<Statement["type"], number> = {
    fact: result.factCount,
    inference: result.inferenceCount,
    uncertain: result.uncertainCount,
    claim: result.claimCount,
  };

  let dominant: Statement["type"] = "claim";
  let max = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = type as Statement["type"];
    }
  }

  return dominant;
}

// ── Pipeline: Verify → Annotate → Strip ─────────────────────

/**
 * Convenience pipeline: runs verification, strips uncertain claims,
 * and annotates with source requirements in one pass.
 * Returns both the cleaned text and the verification result.
 */
export function verifyAndClean(text: string): {
  cleanedText: string;
  verification: VerifiedResponse;
} {
  const verification = verifyStatements(text);
  let cleaned = text;

  // Strip uncertain claims if confidence is low
  if (verification.uncertainCount > 0 && verification.overallConfidence < 0.5) {
    cleaned = stripUncertainClaims(cleaned);
  }

  // Add source requirements if there are unverified facts
  if (verification.needsVerification) {
    cleaned = addSourceRequirements(cleaned);
  }

  return { cleanedText: cleaned, verification };
}
