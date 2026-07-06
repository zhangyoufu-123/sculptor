import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { FILL_NODE_PROMPT, buildFillNodePrompt } from "@/lib/ai/prompts/fill-node";
import { isMockMode, MOCK_FILL_NODE_RESPONSE } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeLabel, nodeType, context } = body;
    if (!nodeLabel) {
      return Response.json({ error: "Missing nodeLabel" }, { status: 400 });
    }
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500));
      return Response.json(MOCK_FILL_NODE_RESPONSE);
    }
    const prompt = buildFillNodePrompt(nodeLabel, nodeType || "argument", context || "");
    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: FILL_NODE_PROMPT }, { role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    return Response.json(JSON.parse(content));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
