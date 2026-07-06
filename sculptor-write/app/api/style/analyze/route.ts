// app/api/style/analyze/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Analyze the writing style of this text. Output JSON:
{
  "tone": "formal|balanced|conversational|casual",
  "avg_sentence_length": number,
  "common_imagery": ["word1", "word2"],
  "formality": number (1-10),
  "keywords": ["key1", "key2"],
  "observations": ["obs1", "obs2"]
}`,
        },
        { role: "user", content: text.slice(0, 3000) },
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
