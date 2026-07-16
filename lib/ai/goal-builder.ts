/**
 * Goal Builder — determines and refines the session Goal.
 *
 * The Goal is NOT the user's anchor text. It's the underlying
 * objective: what does the user really want to achieve through
 * this discussion?
 */

import { isMockMode } from "./mock-responses";
import { createClient } from "../deepseek";
import type { RuntimeState } from "./cognitive-runtime";

// ═══════════════════════════════════════════════════════════════
// Goal Types
// ═══════════════════════════════════════════════════════════════

type GoalType = "UNDERSTAND" | "DECIDE" | "CREATE" | "DEBATE" | "EXPLORE";

interface Goal {
  type: GoalType;
  statement: string;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// Build initial Goal from user input
// ═══════════════════════════════════════════════════════════════

export async function buildGoal(input: string, thinking: string[]): Promise<string> {
  if (isMockMode()) {
    return mockBuildGoal(input, thinking);
  }

  const client = createClient();
  const response = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.5,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "分析用户输入，推断他们真正的目标。目标类型包括：" +
          "UNDERSTAND(想理解某事)、DECIDE(需要做决定)、CREATE(想产出内容)、" +
          "DEBATE(想讨论/辩论)、EXPLORE(开放式探索)。" +
          "用一句话（20字以内）概括目标。只输出这句话。",
      },
      {
        role: "user",
        content: `用户说: "${input}"\n已有思考: ${thinking.join("; ") || "无"}\n\n一句话总结用户目标：`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || mockBuildGoal(input, thinking);
}

function mockBuildGoal(input: string, _thinking: string[]): string {
  // Simple keyword-based goal inference
  if (input.includes("为什么")) return "理解现象背后的深层原因";
  if (input.includes("怎么") || input.includes("如何")) return "找到可行的解决方案";
  if (input.includes("是否") || input.includes("是不是")) return "检验一个命题是否成立";
  if (input.length < 10) return "明确自己想讨论的方向";
  return "深入探索这个主题";
}

// ═══════════════════════════════════════════════════════════════
// Reframe Goal — adjust based on discussion progress
// ═══════════════════════════════════════════════════════════════

export async function reframeGoal(goal: string, state: RuntimeState): Promise<string> {
  // If we have a clear position and evidence, shift from EXPLORE to CREATE
  if (state.currentPosition && state.evidence.for.length >= 2) {
    return `组织并表达关于「${state.unknowns[0] || goal}」的观点`;
  }

  // If we have conflicting evidence, shift to DECIDE
  if (state.evidence.against.length >= 1 && state.evidence.for.length >= 1) {
    return `在矛盾证据中找到更准确的立场`;
  }

  // If many unknowns remain, keep exploring
  if (state.unknowns.length >= 3) {
    return `缩小不确定性范围，聚焦最关键的问题`;
  }

  return goal;
}

// ═══════════════════════════════════════════════════════════════
// Goal Achievement Check
// ═══════════════════════════════════════════════════════════════

export function isGoalAchieved(state: RuntimeState): boolean {
  // A goal is achieved when:
  // 1. We have a clear position
  // 2. We have supporting evidence
  // 3. Unknowns are minimized
  // 4. Enough rounds have passed

  if (state.round < 3) return false;

  const hasPosition = !!state.currentPosition;
  const hasEvidence = state.evidence.for.length >= 2;
  const unknownsLow = state.unknowns.length <= 2;
  const enoughThinking = state.userThinking.length >= 3;

  return hasPosition && hasEvidence && unknownsLow && enoughThinking;
}
