/**
 * Cognitive Engine — Sculptor's foundational architecture.
 *
 * Principle 0: 不要复制 AI 的回答能力，而要复制它的决策过程。
 * Protect Thinking Before Improving Writing.
 *
 * Architecture:
 *   User Input → Understand → Model → Mentor (Decide) → LLM (Express)
 *
 * The LLM is NOT the brain. It's just the voice.
 * The Cognitive Engine makes every decision.
 */

import type { ThinkingStage } from "./cognitive-diagnoser";
import { ThinkingStage as TS } from "./cognitive-diagnoser";
import type { KnowledgeDomain } from "./knowledge-hub";
import { detectDomain } from "./knowledge-hub";
import type { Evidence, KnowledgePlan } from "./agents/types";
import { createPlannerAgent } from "./agents";
import { createRetrieverAgent } from "./agents";
import { createVerifierAgent } from "./agents";
import { createCriticAgent } from "./agents";
import { createProfessorAgent } from "./agents";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface UserInput {
  anchor: string;
  thinking: string[];
  ideas: string[];
  roundCount: number;
}

export interface SessionHistory {
  rounds: { role: "user" | "assistant"; content: string }[];
}

/** Layer 1 output: structured understanding */
export interface Understanding {
  topic: string;           // 真正在讨论什么
  domain: KnowledgeDomain;  // 属于哪个学科
  question: string;         // 核心问题是什么
  framing: string;          // 用户怎么框定问题的
  stage: ThinkingStage;     // 思维阶段
  confidence: number;       // 阶段置信度
}

/** Layer 2 output: problem model */
export interface ProblemModel {
  causes: string[];         // 原因链
  evidence: Evidence[];     // 已有的证据
  gaps: string[];           // 缺失什么
  contradictions: string[]; // 内部矛盾
  shouldChallenge: boolean; // 是否需要挑战观点
}

/** Layer 3 output: mentoring decision */
export interface MentorDecision {
  nextAction: "ask" | "challenge" | "reframe" | "suggest_outline" | "shut_up";
  question: string;         // 如果要问，问什么（可多行）
  reasoning: string;        // 为什么做这个决定
  shouldGenerateOutline: boolean;
  shouldStopAsking: boolean;
}

/** Layer 4 output: reflection */
export interface Reflection {
  changes: string[];        // 观点在会话中的变化
  remainingGaps: string[];  // 仍然缺失什么
  recommendation: string;   // 建议下一步
}

/** Complete engine output */
export interface EngineOutput {
  understanding: Understanding;
  model: ProblemModel;
  decision: MentorDecision;
  reflection?: Reflection;
  evidence: Evidence[];     // 检索到的证据
  verification: {
    confidence: number;
    needsVerification: boolean;
    summary: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// Layer 1: Understanding — 结构化理解
// ═══════════════════════════════════════════════════════════════

function understand(input: UserInput): Understanding {
  const { anchor, thinking } = input;

  // Extract clean topic
  const topic = extractTopic(anchor);

  // Detect domain
  const domain = detectDomain(anchor, thinking);

  // Detect framing — how is the user framing the problem?
  const framing = detectFraming(anchor, thinking);

  // Detect core question
  const question = detectCoreQuestion(anchor, thinking);

  // Stage detection (from existing diagnoser logic)
  const stage = detectStage(input);

  return { topic, domain, question, framing, stage, confidence: computeStageConfidence(input) };
}

/** Extract the clean topic from anchor */
function extractTopic(anchor: string): string {
  return anchor
    .replace(/为什么|怎么|什么是|如何|关于|我想|写一篇/g, "")
    .replace(/[？?，,。.！!、\s]+/g, "")
    .trim()
    .slice(0, 30) || anchor;
}

/** Detect how the user is framing the problem */
function detectFraming(anchor: string, thinking: string[]): string {
  const text = [anchor, ...thinking].join(" ");
  if (text.includes("为什么")) return "因果分析——用户在追问原因";
  if (text.includes("怎么") || text.includes("如何")) return "方法探索——用户在寻求路径";
  if (text.includes("什么是")) return "概念界定——用户在定义边界";
  if (text.includes("但是") || text.includes("然而")) return "辩证思考——用户在有意识地对冲观点";
  if (text.includes("我认为") || text.includes("我觉得")) return "观点表达——用户已有明确立场";
  if (text.includes("例如") || text.includes("比如")) return "案例驱动——用户通过实例理解问题";
  return "开放探索——用户还在框定问题";
}

/** Detect the core question from anchor + thinking */
function detectCoreQuestion(anchor: string, thinking: string[]): string {
  const text = [anchor, ...thinking].join(" ");
  if (text.includes("？") || text.includes("?")) {
    const match = text.match(/[^。！？\n]+[？?]/);
    if (match) return match[0];
  }
  return anchor;
}

// ═══════════════════════════════════════════════════════════════
// Stage Detection (absorbed from cognitive-diagnoser)
// ═══════════════════════════════════════════════════════════════

const STAGE_SIGNALS: Record<ThinkingStage, Array<{ keywords: string[]; weight: number }>> = {
  [TS.Spark]: [
    { keywords: ["想写", "不知道", "随便", "看看"], weight: 0.6 },
    { keywords: ["试试", "好像", "可能", "也许"], weight: 0.4 },
  ],
  [TS.Topic]: [
    { keywords: ["题目", "主题", "话题", "关于"], weight: 0.7 },
    { keywords: ["写一篇", "想讨论", "关注"], weight: 0.5 },
  ],
  [TS.Question]: [
    { keywords: ["为什么", "怎么", "什么是", "如何"], weight: 0.6 },
    { keywords: ["原因", "问题", "根源", "本质"], weight: 0.5 },
    { keywords: ["？", "?"], weight: 0.3 },
  ],
  [TS.Position]: [
    { keywords: ["我认为", "我觉得", "在我看来"], weight: 0.8 },
    { keywords: ["但是", "然而", "其实", "真正"], weight: 0.5 },
  ],
  [TS.Evidence]: [
    { keywords: ["例如", "比如", "数据", "研究"], weight: 0.7 },
    { keywords: ["案例", "实验", "调查", "统计"], weight: 0.6 },
  ],
  [TS.Structure]: [
    { keywords: ["首先", "其次", "最后", "第一"], weight: 0.6 },
    { keywords: ["结构", "框架", "大纲", "章节"], weight: 0.7 },
  ],
  [TS.Writing]: [
    { keywords: ["开始写", "进入写作", "写正文"], weight: 0.8 },
    { keywords: ["生成", "扩写", "润色"], weight: 0.5 },
  ],
};

function detectStage(input: UserInput): ThinkingStage {
  const { anchor, thinking, ideas, roundCount } = input;
  const text = [anchor, ...thinking, ...ideas].join(" ");
  const scores: Partial<Record<ThinkingStage, number>> = {};

  const orderedStages = [TS.Spark, TS.Topic, TS.Question, TS.Position, TS.Evidence, TS.Structure, TS.Writing];

  for (const stage of orderedStages) {
    const signals = STAGE_SIGNALS[stage];
    let score = 0, totalWeight = 0;
    for (const signal of signals) {
      for (const kw of signal.keywords) {
        if (text.includes(kw)) { score += signal.weight; break; }
      }
      totalWeight += signal.weight;
    }
    scores[stage] = totalWeight > 0 ? Math.min(1, score / totalWeight) : 0;
  }

  // Baseline: meaningful input is at least Topic
  const cleanAnchor = anchor.replace(/[？?，,。.！!\s]+/g, "").trim();
  if (cleanAnchor.length >= 10) {
    scores[TS.Topic] = Math.max(scores[TS.Topic] || 0, 0.7);
    scores[TS.Spark] = Math.min(scores[TS.Spark] || 0, 0.3);
  }
  if (anchor.includes("？") || anchor.includes("?")) {
    scores[TS.Question] = Math.max(scores[TS.Question] || 0, 0.5);
  }

  // Thinking depth boosts
  if (thinking.length > 0) {
    scores[TS.Question] = Math.max(scores[TS.Question] || 0, 0.6);
    scores[TS.Spark] = 0;
  }
  if (thinking.length >= 3) {
    scores[TS.Position] = Math.max(scores[TS.Position] || 0, 0.5);
  }
  if (thinking.length >= 5) {
    scores[TS.Evidence] = Math.max(scores[TS.Evidence] || 0, 0.4);
  }
  if (ideas.length >= 3) {
    scores[TS.Evidence] = Math.max(scores[TS.Evidence] || 0, 0.5);
  }
  if (roundCount >= 4) {
    scores[TS.Structure] = Math.max(scores[TS.Structure] || 0, 0.6);
  }

  // Pick highest score
  let best = TS.Spark, bestScore = 0;
  for (const stage of orderedStages) {
    const s = scores[stage] || 0;
    if (s > bestScore) { bestScore = s; best = stage; }
  }
  return best;
}

function computeStageConfidence(input: UserInput): number {
  const stage = detectStage(input);
  const scores: Record<number, number> = {};
  const orderedStages = [TS.Spark, TS.Topic, TS.Question, TS.Position, TS.Evidence, TS.Structure, TS.Writing];
  const text = [input.anchor, ...input.thinking, ...input.ideas].join(" ");

  for (const s of orderedStages) {
    const signals = STAGE_SIGNALS[s];
    let score = 0, totalWeight = 0;
    for (const signal of signals) {
      for (const kw of signal.keywords) {
        if (text.includes(kw)) { score += signal.weight; break; }
      }
      totalWeight += signal.weight;
    }
    scores[s] = totalWeight > 0 ? score / totalWeight : 0;
  }
  return Math.round(scores[stage] * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// Layer 2: Modeling — 建立问题模型
// ═══════════════════════════════════════════════════════════════

function model(input: UserInput, understanding: Understanding, evidence: Evidence[]): ProblemModel {
  const { anchor, thinking, ideas } = input;
  const allText = [anchor, ...thinking, ...ideas].join(" ");

  // Causes: extract causal chains from input
  const causes = extractCauses(allText);

  // Contradictions: detect opposing signals
  const contradictions = detectContradictions(thinking);

  // Gaps: what's missing based on stage
  const gaps = detectGaps(understanding.stage, thinking, ideas);

  // Should challenge? Yes if user has position but weak evidence, or if no counterexamples
  const shouldChallenge = understanding.stage >= TS.Position &&
    (evidence.length < 2 || contradictions.length === 0);

  return {
    causes,
    evidence,
    gaps: gaps.map(g => g),
    contradictions,
    shouldChallenge,
  };
}

function extractCauses(text: string): string[] {
  const causes: string[] = [];
  const patterns = [
    /因为(.{3,30}?)(?:所以|因此|于是|，|。|$)/g,
    /由于(.{3,30}?)(?:所以|因此|，|。|$)/g,
    /原因.{0,4}(.{3,30}?)(?:，|。|$)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && causes.length < 3) {
      const c = match[1].trim();
      if (c.length >= 3 && !causes.includes(c)) causes.push(c);
    }
  }
  if (causes.length === 0) causes.push("用户尚未给出明确的原因分析");
  return causes;
}

function detectContradictions(thinking: string[]): string[] {
  const contradictions: string[] = [];
  const opposites = [
    ["支持", "反对"], ["有利", "不利"], ["优势", "劣势"],
    ["增加", "减少"], ["应该", "不应该"],
  ];

  for (let i = 0; i < thinking.length; i++) {
    for (let j = i + 1; j < thinking.length; j++) {
      for (const [pos, neg] of opposites) {
        if (thinking[i].includes(pos) && thinking[j].includes(neg)) {
          contradictions.push(`"${thinking[i].slice(0, 20)}..." vs "${thinking[j].slice(0, 20)}..."`);
          break;
        }
      }
      if (contradictions.length >= 2) break;
    }
    if (contradictions.length >= 2) break;
  }
  return contradictions;
}

function detectGaps(stage: ThinkingStage, thinking: string[], ideas: string[]): string[] {
  const STAGE_GAPS: Record<ThinkingStage, string[]> = {
    [TS.Spark]: ["动机——为什么关心这个？", "边界——到底在讨论什么范围？"],
    [TS.Topic]: ["具体例子——能举一个真实场景吗？", "不同角度——有没有相反视角？"],
    [TS.Question]: ["自己的观点——你认为答案是什么？", "反例——什么情况下你可能是错的？"],
    [TS.Position]: ["证据——有什么数据或研究支持？", "受众——谁会反对你的观点？"],
    [TS.Evidence]: ["结构——如何组织这些证据最有说服力？"],
    [TS.Structure]: [],
    [TS.Writing]: [],
  };

  const allGaps = STAGE_GAPS[stage] || [];
  const text = [...thinking, ...ideas].join(" ");

  return allGaps.filter(gap => {
    const keyword = gap.split("——")[1]?.slice(0, 4) || gap;
    return !text.includes(keyword);
  });
}

// ═══════════════════════════════════════════════════════════════
// Layer 3: Mentor — 决策引擎
// ═══════════════════════════════════════════════════════════════

function decide(input: UserInput, understanding: Understanding, model: ProblemModel): MentorDecision {
  const { roundCount } = input;
  const { stage } = understanding;

  // Decision matrix
  let nextAction: MentorDecision["nextAction"] = "ask";
  let question = "";
  let reasoning = "";

  if (roundCount >= 5 || stage >= TS.Writing) {
    nextAction = "shut_up";
    question = "你觉得我们已经找到足够的方向了吗？";
    reasoning = "对话已进行多轮，用户已到达高级思维阶段，Mentor 应当退出。";
  } else if (model.shouldChallenge) {
    nextAction = "challenge";
    question = model.contradictions.length > 0
      ? `我注意到你的观点中存在一个张力：${model.contradictions[0]}——你怎么看？`
      : `如果站在完全相反的立场，对方会抓住你论证中的哪个弱点？`;
    reasoning = "用户已有明确观点但证据薄弱或缺少反例，挑战可以帮助深化思考。";
  } else if (stage <= TS.Topic && model.gaps.length > 0) {
    nextAction = "reframe";
    question = generateReframeQuestion(understanding, model);
    reasoning = `用户处于${stage === TS.Spark ? "念头" : "主题"}阶段，需要帮助重新框定问题。`;
  } else if (model.gaps.length > 0) {
    nextAction = "ask";
    question = generateGapQuestion(model.gaps[0], understanding.topic);
    reasoning = `检测到关键缺口：${model.gaps[0]}，应当引导用户填补。`;
  } else {
    nextAction = "suggest_outline";
    question = "你的思考已经比较充分了——要试试把这些整理成一个清晰的结构吗？";
    reasoning = "用户思维已基本完整，可以进入大纲阶段。";
  }

  const shouldGenerateOutline =
    stage >= TS.Evidence && roundCount >= 3;

  const shouldStopAsking = roundCount >= 5 || stage >= TS.Structure;

  return { nextAction, question, reasoning, shouldGenerateOutline, shouldStopAsking };
}

function generateReframeQuestion(u: Understanding, m: ProblemModel): string {
  const { topic, framing } = u;
  if (framing.includes("因果")) return `与其追问「${topic}」的原因，不如先问：这个问题真的成立吗？`;
  if (framing.includes("方法")) return `在讨论「${topic}」的方法之前，先定义一下：成功的标准是什么？`;
  return `关于「${topic}」，有没有一种完全不同的理解方式？`;
}

function generateGapQuestion(gap: string, topic: string): string {
  const GAP_QUESTIONS: Record<string, (t: string) => string> = {
    "动机": (t) => `为什么是「${t}」而不是别的话题？这件事情对你个人意味着什么？`,
    "边界": (t) => `「${t}」的边界在哪里？什么不算「${t}」？`,
    "具体例子": (t) => `关于「${t}」，能说一个真实的场景而不是抽象描述吗？`,
    "不同角度": (t) => `如果立场完全相反的人来讨论「${t}」，他们会说什么？`,
    "自己的观点": (t) => `关于「${t}」，你有没有一个别人可能不同意的观点？`,
    "反例": (t) => `有没有一个具体的反例，让「${t}」这个说法站不住脚？`,
    "证据": (t) => `支持你关于「${t}」的立场，最有力的证据是什么？`,
    "受众": (t) => `你关于「${t}」的内容，最想让谁读到？`,
    "结构": (t) => `如果要说服别人接受你对「${t}」的看法，你会按什么顺序讲？`,
  };

  const key = gap.split("——")[0]?.trim() || "";
  const generator = GAP_QUESTIONS[key];
  return generator ? generator(topic) : `关于「${topic}」，你觉得最重要的是什么？`;
}

// ═══════════════════════════════════════════════════════════════
// Layer 4: Reflection — 会话总结
// ═══════════════════════════════════════════════════════════════

function reflect(input: UserInput, understanding: Understanding, model: ProblemModel): Reflection | undefined {
  if (input.roundCount < 2) return undefined; // Not enough rounds to reflect

  const changes: string[] = [];
  const { thinking } = input;

  // Detect if thinking has evolved
  if (thinking.length >= 2) {
    const first = thinking[0];
    const last = thinking[thinking.length - 1];
    if (first !== last) {
      changes.push(`你的思考从「${first.slice(0, 15)}...」发展到了「${last.slice(0, 15)}...」`);
    }
  }
  if (model.evidence.length >= 3) {
    changes.push("你已经收集了多个来源的证据，思考的深度在增加");
  }
  if (model.contradictions.length > 0) {
    changes.push("你发现了自己思考中的内在矛盾，这是认知深化的标志");
  }

  const recommendation = model.gaps.length === 0
    ? "你的思考已经比较完整，建议开始组织大纲"
    : `建议下一步聚焦：${model.gaps[0]}`;

  return {
    changes: changes.length > 0 ? changes : ["思考仍在发展中"],
    remainingGaps: model.gaps,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════
// The Engine — public API
// ═══════════════════════════════════════════════════════════════

export class CognitiveEngine {
  private planner = createPlannerAgent();
  private retriever = createRetrieverAgent();
  private verifier = createVerifierAgent();
  private critic = createCriticAgent();
  private professor = createProfessorAgent();

  /**
   * Process user input through all four layers.
   * This is the ONLY entry point for the Sculptor AI.
   * The LLM is called only at the very end — for expression, not decision.
   */
  process(input: UserInput): EngineOutput {
    // ── Layer 1: Understand ──
    const understanding = understand(input);

    // ── Layer 2: Model (with evidence retrieval) ──
    const plan = this.planner.createKnowledgePlan(
      input.anchor, input.thinking, understanding.stage
    );
    const retrievalResult = this.retriever.retrieve(plan, {
      anchor: input.anchor,
      thinking: input.thinking,
      ideas: input.ideas,
      stage: understanding.stage,
    });
    const verified = this.verifier.verify(retrievalResult);

    const modelOutput = model(input, understanding, verified.evidence);

    // ── Layer 3: Mentor (decide) ──
    const decision = decide(input, understanding, modelOutput);

    // ── Layer 4: Reflect ──
    const reflectionOutput = reflect(input, understanding, modelOutput);

    // ── Verification summary ──
    const verification = this.buildVerification(verified.evidence);

    return {
      understanding,
      model: modelOutput,
      decision,
      reflection: reflectionOutput,
      evidence: verified.evidence,
      verification,
    };
  }

  private buildVerification(evidence: Evidence[]) {
    const facts = evidence.filter(e => e.isFact).length;
    const inferences = evidence.length - facts;
    const confidence = evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length
      : 0;

    return {
      confidence: Math.round(confidence * 100) / 100,
      needsVerification: facts === 0 && evidence.length > 0,
      summary: `[事实] ${facts} 条 [推理] ${inferences} 条`,
    };
  }
}

// Singleton
let _engine: CognitiveEngine | null = null;

export function getEngine(): CognitiveEngine {
  if (!_engine) _engine = new CognitiveEngine();
  return _engine;
}
