import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ARCHITECT_REVIEW_PROMPT, buildReviewPrompt } from "@/lib/ai/prompts/architect-review";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodes, edges } = body;

    if (!nodes || !edges) {
      return Response.json({ error: "Missing nodes or edges" }, { status: 400 });
    }

    const prompt = buildReviewPrompt(JSON.stringify(nodes), JSON.stringify(edges));

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITECT_REVIEW_PROMPT },
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
