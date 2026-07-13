/**
 * Cognitive State Engine — Sculptor's core AI architecture.
 *
 * Replaces the "Question Generator" pattern with a closed-loop
 * diagnostic system:
 *
 *   Input → Diagnose → State → Gaps → Next Question → User → Re-diagnose
 *
 * This is NOT a prompt. It's a state machine + diagnoser + policy engine.
 * The AI doesn't ask until it knows WHERE the user is and WHAT they're missing.
 */

// ── Thinking Stages ───────────────────────────────────────────

export enum ThinkingStage {
  Spark = 0,      // 一个念头 — vague thought
  Topic = 1,      // 一个主题 — has a subject
  Question = 2,   // 真正的问题 — has a real question
  Position = 3,   // 观点 — has a stance
  Evidence = 4,   // 证据 — has support
  Structure = 5,  // 结构 — ready to outline
  Writing = 6,    // 写作 — ready to write
}

export const STAGE_LABELS: Record<ThinkingStage, string> = {
  [ThinkingStage.Spark]: "念头",
  [ThinkingStage.Topic]: "主题",
  [ThinkingStage.Question]: "问题",
  [ThinkingStage.Position]: "观点",
  [ThinkingStage.Evidence]: "证据",
  [ThinkingStage.Structure]: "结构",
  [ThinkingStage.Writing]: "写作",
};

// ── Gap Types ─────────────────────────────────────────────────

export type GapType =
  | "motivation"       // 为什么关心这个
  | "clarity"          // 到底在说什么
  | "boundary"         // 范围是什么
  | "counterexample"   // 反例
  | "specificity"      // 具体例子
  | "perspective"      // 不同角度
  | "position"         // 自己的观点
  | "evidence"         // 证据/数据
  | "structure"        // 组织方式
  | "audience"         // 写给谁看
  | "implication"      // 所以呢
  | "connection";      // 关联

// ── Diagnosis Result ──────────────────────────────────────────

export interface Diagnosis {
  stage: ThinkingStage;
  confidence: number;          // 0-1
  detectedTopic: string | null;
  missing: GapType[];
  shouldGenerateOutline: boolean;
  shouldStopAsking: boolean;
  stageDistribution: Partial<Record<ThinkingStage, number>>; // confidence per stage
}

// ── Stage-specific gap definitions ────────────────────────────

const STAGE_GAPS: Record<ThinkingStage, GapType[]> = {
  [ThinkingStage.Spark]: ["motivation", "clarity", "boundary"],
  [ThinkingStage.Topic]: ["specificity", "perspective", "boundary"],
  [ThinkingStage.Question]: ["position", "counterexample", "specificity"],
  [ThinkingStage.Position]: ["evidence", "counterexample", "implication"],
  [ThinkingStage.Evidence]: ["structure", "connection", "audience"],
  [ThinkingStage.Structure]: ["evidence", "implication"],
  [ThinkingStage.Writing]: [],
};

// ── Gap → Question strategy ───────────────────────────────────

export interface QuestionStrategy {
  gap: GapType;
  generate: (topic: string, context: string) => string;
}

// These are templates that INJECT the user's specific content
export const GAP_QUESTIONS: Record<GapType, (topic: string) => string> = {
  motivation: (t) => `为什么是「${t}」而不是别的话题？这件事情对你个人意味着什么？`,
  clarity: (t) => `如果用一句话定义「${t}」的核心，你觉得是什么？`,
  boundary: (t) => `「${t}」的边界在哪里？什么不算「${t}」？`,
  counterexample: (t) => `有没有一个具体的反例，让「${t}」这个说法站不住脚？`,
  specificity: (t) => `关于「${t}」，能说一个真实的场景而不是抽象描述吗？`,
  perspective: (t) => `如果立场完全相反的人来讨论「${t}」，他们会抓住哪个点反驳？`,
  position: (t) => `关于「${t}」，你有没有一个别人可能不同意的观点？`,
  evidence: (t) => `支持你关于「${t}」的立场，最有力的证据是什么？`,
  structure: (t) => `如果要说服别人接受你对「${t}」的看法，你会按什么顺序讲？`,
  audience: (t) => `你关于「${t}」的内容，最想让谁读到？这会怎么影响你的写法？`,
  implication: (t) => `如果「${t}」的结论成立，它意味着什么？接下来该做什么？`,
  connection: (t) => `「${t}」和你之前讨论过的其他想法，有什么联系？`,
};

// ── Signals for stage detection ───────────────────────────────

interface Signal {
  keywords: string[];
  weight: number;
}

const STAGE_SIGNALS: Record<ThinkingStage, Signal[]> = {
  [ThinkingStage.Spark]: [
    { keywords: ["想写", "不知道", "随便", "看看"], weight: 0.6 },
    { keywords: ["试试", "好像", "可能", "也许"], weight: 0.4 },
  ],
  [ThinkingStage.Topic]: [
    { keywords: ["题目", "主题", "话题", "关于"], weight: 0.7 },
    { keywords: ["写一篇", "想讨论", "关注"], weight: 0.5 },
  ],
  [ThinkingStage.Question]: [
    { keywords: ["为什么", "怎么", "什么是", "如何"], weight: 0.6 },
    { keywords: ["原因", "问题", "根源", "本质"], weight: 0.5 },
    { keywords: ["？", "?"], weight: 0.3 },
  ],
  [ThinkingStage.Position]: [
    { keywords: ["我认为", "我觉得", "在我看来"], weight: 0.8 },
    { keywords: ["但是", "然而", "其实", "真正"], weight: 0.5 },
    { keywords: ["不同意", "反对", "质疑"], weight: 0.6 },
  ],
  [ThinkingStage.Evidence]: [
    { keywords: ["例如", "比如", "数据", "研究"], weight: 0.7 },
    { keywords: ["案例", "实验", "调查", "统计"], weight: 0.6 },
    { keywords: ["根据", "引用", "来源"], weight: 0.5 },
  ],
  [ThinkingStage.Structure]: [
    { keywords: ["首先", "其次", "最后", "第一"], weight: 0.6 },
    { keywords: ["结构", "框架", "大纲", "章节"], weight: 0.7 },
    { keywords: ["分几个部分", "怎么组织"], weight: 0.5 },
  ],
  [ThinkingStage.Writing]: [
    { keywords: ["开始写", "进入写作", "写正文"], weight: 0.8 },
    { keywords: ["生成", "扩写", "润色"], weight: 0.5 },
  ],
};

// ── Thinking item signals for stage advancement ───────────────

function hasThinkingItems(thinking: string[]): boolean {
  return thinking.length > 0;
}

function countAffirmed(thinking: string[]): number {
  return thinking.length;
}

// ── Core Diagnoser ────────────────────────────────────────────

export function diagnose(
  anchor: string,
  thinking: string[],
  ideas: string[],
  roundCount: number
): Diagnosis {
  const text = anchor + " " + thinking.join(" ") + " " + ideas.join(" ");
  const topic = extractTopic(anchor, thinking);

  // Calculate confidence for each stage
  const scores: Partial<Record<ThinkingStage, number>> = {};

  const orderedStages: ThinkingStage[] = [
    ThinkingStage.Spark,
    ThinkingStage.Topic,
    ThinkingStage.Question,
    ThinkingStage.Position,
    ThinkingStage.Evidence,
    ThinkingStage.Structure,
    ThinkingStage.Writing,
  ];

  for (const stage of orderedStages) {
    const signals = STAGE_SIGNALS[stage];
    if (!signals) continue;
    let score = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      for (const kw of signal.keywords) {
        if (text.includes(kw)) {
          score += signal.weight;
          break;
        }
      }
      totalWeight += signal.weight;
    }

    scores[stage] = totalWeight > 0 ? Math.min(1, score / totalWeight) : 0;
  }

  // Baseline: any meaningful input is at least Topic level
  const cleanAnchor = anchor.replace(/[？?，,。.！!\s]+/g, "").trim();
  if (cleanAnchor.length >= 10) {
    scores[ThinkingStage.Topic] = Math.max(scores[ThinkingStage.Topic] || 0, 0.7);
    scores[ThinkingStage.Spark] = Math.min(scores[ThinkingStage.Spark] || 0, 0.3);
  }
  if (anchor.includes("？") || anchor.includes("?")) {
    scores[ThinkingStage.Question] = Math.max(scores[ThinkingStage.Question] || 0, 0.5);
  }

  // Boost stages based on thinking depth
  if (hasThinkingItems(thinking)) {
    scores[ThinkingStage.Question] = Math.max(scores[ThinkingStage.Question] || 0, 0.6);
    scores[ThinkingStage.Spark] = 0; // Can't be Spark if user has written thoughts
  }

  const thoughtCount = countAffirmed(thinking);
  if (thoughtCount >= 3) {
    scores[ThinkingStage.Position] = Math.max(scores[ThinkingStage.Position] || 0, 0.5);
    scores[ThinkingStage.Question] = Math.max(scores[ThinkingStage.Question] || 0, 0.7);
  }

  if (thoughtCount >= 5) {
    scores[ThinkingStage.Evidence] = Math.max(scores[ThinkingStage.Evidence] || 0, 0.4);
    scores[ThinkingStage.Position] = Math.max(scores[ThinkingStage.Position] || 0, 0.6);
  }

  if (ideas.length >= 3) {
    scores[ThinkingStage.Evidence] = Math.max(scores[ThinkingStage.Evidence] || 0, 0.5);
  }

  // Boost structure stage if round count is high
  if (roundCount >= 4) {
    scores[ThinkingStage.Structure] = Math.max(scores[ThinkingStage.Structure] || 0, 0.6);
  }

  // Determine current stage (highest confidence above threshold)
  let bestStage = ThinkingStage.Spark;
  let bestScore = 0;

  // Walk forward through stages — pick highest-score stage
  // Only break if we've seen strong evidence for an earlier stage
  for (const stage of orderedStages) {
    const s = scores[stage] || 0;
    if (s > bestScore) {
      bestScore = s;
      bestStage = stage;
    }
  }

  // Determine gaps based on current stage
  const stageGaps = STAGE_GAPS[bestStage];
  const missing: GapType[] = [];

  for (const gap of stageGaps) {
    // Check if this gap is already filled by thinking items
    if (!isGapFilled(gap, thinking, ideas)) {
      missing.push(gap);
    }
  }

  // Fallback: always have at least one gap
  if (missing.length === 0 && bestStage < ThinkingStage.Writing) {
    const nextStage = orderedStages[orderedStages.indexOf(bestStage) + 1];
    if (nextStage && STAGE_GAPS[nextStage]) {
      missing.push(...STAGE_GAPS[nextStage].slice(0, 2));
    }
  }

  // Decision rules
  const shouldGenerateOutline =
    (scores[ThinkingStage.Structure] || 0) > 0.4 && thoughtCount >= 3;

  const shouldStopAsking =
    roundCount >= 5 ||
    bestStage === ThinkingStage.Writing ||
    (bestStage >= ThinkingStage.Structure && thoughtCount >= 5);

  return {
    stage: bestStage,
    confidence: bestScore,
    detectedTopic: topic,
    missing,
    shouldGenerateOutline,
    shouldStopAsking,
    stageDistribution: scores,
  };
}

// ── Helpers ───────────────────────────────────────────────────

function extractTopic(anchor: string, thinking: string[]): string | null {
  // Extract the most likely topic from anchor or first thinking item
  const source = anchor || thinking[0] || "";
  if (!source) return null;

  // Remove question words and particles
  const cleaned = source
    .replace(/为什么|怎么|什么是|如何|关于|我想|写一篇/g, "")
    .replace(/[？?，,。.！!、\s]+/g, "")
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 20) : null;
}

function isGapFilled(
  gap: GapType,
  thinking: string[],
  ideas: string[]
): boolean {
  const gapSignals: Record<GapType, string[]> = {
    motivation: ["因为", "关心", "重要", "意义", "触动"],
    clarity: ["定义", "核心", "本质", "简单说"],
    boundary: ["不包括", "不是", "边界", "范围"],
    counterexample: ["反例", "例外", "但是", "然而"],
    specificity: ["比如", "例如", "具体", "那次"],
    perspective: ["另一", "相反", "不同", "如果"],
    position: ["我认为", "我觉得", "立场", "观点"],
    evidence: ["数据", "研究", "案例", "证明"],
    structure: ["首先", "结构", "框架", "章节"],
    audience: ["读者", "受众", "写给"],
    implication: ["所以", "因此", "意味着", "结论"],
    connection: ["关联", "联系", "相关", "类似"],
  };

  const signals = gapSignals[gap];
  const combined = [...thinking, ...ideas].join(" ");
  return signals.some((s) => combined.includes(s));
}

// ── Next Best Question Generator ──────────────────────────────

export function generateNextQuestions(
  diagnosis: Diagnosis,
  anchor: string
): string[] {
  const topic = diagnosis.detectedTopic || anchor || "这个话题";

  // If we should stop asking, return a closure question
  if (diagnosis.shouldStopAsking) {
    return [
      "你觉得我们已经找到足够的方向了吗？",
      "在这些思考中，哪个观点最让你感到意外？",
    ];
  }

  // If ready for outline, suggest it
  if (diagnosis.shouldGenerateOutline) {
    return [
      `你的思考已经比较充分了——要试试把这些整理成一个清晰的结构吗？`,
    ];
  }

  // Generate questions from missing gaps
  const questions: string[] = [];
  const gaps = diagnosis.missing.slice(0, 4); // Max 4 questions

  for (const gap of gaps) {
    const generator = GAP_QUESTIONS[gap];
    if (generator) {
      questions.push(generator(topic));
    }
  }

  // Ensure we have at least 2 questions
  if (questions.length < 2) {
    questions.push(GAP_QUESTIONS.specificity(topic));
    questions.push(GAP_QUESTIONS.position(topic));
  }

  return questions.slice(0, 4);
}
