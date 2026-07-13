/**
 * World Model — Sculptor's session state, not chat history.
 *
 * Engineering Constitution §5: Session must have World Model.
 * Engineering Constitution §14: Database saves Thinking Session, not Messages.
 *
 * LLM every round sees the ENTIRE WORLD, not just the last few messages.
 */

import type { ThinkingStage } from "./cognitive-diagnoser";
import type { KnowledgeDomain } from "./knowledge-hub";
import type { Evidence } from "./agents/types";

// ═══════════════════════════════════════════════════════════════
// World Model — the complete cognitive picture of a session
// ═══════════════════════════════════════════════════════════════

export interface WorldModel {
  /** Session identity */
  sessionId: string;
  startedAt: number;

  /** What we're discussing */
  anchor: string;
  topic: string;
  domain: KnowledgeDomain;

  /** Current cognitive state */
  stage: ThinkingStage;
  phase: "warmup" | "understand" | "debate" | "conclude" | "outline";
  roundCount: number;

  /** What the user has said (in their words) */
  userThinking: string[];

  /** What we've discovered together */
  discoveries: string[];        // key realizations
  openQuestions: string[];      // unresolved issues
  deadEnds: string[];           // paths we explored and rejected

  /** Current position */
  currentPosition: string | null;   // what the user currently believes
  confidence: number;               // how confident are we? 0-1

  /** Evidence landscape */
  supportingEvidence: Evidence[];   // evidence FOR the position
  counterEvidence: Evidence[];      // evidence AGAINST the position
  unknowns: string[];               // things we know we don't know

  /** Evolution tracking (§4: every round must change state) */
  stateChanges: StateChange[];

  /** Discipline context */
  disciplineContext: string;     // knowledge framework for this domain
}

export interface StateChange {
  round: number;
  before: string;    // what changed
  after: string;     // what it became
  type: "new_insight" | "position_shift" | "evidence_added" | "question_resolved" | "dead_end";
}

// ═══════════════════════════════════════════════════════════════
// Factory: build initial world from user input
// ═══════════════════════════════════════════════════════════════

export function createWorld(
  anchor: string,
  domain: KnowledgeDomain,
  disciplineContext: string
): WorldModel {
  return {
    sessionId: `session-${Date.now()}`,
    startedAt: Date.now(),

    anchor,
    topic: anchor,
    domain,
    stage: 1, // Topic
    phase: "warmup",
    roundCount: 0,

    userThinking: [],
    discoveries: [],
    openQuestions: [anchor],
    deadEnds: [],

    currentPosition: null,
    confidence: 0,

    supportingEvidence: [],
    counterEvidence: [],
    unknowns: [`"${anchor}" 的具体含义和边界尚未明确`],

    stateChanges: [],
    disciplineContext,
  };
}

// ═══════════════════════════════════════════════════════════════
// Update: evolve the world after each round
// ═══════════════════════════════════════════════════════════════

export function updateWorld(
  world: WorldModel,
  update: {
    userThinking?: string[];
    discoveries?: string[];
    position?: string;
    supportingEvidence?: Evidence[];
    counterEvidence?: Evidence[];
    unknowns?: string[];
    stage?: ThinkingStage;
    phase?: WorldModel["phase"];
    resolvedQuestion?: string;
    deadEnd?: string;
  }
): WorldModel {
  const prevState = summarizeState(world);
  const next = { ...world, roundCount: world.roundCount + 1 };

  // Merge updates
  if (update.userThinking) next.userThinking = [...world.userThinking, ...update.userThinking];
  if (update.discoveries) next.discoveries = [...world.discoveries, ...update.discoveries];
  if (update.position !== undefined) next.currentPosition = update.position;
  if (update.supportingEvidence) {
    next.supportingEvidence = [...world.supportingEvidence, ...update.supportingEvidence];
    // Move evidence from unknown if it was listed there
    next.unknowns = next.unknowns.filter(u =>
      !update.supportingEvidence!.some(e => e.statement.includes(u.slice(0, 10)))
    );
  }
  if (update.counterEvidence) next.counterEvidence = [...world.counterEvidence, ...update.counterEvidence];
  if (update.unknowns) next.unknowns = update.unknowns;
  if (update.stage !== undefined) next.stage = update.stage;
  if (update.phase) next.phase = update.phase;

  // Resolve questions
  if (update.resolvedQuestion) {
    next.openQuestions = next.openQuestions.filter(q => q !== update.resolvedQuestion);
  }
  if (update.deadEnd) {
    next.deadEnds = [...world.deadEnds, update.deadEnd];
  }

  // Track state change (§4: every round must change state)
  const newState = summarizeState(next);
  if (newState !== prevState) {
    next.stateChanges = [...world.stateChanges, {
      round: next.roundCount,
      before: prevState,
      after: newState,
      type: detectChangeType(prevState, newState, update),
    }];
  }

  // Adjust confidence
  if (next.supportingEvidence.length > 0) {
    next.confidence = Math.min(1, next.confidence + 0.1);
  }
  if (next.counterEvidence.length > 0 && next.supportingEvidence.length === 0) {
    next.confidence = Math.max(0, next.confidence - 0.1);
  }

  return next;
}

function summarizeState(w: WorldModel): string {
  return `${w.stage}:${w.phase}:${w.currentPosition || "none"}:${w.supportingEvidence.length}E:${w.counterEvidence.length}C`;
}

function detectChangeType(
  _before: string, _after: string, update: any
): StateChange["type"] {
  if (update.position) return "position_shift";
  if (update.discoveries?.length) return "new_insight";
  if (update.supportingEvidence?.length || update.counterEvidence?.length) return "evidence_added";
  if (update.resolvedQuestion) return "question_resolved";
  if (update.deadEnd) return "dead_end";
  return "new_insight";
}

// ═══════════════════════════════════════════════════════════════
// Render: convert world to LLM context (§6: complete reasoning context)
// ═══════════════════════════════════════════════════════════════

export function worldToLLMContext(world: WorldModel): string {
  const lines: string[] = [];

  lines.push(`## 会话信息`);
  lines.push(`- 锚点: "${world.anchor}"`);
  lines.push(`- 领域: ${world.domain}`);
  lines.push(`- 学科框架: ${world.disciplineContext}`);
  lines.push(`- 第 ${world.roundCount} 轮讨论`);
  lines.push(`- 阶段: ${world.phase}`);

  lines.push(`\n## 用户已有的思考`);
  if (world.userThinking.length === 0) {
    lines.push(`- (尚未展开讨论)`);
  } else {
    for (const t of world.userThinking) {
      lines.push(`- ${t}`);
    }
  }

  lines.push(`\n## 讨论中的发现`);
  if (world.discoveries.length === 0) {
    lines.push(`- (尚未形成明确发现)`);
  } else {
    for (const d of world.discoveries) {
      lines.push(`- ${d}`);
    }
  }

  lines.push(`\n## 当前立场`);
  lines.push(world.currentPosition || "用户尚未明确表达立场");

  lines.push(`\n## 支持性证据 (${world.supportingEvidence.length}条)`);
  for (const e of world.supportingEvidence) {
    lines.push(`- [${e.source}] ${e.statement}`);
  }

  lines.push(`\n## 反方证据 (${world.counterEvidence.length}条)`);
  for (const e of world.counterEvidence) {
    lines.push(`- [${e.source}] ${e.statement}`);
  }

  lines.push(`\n## 尚未解决的问题`);
  if (world.openQuestions.length === 0) {
    lines.push(`- (所有已提出的问题都已讨论)`);
  } else {
    for (const q of world.openQuestions) {
      lines.push(`- ${q}`);
    }
  }

  lines.push(`\n## 已知的未知`);
  for (const u of world.unknowns) {
    lines.push(`- ${u}`);
  }

  lines.push(`\n## 走过的死胡同`);
  if (world.deadEnds.length === 0) {
    lines.push(`- (尚未遇到死胡同)`);
  } else {
    for (const d of world.deadEnds) {
      lines.push(`- ${d}`);
    }
  }

  lines.push(`\n## 认知变化历史 (§4追踪)`);
  if (world.stateChanges.length === 0) {
    lines.push(`- (第一轮，尚无变化)`);
  } else {
    for (const sc of world.stateChanges.slice(-5)) {
      lines.push(`- 第${sc.round}轮: ${sc.before} → ${sc.after} (${sc.type})`);
    }
  }

  return lines.join("\n");
}
