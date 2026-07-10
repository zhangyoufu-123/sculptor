import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";
import { searchAll, searchStyleLibrary } from "@/lib/knowledge-base";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `你是一位创意写作助手，用户正在写作中需要灵感。请根据用户的写作上下文，输出 JSON 格式的灵感建议：

{
  "inspirations": [
    {
      "type": "knowledge|suggestion|continuation|alert",
      "content": "具体的灵感内容（≤80字）",
      "actionable": true或false,
      "source": "AI创作"
    }
  ]
}

请提供 3-5 条灵感，类型分布：
- knowledge: 相关的诗句、典故、名言、数据、比喻
- suggestion: 写作建议（如何改进节奏、增加描写等）
- continuation: 可直接采纳的续写片段（30-60字）
- alert: 需要关注的写作问题

要求：内容要具体、实用、中文。风格优雅但不华丽。`;

function mockInspire(text: string) {
  const kbResults = searchAll(text, 4);
  const styleResults = searchStyleLibrary(text, 2);

  const inspirations: { type: string; content: string; actionable: boolean; source: string }[] = [];

  // Style library first (user's own writing)
  for (const r of styleResults) {
    inspirations.push({
      type: "knowledge",
      content: r.content,
      actionable: false,
      source: "历史风格库",
    });
  }

  // Knowledge base
  for (const r of kbResults) {
    inspirations.push({
      type: r.type === "argument-pattern" ? "suggestion" : "knowledge",
      content: r.content,
      actionable: false,
      source: "通用知识库",
    });
  }

  // AI continuation
  const topic = text.slice(0, 15).replace(/[，。！？、\s]/g, "") || "这个话题";
  inspirations.push({
    type: "continuation",
    content: `从这个角度看，${topic}不仅仅是一个技术问题，更是一个深刻的社会命题。它迫使我们重新审视那些习以为常的假设。`,
    actionable: true,
    source: "AI创作",
  });

  return { inspirations: inspirations.slice(0, 8) };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, cursorPosition } = body;
    if (!text || text.length < 20) {
      return Response.json({ inspirations: [] });
    }

    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500));
      return Response.json(mockInspire(text));
    }

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `用户正在写作，当前光标位置在第 ${cursorPosition || 0} 个字符。最近的文本内容：\n\n${text.slice(-1500)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    return Response.json(JSON.parse(content));
  } catch (err) {
    return Response.json(
      { inspirations: [], error: (err as Error).message },
      { status: 200 }
    );
  }
}
