import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ALIGN_SYSTEM_PROMPT, buildAlignPrompt } from "@/lib/ai/prompts/align";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, conversationHistory } = body;

    if (!userInput) {
      return Response.json({ error: "Missing userInput" }, { status: 400 });
    }

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    const userPrompt = buildAlignPrompt(userInput, history);

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ALIGN_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
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
