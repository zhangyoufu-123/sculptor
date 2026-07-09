import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

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
  const topic = text.slice(0, 20).replace(/[，。！？、\s]/g, "") || "这个话题";

  const inspirations = [
    {
      type: "knowledge" as const,
      content: `关于「${topic}」，古人云："学而不思则罔，思而不学则殆"——可以引用以增加文采`,
      actionable: false,
      source: "AI创作" as const,
    },
    {
      type: "suggestion" as const,
      content: "尝试用一个生活中的具体场景来引入你的观点，让读者产生代入感",
      actionable: false,
      source: "AI创作" as const,
    },
    {
      type: "continuation" as const,
      content: `从这个角度看，${topic}不仅仅是一个技术问题，更是一个深刻的社会命题。它迫使我们重新审视那些习以为常的假设。`,
      actionable: true,
      source: "AI创作" as const,
    },
  ];

  // Add topic-aware metaphor
  if (text.includes("教育")) {
    inspirations.push({
      type: "knowledge" as const,
      content: "比喻推荐：「教育不是注满一桶水，而是点燃一把火」——叶芝",
      actionable: false,
      source: "AI创作" as const,
    });
  }
  if (text.includes("技术") || text.includes("人工智能") || text.includes("AI")) {
    inspirations.push({
      type: "knowledge" as const,
      content: "可用对比：「技术的本质不是替代人类，而是放大人类的可能性」",
      actionable: false,
      source: "AI创作" as const,
    });
  }

  return { inspirations };
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
