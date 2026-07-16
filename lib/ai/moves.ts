/**
 * Moves — 8 cognitive operations the Runtime can execute.
 *
 * Each Move is a decision: what should happen next to move toward the Goal?
 * Not fixed LRRCQ. Not forced templates. The Move is selected based on
 * Goal distance and current State.
 */

import type { RuntimeState } from "./cognitive-runtime";

// ═══════════════════════════════════════════════════════════════
// Move Types
// ═══════════════════════════════════════════════════════════════

export type Move =
  | "UNDERSTAND"   // Ground the topic — what does the user really mean?
  | "EXPLORE"      // Expand — what else is there?
  | "CHALLENGE"    // Push back — is this really true?
  | "SUMMARIZE"    // Synthesize — what have we learned?
  | "OUTLINE"      // Structure — time to organize
  | "REFLECT"      // Look back — what changed?
  | "GUIDE"        // Nudge — what's the next best step?
  | "EXPRESS";     // Write — Ghost / inline AI

// ═══════════════════════════════════════════════════════════════
// Companion response tone for each Move
// ═══════════════════════════════════════════════════════════════

export const MOVE_TONES: Record<Move, string> = {
  UNDERSTAND: "先确认我理解得对不对",
  EXPLORE: "我们还没展开这个角度",
  CHALLENGE: "我想挑战一下这个前提",
  SUMMARIZE: "让我试着总结一下",
  OUTLINE: "可以开始整理结构了",
  REFLECT: "回头看看我们的讨论",
  GUIDE: "下一步可以试试这个方向",
  EXPRESS: "",
};

// ═══════════════════════════════════════════════════════════════
// Move Selector — choose the best Move based on Goal + State
// ═══════════════════════════════════════════════════════════════

export function selectMove(goal: string, state: RuntimeState): Move {
  const { round, userThinking, evidence, unknowns, currentPosition } = state;

  // Phase 1: Grounding (rounds 0-1)
  if (round === 0) return "UNDERSTAND";
  if (round === 1 && unknowns.length > 0) return "GUIDE";

  // Phase 2: Exploration (rounds 2-3)
  if (round >= 2 && round <= 3) {
    if (evidence.against.length === 0 && userThinking.length >= 2) return "CHALLENGE";
    if (userThinking.length >= 3) return "EXPLORE";
    return "GUIDE";
  }

  // Phase 3: Convergence (rounds 4-5)
  if (round >= 4 && round <= 5) {
    if (evidence.for.length >= 2 && evidence.against.length >= 1) return "SUMMARIZE";
    if (userThinking.length >= 3 && !currentPosition) return "SUMMARIZE";
    return "CHALLENGE";
  }

  // Phase 4: Closure (round 6+)
  if (round >= 6) {
    if (currentPosition && evidence.for.length >= 2) return "OUTLINE";
    if (currentPosition) return "REFLECT";
    return "SUMMARIZE";
  }

  return "GUIDE";
}

// ═══════════════════════════════════════════════════════════════
// Goal distance — how close are we to achieving the Goal?
// ═══════════════════════════════════════════════════════════════

export function goalDistance(state: RuntimeState): number {
  let score = 0;
  // Each element that moves us closer to the goal adds points
  if (state.currentPosition) score += 3;
  if (state.evidence.for.length >= 2) score += 2;
  if (state.evidence.against.length >= 1) score += 1;
  if (state.unknowns.length <= 2) score += 2;
  if (state.userThinking.length >= 4) score += 2;
  return Math.min(10, score);
}
