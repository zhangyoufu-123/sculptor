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
import { ThinkingStage as TS, STAGE_LABELS } from "./cognitive-diagnoser";
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
  const allText = [...thinking, ...ideas].join(" ");
  return allGaps.filter(gap => {
    const keyword = gap.split("——")[1]?.slice(0, 4) || gap;
    return !allText.includes(keyword);
  });
}

/** Layer 3 output: mentoring decision */
export interface MentorDecision {
  nextAction: "restate" | "respond" | "challenge" | "ask" | "reframe" | "suggest_outline" | "shut_up";
  /** LRRCQ: Restate — AI paraphrases user's point to confirm understanding */
  restate: string;
  /** LRRCQ: Respond — AI's own analysis, not just another question */
  respond: string;
  /** LRRCQ: Challenge — a specific counterpoint or deeper question */
  challenge: string;
  /** LRRCQ: Question — the next step to move forward */
  question: string;
  /** Why this decision was made */
  reasoning: string;
  /** Progress summary: how far the discussion has come */
  progress: string;
  /** Phase rhythm: warmup | understand | debate | conclude | outline */
  phase: "warmup" | "understand" | "debate" | "conclude" | "outline";
  shouldGenerateOutline: boolean;
  shouldStopAsking: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Layer 3: Mentor — LRRCQ Decision Engine
// ═══════════════════════════════════════════════════════════════
//
// LRRCQ Loop: Listen → Restate → Respond → Challenge → Question
//
// AI 不是一个中立的提问者。它是一个有立场、会倾听、敢反驳、
// 懂得适时闭嘴的导师。每一轮回复必须包含三要素：
//   ① 回应（Restate/Respond）— 确认理解，不是直接提问
//   ② 推进（Progress）— 告诉用户讨论在前进
//   ③ 下一步（Question）— 不是无限聊天

function decide(input: UserInput, understanding: Understanding, model: ProblemModel): MentorDecision {
  const { roundCount, thinking } = input;
  const { stage, topic, framing } = understanding;

  // ── Phase rhythm: warming up → understanding → debating → concluding ──
  const phase = determinePhase(roundCount, stage, thinking.length);

  // ── Build LRRCQ elements ──
  const lastUserPoint = thinking.length > 0 ? thinking[thinking.length - 1] : topic;
  const restate = generateRestate(lastUserPoint, topic, understanding);
  const respond = generateRespond(phase, understanding, model, lastUserPoint);
  const challenge = generateChallenge(phase, understanding, model);
  const question = determineNextQuestion(phase, understanding, model);
  const progress = generateProgress(phase, thinking.length, model);

  // ── Action decisions ──
  let nextAction: MentorDecision["nextAction"];
  if (roundCount >= 5 || stage >= TS.Structure) {
    nextAction = "shut_up";
  } else if (phase === "debate" && model.shouldChallenge) {
    nextAction = "challenge";
  } else if (phase === "warmup" || phase === "understand") {
    nextAction = "restate";
  } else if (phase === "conclude") {
    nextAction = "suggest_outline";
  } else {
    nextAction = "ask";
  }

  const shouldGenerateOutline = phase === "conclude" || phase === "outline";
  const shouldStopAsking = phase === "outline" || roundCount >= 5;

  const reasoning = `阶段=${phase}, 思维=${STAGE_LABELS[stage]}, 已确认=${thinking.length}条, 证据=${model.evidence.length}条`;

  return {
    nextAction, restate, respond, challenge, question,
    reasoning, progress, phase,
    shouldGenerateOutline, shouldStopAsking,
  };
}

/** Determine the discussion phase based on round count and depth */
function determinePhase(roundCount: number, stage: ThinkingStage, thinkingCount: number): MentorDecision["phase"] {
  if (roundCount === 0) return "warmup";
  if (roundCount === 1 && thinkingCount < 2) return "understand";
  if (roundCount >= 2 && roundCount <= 3 && thinkingCount >= 2) return "debate";
  if (roundCount >= 4 || thinkingCount >= 4) return "conclude";
  if (stage >= TS.Structure) return "outline";
  return "understand";
}

/** LRRCQ — Restate: paraphrase user's point to confirm understanding */
function generateRestate(lastPoint: string, topic: string, u: Understanding): string {
  if (!lastPoint || lastPoint === topic) {
    return `我理解你想讨论「${topic}」。让我确认一下——你关心的核心是${u.framing.includes("因果") ? "为什么会出现这种情况" : u.framing.includes("方法") ? "如何应对或解决" : "这个现象的本质是什么"}，对吗？`;
  }
  const snippet = lastPoint.length > 30 ? lastPoint.slice(0, 30) + "…" : lastPoint;
  return `我确认一下我的理解：你不是在说表面现象，而是在说「${snippet}」——我理解得对吗？`;
}

/** LRRCQ — Respond: AI's own analysis, referencing user's specific input */
function generateRespond(phase: MentorDecision["phase"], u: Understanding, m: ProblemModel, lastPoint: string): string {
  const snippet = lastPoint.length > 20 ? `「${lastPoint.slice(0, 20)}…」` : `「${lastPoint}」`;

  if (phase === "warmup") {
    return `你提到${snippet}——这个切入点选得很好，${u.topic}确实是一个被讨论很多但很少有人真正深入的问题。`;
  }
  if (m.evidence.length >= 3) {
    const names = m.evidence.slice(0, 2).map(e => e.source).join("和");
    return `根据${names}的信息，你关于${snippet}的判断有数据支撑。但我注意到这些来源都聚焦在同一个角度——也许我们需要看看完全相反的立场。`;
  }
  if (m.evidence.length >= 1) {
    return `你提到${snippet}，这和${m.evidence[0].source}中的观察一致。但仅仅找到共鸣还不够——我们需要追问：这个现象是暂时的还是结构性的？`;
  }
  if (m.causes.length >= 2) {
    return `你把原因归于${m.causes[0]}和${m.causes[1] || "其他因素"}——这个分析框架有道理。但我想追问：这两个原因之间是什么关系？是并列的，还是有一个更深层的共同根源？`;
  }
  return `关于${snippet}，你的直觉可能是对的。但直觉需要被检验——我们可以一起试着从反面来推敲一下。`;
}

/** LRRCQ — Challenge: specific counterpoint drawn from evidence */
function generateChallenge(phase: MentorDecision["phase"], u: Understanding, m: ProblemModel): string {
  if (m.contradictions.length > 0) {
    return `等等，我发现了一个矛盾：${m.contradictions[0]}。如果这两个观察都是对的，那我们必须重新审视前面的推论。`;
  }
  // Pick a concrete evidence item to challenge with
  if (m.evidence.length >= 2 && phase === "debate") {
    const item = m.evidence[1]; // second evidence item as counterpoint
    return `不过，${item.source}提供了一个不同的视角：${item.statement.slice(0, 40)}…——如果这个是对的，你的结论需要怎么调整？`;
  }
  if (m.evidence.length < 2 && phase !== "warmup") {
    return `坦白说，目前我们掌握的论据还不够。在没有足够证据的情况下，我暂时不能完全同意你的推论——你能给我一个具体的反例来检验吗？`;
  }
  if (phase === "debate") {
    return `我有一点不同意见：你的论证建立在"${u.topic}"这个前提上，但如果这个前提本身就有问题呢？`;
  }
  return "";
}

/** LRRCQ — Question: the next step, not another generic question */
function determineNextQuestion(phase: MentorDecision["phase"], u: Understanding, m: ProblemModel): string {
  if (phase === "warmup") {
    return `在深入之前，我想先问：关于「${u.topic}」，你最想弄清楚的一个问题是什么？`;
  }
  if (phase === "understand") {
    return `能给我一个具体的场景吗？不是抽象描述，而是你亲身经历过或观察到的真实例子。`;
  }
  if (phase === "debate") {
    if (m.gaps.length > 0) {
      return `既然我们有了不同视角，下一步：${m.gaps[0].split("——")[1] || m.gaps[0]}？`;
    }
    return `如果让你在刚才的讨论中选择一个最值得深挖的方向，你会选什么？`;
  }
  if (phase === "conclude") {
    return "我们已经讨论得比较充分了。要试试把这些整理成一个清晰的结构吗？";
  }
  return "你觉得我们已经找到足够的方向了吗？";
}

/** Progress: summary of how far the discussion has come */
function generateProgress(phase: MentorDecision["phase"], thinkingCount: number, m: ProblemModel): string {
  const parts: string[] = [];
  if (thinkingCount >= 3) parts.push(`已形成${thinkingCount}个讨论方向`);
  if (m.evidence.length >= 2) parts.push(`${m.evidence.length}条参考来源`);
  if (m.contradictions.length > 0) parts.push("发现了值得深挖的矛盾");
  if (phase === "conclude") parts.push("讨论接近成熟，可以整理结构");

  if (parts.length === 0) {
    return phase === "warmup" ? "讨论刚刚开始" : "讨论正在深入";
  }
  return parts.join(" · ");
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
