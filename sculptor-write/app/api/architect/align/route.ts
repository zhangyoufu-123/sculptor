import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ALIGN_SYSTEM_PROMPT, buildAlignPrompt } from "@/lib/ai/prompts/align";
import { isMockMode, MOCK_ALIGN_RESPONSES } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

let mockIndex = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, conversationHistory } = body;

    if (!userInput) {
      return Response.json({ error: "Missing userInput" }, { status: 400 });
    }

    // Mock mode: return pre-scripted questions
    if (isMockMode()) {
      const history = Array.isArray(conversationHistory) ? conversationHistory : [];
      const round = Math.min(history.length, MOCK_ALIGN_RESPONSES.length - 1);
      const resp = MOCK_ALIGN_RESPONSES[round] || MOCK_ALIGN_RESPONSES[MOCK_ALIGN_RESPONSES.length - 1];
      await new Promise((r) => setTimeout(r, 500)); // simulate delay
      return Response.json(resp);
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
    return Response.json(JSON.parse(content));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
