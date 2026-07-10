import { NextRequest } from "next/server";
import OpenAI from "openai";
import { matchMasterQuotes } from "@/lib/master-quotes";

export const runtime = "nodejs";
export const maxDuration = 30;

const MOCK_INSPIRATION = "也许可以试着放慢节奏，多给一些感官的细节——比如风的声音、光的温度、空气中的气味。这些细腻的描写会让场景更加立体。";

const MOCK_QUOTES = [
  {
    text: "行到水穷处，坐看云起时。",
    author: "王维",
    source: "终南别业",
  },
  {
    text: "采菊东篱下，悠然见南山。",
    author: "陶渊明",
    source: "饮酒",
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recentText } = body;

    if (!recentText || typeof recentText !== "string") {
      return Response.json(
        { error: "Missing recentText" },
        { status: 400 }
      );
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    if (isMock) {
      return Response.json({
        inspiration: MOCK_INSPIRATION,
        quotes: MOCK_QUOTES,
      });
    }

    // Real: call DeepSeek to extract tone + keywords
    try {
      const client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      });

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract the emotional tone (one of: 悲伤/喜悦/思念/豪迈/沉静/激昂) and 3-5 keywords from this text. Output JSON: { "tone": string, "keywords": string[] }`,
          },
          {
            role: "user",
            content: `Text:\n"""\n${recentText}\n"""`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      let tone = "沉静";
      let keywords: string[] = [];

      if (content) {
        try {
          const parsed = JSON.parse(content);
          tone = parsed.tone || "沉静";
          keywords = parsed.keywords || [];
        } catch {
          // fall through with defaults
        }
      }

      // Match master quotes
      const matchedQuotes = matchMasterQuotes(keywords, tone);

      // Also get a brief inspiration
      const inspResponse = await client.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You are a gentle, encouraging writing companion. Based on the user's recent writing, offer ONE brief, specific suggestion for what they might explore next — a direction, a sensory detail, a character angle. Write in Chinese. Keep it to 1-2 sentences. Be subtle, not prescriptive.",
          },
          {
            role: "user",
            content: `Recent writing:\n"""\n${recentText}\n"""`,
          },
        ],
      });

      const inspiration =
        inspResponse.choices[0]?.message?.content || MOCK_INSPIRATION;

      return Response.json({
        inspiration,
        quotes: matchedQuotes.map((q) => ({
          text: q.text,
          author: q.author,
          source: q.source,
        })),
      });
    } catch (err) {
      console.error("Inspiration API error:", err);
      return Response.json({
        inspiration: MOCK_INSPIRATION,
        quotes: MOCK_QUOTES,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
