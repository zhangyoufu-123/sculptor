import { NextRequest } from "next/server";
import { getEngine } from "@/lib/ai/cognitive-engine";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/discover/chat
 *
 * The LLM is the last step, not the first.
 * Cognitive Engine makes all decisions: Understand → Model → Mentor → Reflect.
 * LLM only expresses the engine's decision in natural language.
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

    // ── Cognitive Engine: Understand → Model → Mentor → Reflect ──
    const engine = getEngine();
    const output = engine.process({
      anchor: anchor?.trim() || "这个话题",
      thinking: thinkingItems,
      ideas: ideaItems,
      roundCount,
    });

    // ── Build response from engine output ──
    const questions = [output.decision.question];

    return Response.json({
      questions,
      diagnosis: {
        stage: output.understanding.stage,
        confidence: output.understanding.confidence,
        detectedTopic: output.understanding.topic,
        missing: output.model.gaps,
        shouldGenerateOutline: output.decision.shouldGenerateOutline,
        shouldStopAsking: output.decision.shouldStopAsking,
        stageDistribution: {},
      },
      engine: {
        understanding: output.understanding,
        model: {
          causes: output.model.causes,
          contradictions: output.model.contradictions,
          gaps: output.model.gaps,
          shouldChallenge: output.model.shouldChallenge,
        },
        decision: {
          nextAction: output.decision.nextAction,
          reasoning: output.decision.reasoning,
        },
        reflection: output.reflection || null,
      },
      verification: output.verification,
      pipeline: {
        context: output.evidence
          .map((e) => `[${e.isFact ? "事实" : "推理"}] ${e.source}: ${e.statement.slice(0, 80)}`)
          .join("\n"),
        evidenceCount: output.evidence.length,
      },
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      questions: ["让我们重新开始——你想探索什么话题？"],
      diagnosis: { stage: 0, confidence: 0, detectedTopic: "", missing: [], shouldGenerateOutline: false, shouldStopAsking: false, stageDistribution: {} },
      engine: null,
      verification: { confidence: 0, needsVerification: false, summary: "" },
      pipeline: { context: "", evidenceCount: 0 },
    });
  }
}
