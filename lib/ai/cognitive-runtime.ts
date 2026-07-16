/**
 * Cognitive Runtime — Goal-Driven State Machine.
 *
 * Replaces: cognitive-pipeline.ts + cognitive-engine.ts + cognitive-diagnoser.ts
 * Architecture: Goal → State → Move → Primitive → Execute → Update
 *
 * LLM is only called at the Primitive execution layer — for expression, not decision.
 */

import { selectMove, type Move } from "./moves";
import { executePrimitive, type Primitive } from "./primitives";
import { buildGoal, isGoalAchieved, reframeGoal, handleColdStart, type ColdStartResult } from "./goal-builder";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RuntimeState {
  goal: string;
  historyMoves: Move[];
  userThinking: string[];
  currentPosition: string | null;
  evidence: { for: string[]; against: string[] };
  unknowns: string[];
  round: number;
  goalAchieved: boolean;
}

export interface RuntimeOutput {
  response: string;
  newState: RuntimeState;
  goalAchieved: boolean;
  move: Move;
  coldStart: ColdStartResult | null;
}

// ═══════════════════════════════════════════════════════════════
// Initial State
// ═══════════════════════════════════════════════════════════════

export function createInitialState(anchor: string): RuntimeState {
  return {
    goal: "",
    historyMoves: [],
    userThinking: [],
    currentPosition: null,
    evidence: { for: [], against: [] },
    unknowns: [anchor],
    round: 0,
    goalAchieved: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Core Runtime Step
// ═══════════════════════════════════════════════════════════════

export async function runCognitiveStep(
  input: string,
  state: RuntimeState
): Promise<RuntimeOutput> {
  // 0. Cold start detection
  let coldStart: ColdStartResult | null = null;
  if (state.round === 0 && state.userThinking.length === 0) {
    coldStart = handleColdStart(input);
  }

  // 1. Build or refine Goal
  let goal = state.goal;
  if (!goal) {
    goal = await buildGoal(input, state.userThinking);
  } else if (state.round > 0 && state.round % 2 === 0) {
    goal = await reframeGoal(goal, state);
  }

  // 2. Select the best Move based on current state + Goal distance
  const move = selectMove(goal, state);

  // 3. Plan Primitives for this Move
  const primitives = planPrimitives(move);

  // 4. Execute Primitives (with LLM for expression)
  const result = await executePrimitive(primitives, state);

  // 5. Update State
  const newState = updateState(state, move, result, goal);

  // 6. Check if Goal achieved
  const achieved = isGoalAchieved(newState);

  return {
    response: result,
    newState,
    goalAchieved: achieved,
    move,
    coldStart,
  };
}

// ═══════════════════════════════════════════════════════════════
// Primitive Planner
// ═══════════════════════════════════════════════════════════════

function planPrimitives(move: Move): Primitive[] {
  switch (move) {
    case "UNDERSTAND":
      return ["GROUND", "CLARIFY"];
    case "EXPLORE":
      return ["QUESTION", "ELABORATE"];
    case "CHALLENGE":
      return ["COUNTER", "EVIDENCE_CHECK"];
    case "SUMMARIZE":
      return ["SYNTHESIZE", "GAP_CHECK"];
    case "OUTLINE":
      return ["STRUCTURE", "GAP_CHECK"];
    case "REFLECT":
      return ["RETROSPECT", "GAP_CHECK"];
    case "GUIDE":
      return ["QUESTION", "GAP_CHECK"];
    case "EXPRESS":
      return ["WRITE"];
    default:
      return ["QUESTION"];
  }
}

// ═══════════════════════════════════════════════════════════════
// State Update
// ═══════════════════════════════════════════════════════════════

function updateState(
  state: RuntimeState,
  move: Move,
  result: string,
  goal: string
): RuntimeState {
  const next = { ...state, round: state.round + 1, goal };

  // Track the move
  next.historyMoves = [...state.historyMoves, move];

  // Update based on move type
  if (move === "UNDERSTAND" || move === "EXPLORE" || move === "GUIDE") {
    if (!next.userThinking.includes(result)) {
      next.userThinking = [...next.userThinking, result];
    }
  }

  if (move === "CHALLENGE") {
    next.evidence = {
      ...next.evidence,
      against: [...next.evidence.against, result.slice(0, 80)],
    };
  }

  if (move === "SUMMARIZE" || move === "OUTLINE") {
    next.currentPosition = result;
    next.goalAchieved = isGoalAchieved(next);
  }

  return next;
}
