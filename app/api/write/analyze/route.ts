import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 30;

const MOCK_ANALYSIS = [
  "文字的节奏在逐渐变慢,像是从急流进入了平缓的河段。意象从外部景观转向了内心感受,这是一种自然的叙事呼吸。",
  "我注意到你开始使用更多的感官细节——尤其是触觉和听觉。这让场景变得更加立体,读者仿佛能感受到空气的温度。",
  "这段话里藏着一个有趣的重复意象:'光'出现了三次,但每次的质地都不同。也许可以考虑合并或强调这种递进关系?",
  "情绪在这里发生了微妙的转折,从观察转向了反思。这种节奏的变化给文字增添了深度,读起来像是在和自己对话。",
  "句子的长度在自然波动,短句带来的停顿感让长句的舒展更加明显。这种呼吸节奏很舒服,像是一首慢歌。",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recentText, styleProfile } = body;

    if (!recentText || typeof recentText !== "string") {
      return Response.json(
        { error: "Missing recentText" },
        { status: 400 }
      );
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    if (isMock) {
      const idx = Math.floor(Math.random() * MOCK_ANALYSIS.length);
      return Response.json({ analysis: MOCK_ANALYSIS[idx] });
    }

    // Real: call DeepSeek
    try {
      const client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      });

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: 150,
        messages: [
          {
            role: "system",
            content:
              "You are a subtle literary companion. Analyze the recent writing. Be brief (2-3 sentences). Notice emotional shifts, recurring imagery, rhythm changes, or hidden connections. Never be judgmental. Write in the voice of a thoughtful reader, not a critic. Respond in the user's language.",
          },
          {
            role: "user",
            content: `Recent writing:\n"""\n${recentText}\n"""\n\nProvide a brief, subtle literary analysis.`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      return Response.json({ analysis: content });
    } catch (err) {
      console.error("Analyze API error:", err);
      // Return empty analysis on failure — non-blocking
      return Response.json({ analysis: "" });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
