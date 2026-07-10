import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ARCHITECT_REVIEW_PROMPT, buildReviewPrompt } from "@/lib/ai/prompts/architect-review";
import { isMockMode, MOCK_REVIEW_RESPONSE } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodes, edges } = body;
    if (!nodes || !edges) {
      return Response.json({ error: "Missing nodes or edges" }, { status: 400 });
    }
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 600));
      return Response.json(MOCK_REVIEW_RESPONSE);
    }
    const prompt = buildReviewPrompt(JSON.stringify(nodes), JSON.stringify(edges));
    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: ARCHITECT_REVIEW_PROMPT }, { role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    return Response.json(JSON.parse(content));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
