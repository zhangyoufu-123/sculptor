import { NextRequest } from "next/server";
import {
  runCognitiveStep,
  createInitialState,
  type RuntimeState,
} from "@/lib/ai/cognitive-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/discover/chat
 *
 * Goal-Driven Cognitive Runtime: Goal → State → Move → Primitive → Execute
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, thinking, state: clientState } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      thinking?: string[];
      ideas?: string[];
      state?: RuntimeState;
    };

    const input = anchor?.trim() || "这个话题";
    const thinkingItems = thinking || [];
    const roundCount = history?.filter((m) => m.role === "user").length || 0;

    // Load or create state
    const state: RuntimeState = clientState || {
      ...createInitialState(input),
      userThinking: thinkingItems,
      round: roundCount,
    };

    // Run cognitive step
    const output = await runCognitiveStep(input, state);

    return Response.json({
      response: output.response,
      state: output.newState,
      goalAchieved: output.goalAchieved,
      move: output.move,
      coldStart: output.coldStart,
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      response: "抱歉，出了点问题。让我们重新开始。",
      state: createInitialState(""),
      goalAchieved: false,
      move: "UNDERSTAND",
      goalDistance: 0,
    });
  }
}
