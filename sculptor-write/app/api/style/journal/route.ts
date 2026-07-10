// app/api/style/journal/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";
import { buildStyleJournalPrompt } from "@/lib/ai/prompts/style-journal";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, documentTitle, previousJournal } = body as {
      text?: string;
      documentTitle?: string;
      previousJournal?: string;
    };

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return Response.json(
        { error: "请提供至少 50 字的文本内容" },
        { status: 400 },
      );
    }

    // ── Mock 模式 ──
    if (isMockMode()) {
      const mockJournal = `这篇开始出现更多停顿——句号多了，逗号之间留出了呼吸的间隙。上一章的急促感在这里被有意放慢，像是作者在引导读者停下来，看看路边那些被略过的细节。我注意到"光"的意象在悄悄变化：从前是直射的阳光，现在变成反射的光斑、逆光的剪影，情感的强度没有降低，但表达更含蓄了。角色不再直接说出感受，而是用动作和环境的互动来暗示——这是一个好的转向。`;

      return Response.json({
        journal: mockJournal,
        generatedAt: new Date().toISOString(),
      });
    }

    // ── 真实模式：调用 DeepSeek ──
    const { system, user } = buildStyleJournalPrompt(text, previousJournal);

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const journal = response.choices[0]?.message?.content?.trim();
    if (!journal) throw new Error("DeepSeek 返回空内容");

    return Response.json({
      journal,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("POST /api/style/journal error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
