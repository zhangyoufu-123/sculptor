import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ARCHITECT_EXPAND_PROMPT, buildExpandPrompt } from "@/lib/ai/prompts/architect-expand";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeLabel, nodeType, nodeChildren } = body;

    if (!nodeLabel || !nodeType) {
      return Response.json({ error: "Missing nodeLabel or nodeType" }, { status: 400 });
    }

    const prompt = buildExpandPrompt(nodeLabel, nodeType, nodeChildren || "");

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITECT_EXPAND_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);
    return Response.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
