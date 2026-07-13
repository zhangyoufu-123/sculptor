import { NextRequest } from "next/server";
import { getEngine } from "@/lib/ai/cognitive-engine";
import { generateMentorResponse } from "@/lib/ai/mentor-llm";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/discover/chat
 *
 * v2: LLM 负责思考，工程负责提供世界。
 * Engine builds World → Mentor LLM generates free-form response.
 * No fixed LRRCQ fields. No forced question templates.
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

    // Get the World Model for this session
    const world = engine.getWorld(anchor?.trim() || "这个话题");

    // Mentor LLM generates free-form response from the World
    const response = world
      ? generateMentorResponse(world)
      : output.decision.question;

    return Response.json({
      response,                           // single free-form text
      phase: output.decision.phase,
      stage: output.understanding.stage,
      shouldGenerateOutline: output.decision.shouldGenerateOutline,
      evidenceCount: output.evidence.length,
      evidence: output.evidence.slice(0, 3).map(e => ({
        text: e.statement.slice(0, 80),
        source: e.source,
        isFact: e.isFact,
      })),
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
