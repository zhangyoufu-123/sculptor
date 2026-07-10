import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode, MOCK_AUTOCOMPLETE_RESPONSE } from "@/lib/ai/mock-responses";
import { AUTOCOMPLETE_SYSTEM_PROMPT, buildAutocompletePrompt } from "@/lib/ai/prompts/autocomplete";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partialText, nodeType, parentTitle, siblingTitles, articleTheme } = body;
    if (!partialText || partialText.length < 2) {
      return Response.json({ suggestions: [] });
    }

    // Mock mode
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 300));
      return Response.json(MOCK_AUTOCOMPLETE_RESPONSE);
    }

    const userPrompt = buildAutocompletePrompt({
      partialText,
      nodeType: nodeType || "argument",
      parentTitle: parentTitle || "",
      siblingTitles: siblingTitles || [],
      articleTheme: articleTheme || "",
    });

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.4,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: AUTOCOMPLETE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ suggestions: [] });
  }
}
