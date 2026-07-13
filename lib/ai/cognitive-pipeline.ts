/**
 * Cognitive Pipeline — three-stage cognitive loop.
 *
 * Constitution v2: Input → Understand → Reason → Dialogue → Reply.
 * No stage can be skipped or merged.
 *
 * Stage 1 (Understand): Build mental model — NO user output.
 * Stage 2 (Reason): Form hypotheses — NO user output.
 * Stage 3 (Dialogue): Talk to user — ONLY stage that produces output.
 */

import { ground, type GroundedMeaning } from "./semantic-grounding";
import { generateMentorResponse } from "./mentor-llm";
import type { WorldModel } from "./world-model";

// ═══════════════════════════════════════════════════════════════
// Pipeline State
// ═══════════════════════════════════════════════════════════════

export interface PipelineState {
  /** Stage 1: Grounded understanding */
  grounding: GroundedMeaning;

  /** Stage 2: Reasoning output */
  reasoning: ReasoningOutput;

  /** Stage 3: Dialogue output */
  dialogue: string;

  /** Can we advance to the next stage? */
  stageGates: {
    canReason: boolean;     // understanding >= 60%
    canDialogue: boolean;   // understanding >= 40% OR has active hypotheses
    canOutline: boolean;    // understanding >= 80% AND has confirmed position
  };

  /** Overall pipeline progress */
  understandingScore: number; // 0-100
}

export interface ReasoningOutput {
  hypotheses: Hypothesis[];
  preferredHypothesis: number; // index into hypotheses
  confidence: number;          // 0-1
  evidenceFor: string[];
  evidenceAgainst: string[];
}

export interface Hypothesis {
  statement: string;
  plausibility: number; // 0-1
  requiresEvidence: string[];
}

// ═══════════════════════════════════════════════════════════════
// Stage 1: Understand — build mental model (NO user output)
// ═══════════════════════════════════════════════════════════════

function understand(input: string, previousTopics: string[]): GroundedMeaning {
  return ground(input, previousTopics);
}

// ═══════════════════════════════════════════════════════════════
// Stage 2: Reason — form hypotheses (NO user output)
// ═══════════════════════════════════════════════════════════════

function reason(grounding: GroundedMeaning, world: WorldModel): ReasoningOutput {
  const { subject, predicate, object, contestableConcepts, domains } = grounding;

  const hypotheses: Hypothesis[] = [];

  // Generate 2-4 competing explanations
  // Each hypothesis addresses the core proposition differently

  // Hypothesis A: Accept the premise
  hypotheses.push({
    statement: `${subject}确实${predicate}${object}。这是一个真实存在的趋势。`,
    plausibility: 0.4,
    requiresEvidence: [`${subject}${predicate}${object}的具体数据`, "时间跨度对比"],
  });

  // Hypothesis B: Reframe — the premise itself is wrong
  if (contestableConcepts.length > 0) {
    hypotheses.push({
      statement: `「${contestableConcepts[0]}」这个说法本身可能不成立。${subject}的${object}没有被${predicate}，而是被重新分配了。`,
      plausibility: 0.5,
      requiresEvidence: ["重新分配的证据", "测量方式的变化"],
    });
  }

  // Hypothesis C: Structural explanation
  if (domains.length > 0) {
    hypotheses.push({
      statement: `这不是个体问题，而是${domains[0]}层面的结构性变化。${subject}${predicate}${object}只是更大趋势的表征。`,
      plausibility: 0.5,
      requiresEvidence: [`${domains[0]}的结构性数据`, "长期趋势分析"],
    });
  }

  // Hypothesis D: The question itself is wrong
  if (hypotheses.length < 3) {
    hypotheses.push({
      statement: `也许我们不该问'${subject}是否${predicate}${object}'，而应该问'为什么我们会关心${subject}${predicate}${object}'。`,
      plausibility: 0.3,
      requiresEvidence: ["社会关注的来源", "话语分析"],
    });
  }

  // Pick preferred hypothesis (highest plausibility, favoring reframe)
  let preferred = 0;
  let bestPlausibility = 0;
  for (let i = 0; i < hypotheses.length; i++) {
    if (hypotheses[i].plausibility > bestPlausibility) {
      bestPlausibility = hypotheses[i].plausibility;
      preferred = i;
    }
  }

  return {
    hypotheses,
    preferredHypothesis: preferred,
    confidence: 0.5,
    evidenceFor: [],
    evidenceAgainst: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// Stage 3: Dialogue — talk to user (ONLY stage that outputs)
// ═══════════════════════════════════════════════════════════════

function dialogue(grounding: GroundedMeaning, reasoning: ReasoningOutput, world: WorldModel): string {
  const lines: string[] = [];
  const preferred = reasoning.hypotheses[reasoning.preferredHypothesis];
  const { contestableConcepts } = grounding;

  // 1. Show understanding — confirm interpretation
  lines.push(`我仔细想了一下你说的「${grounding.fullProposition}」。`);
  lines.push("");

  // 2. Identify contestable concepts
  if (contestableConcepts.length > 0) {
    lines.push(`在深入讨论之前，有几个词我需要先确认：${contestableConcepts.map(c => `「${c}」`).join("、")}——你使用的具体含义是什么？不同的人对这些词的理解可能完全不同。`);
    lines.push("");
  }

  // 3. Present hypotheses
  lines.push(`目前我形成了${reasoning.hypotheses.length}种可能的理解：`);
  lines.push("");

  for (let i = 0; i < reasoning.hypotheses.length; i++) {
    const h = reasoning.hypotheses[i];
    const marker = i === reasoning.preferredHypothesis ? "★" : "·";
    lines.push(`${marker} ${h.statement}`);
  }
  lines.push("");

  // 4. State preference with humility
  lines.push(`我现在更倾向第 ${reasoning.preferredHypothesis + 1} 种理解，但我没有把握。这不是非此即彼——可能几种解释同时成立，只是比重不同。`);
  lines.push("");

  // 5. Invite correction
  lines.push(`我想先听听你的看法——我的理解接近你的意思吗？还是你已经有了不同的判断？`);
  lines.push("");
  lines.push(`如果我理解错了，请直接纠正我。我们的目标是找到更准确的理解，不是维护我的面子。`);

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// The Pipeline — public API
// ═══════════════════════════════════════════════════════════════

export function runCognitivePipeline(
  userInput: string,
  world: WorldModel,
  previousTopics: string[] = []
): PipelineState {
  // Stage 1: Understand (NO output to user)
  const grounding = understand(userInput, previousTopics);

  // Stage 2: Reason (NO output to user)
  const reasoning = reason(grounding, world);

  // Stage 3: Dialogue (ONLY output)
  // First round: use the full cognitive pipeline dialogue
  // Subsequent rounds: Mentor LLM builds on the evolving world
  const dialogueText = world.roundCount <= 1
    ? dialogue(grounding, reasoning, world)
    : generateMentorResponse(world);

  // Stage gates
  const stageGates = {
    canReason: grounding.understandingScore >= 50,
    canDialogue: grounding.understandingScore >= 40,
    canOutline: grounding.understandingScore >= 80 && world.userThinking.length >= 3,
  };

  return {
    grounding,
    reasoning,
    dialogue: dialogueText,
    stageGates,
    understandingScore: grounding.understandingScore,
  };
}
