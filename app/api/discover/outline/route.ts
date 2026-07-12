import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── POST /api/discover/outline ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, thinking, ideas } = body as {
      anchor: string;
      thinking: string[];
      ideas: string[];
    };

    const topic = anchor?.trim() || "这个话题";

    if (isMockMode()) {
      return Response.json({
        outline: generateMockOutline(topic, thinking, ideas),
      });
    }

    const client = createClient();

    const systemPrompt = `你是写作架构师。根据用户的锚点话题、思考记录和相关素材，生成一个清晰的文章大纲。

大纲格式要求：
- 用JSON格式返回，结构为 { "outline": [{ "level": 1|2, "title": "章节标题", "notes": "简要说明" }] }
- level 1 为主要章节，level 2 为子章节
- 标题简洁有力
- 章节之间逻辑连贯
- 3-6个主要章节`;

    const thinkingText = thinking?.length
      ? "\n思考记录：\n" + thinking.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "";

    const ideasText = ideas?.length
      ? "\n相关素材：\n" + ideas.map((i) => `- ${i}`).join("\n")
      : "";

    const userContent = `锚点话题："${topic}"${thinkingText}${ideasText}\n\n请根据以上内容生成文章大纲。`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(raw);

    return Response.json({
      outline: data.outline || generateMockOutline(topic, thinking, ideas),
    });
  } catch (error) {
    console.error("[discover/outline]", error);
    const topic = "这个话题";
    return Response.json({
      outline: generateMockOutline(topic, [], []),
    });
  }
}

// ── Mock outline generator ───────────────────────────────────

function generateMockOutline(
  anchor: string,
  thinking: string[],
  ideas: string[]
): { level: number; title: string; notes: string }[] {
  const topic = anchor.slice(0, 20);

  const baseOutline: { level: number; title: string; notes: string }[] = [
    { level: 1, title: `引言：为什么关注「${topic}」`, notes: "提出问题，引发读者兴趣" },
    { level: 1, title: `「${topic}」的现状分析`, notes: "梳理当前的背景和基本情况" },
    { level: 2, title: "核心现象", notes: "描述最突出的表现" },
    { level: 2, title: "深层原因", notes: "分析背后的驱动因素" },
    { level: 1, title: `「${topic}」的不同视角`, notes: "呈现多元观点，丰富讨论维度" },
    { level: 2, title: "支持与机遇", notes: "正面论述" },
    { level: 2, title: "质疑与挑战", notes: "反面论述" },
    { level: 1, title: "我的立场与论证", notes: "明确个人观点，展开论证" },
    { level: 1, title: "结论与展望", notes: "总结全文，提出思考方向" },
  ];

  // Append idea references
  if (ideas.length > 0) {
    baseOutline.push({
      level: 1,
      title: "附录：参考素材",
      notes: ideas.slice(0, 5).join("、"),
    });
  }

  return baseOutline;
}
