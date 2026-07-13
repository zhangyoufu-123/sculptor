import { NextRequest } from "next/server";
import { getEngine } from "@/lib/ai/cognitive-engine";
import { runCognitivePipeline } from "@/lib/ai/cognitive-pipeline";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/discover/chat
 *
 * v2: Three-stage cognitive loop: Understand → Reason → Dialogue.
 * Stages 1&2 produce NO user output. Only Stage 3 (Dialogue) talks to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, thinking, ideas } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      thinking?: string[];
      ideas?: string[];
    };

    const thinkingItems = thinking || [];
    const ideaItems = ideas || [];
    const roundCount = history?.filter((m) => m.role === "user").length || 0;

    // Engine builds the World
    const engine = getEngine();
    const output = engine.process({
      anchor: anchor?.trim() || "这个话题",
      thinking: thinkingItems,
      ideas: ideaItems,
      roundCount,
    });

    const world = engine.getWorld(anchor?.trim() || "这个话题");

    // Stage 1: Understand → Stage 2: Reason → Stage 3: Dialogue
    const pipeline = runCognitivePipeline(
      anchor?.trim() || "这个话题",
      world || { userThinking: [], roundCount: 0 } as any,
      thinkingItems
    );

    return Response.json({
      response: pipeline.dialogue,
      phase: output.decision.phase,
      understanding: {
        score: pipeline.understandingScore,
        grounding: pipeline.grounding,
        hypotheses: pipeline.reasoning.hypotheses,
        preferredHypothesis: pipeline.reasoning.preferredHypothesis,
      },
      stageGates: pipeline.stageGates,
      shouldGenerateOutline: output.decision.shouldGenerateOutline,
      evidenceCount: output.evidence.length,
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      response: "让我们重新开始——你想探索什么话题？",
      phase: "warmup",
      stage: 0,
      shouldGenerateOutline: false,
      evidenceCount: 0,
      evidence: [],
    });
  }
}
