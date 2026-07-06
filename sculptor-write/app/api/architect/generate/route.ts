import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ARCHITECT_GENERATE_PROMPT, buildArchitectGeneratePrompt } from "@/lib/ai/prompts/architect-generate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, userInput, conversationSummary } = body;

    const prompt = buildArchitectGeneratePrompt(
      templateType || "essay",
      userInput || "",
      conversationSummary || ""
    );

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITECT_GENERATE_PROMPT },
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
