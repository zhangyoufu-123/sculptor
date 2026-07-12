import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── POST /api/discover/insight ───────────────────────────────

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
        insights: generateMockInsights(topic, thinking, ideas),
      });
    }

    const client = createClient();

    const systemPrompt = `你是思维的发现者，不是观点的生成者。你的任务是发现用户思考中已经存在的核心观点，而不是创造新的。把用户的思考提炼成清晰的论述句。每个观点都要标注它是从哪些思考记录中提炼出来的。只输出JSON。`;

    const thinkingText = thinking?.length
      ? "\n用户的思考记录：\n" + thinking.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "";

    const ideasText = ideas?.length
      ? "\n用户收集的素材：\n" + ideas.map((i) => `- ${i}`).join("\n")
      : "";

    const userContent = `用户正在探索的话题："${topic}"${thinkingText}${ideasText}

请从以上思考记录中发现3-5个核心观点。返回JSON格式：
{
  "insights": [
    { "text": "核心论述句", "source": "来自思考记录1、3" }
  ]
}

要求：
- 每个观点都是用户思考中已有的，不要创造新观点
- 论述句要清晰有力，像用户自己会说的话
- source字段说明该观点来自哪些思考记录（用序号指代）
- 用中文输出`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(raw);

    return Response.json({
      insights: data.insights || generateMockInsights(topic, thinking, ideas),
    });
  } catch (error) {
    console.error("[discover/insight]", error);
    return Response.json({
      insights: generateMockInsights("这个话题", [], []),
    });
  }
}

// ── Mock insight generator ───────────────────────────────────

function generateMockInsights(
  anchor: string,
  thinking: string[],
  ideas: string[]
): { text: string; source: string }[] {
  // Build source labels from actual thinking items
  const sourceLabels = thinking.length > 0
    ? thinking.map((_, i) => `思考记录${i + 1}`)
    : ["用户的思考方向"];

  const pool: { text: string; sourceIndices: number[] }[] = [
    {
      text: "真正的问题不是表象本身，而是它背后的结构性问题。",
      sourceIndices: [0, 2],
    },
    {
      text: "人们往往把现象当成问题，却忽略了隐藏在背后的默认假设。",
      sourceIndices: [0],
    },
    {
      text: "从另一个角度看，这其实反映了更深层的需求没有被满足。",
      sourceIndices: [1, 3],
    },
    {
      text: "这个问题之所以复杂，是因为它涉及多个相互矛盾的维度。",
      sourceIndices: [0, 1],
    },
    {
      text: "与其寻找正确答案，不如重新审视我们提问的方式。",
      sourceIndices: [2],
    },
    {
      text: "核心矛盾在于理想状态与现实约束之间的张力。",
      sourceIndices: [1],
    },
    {
      text: "解决这个问题的关键可能不在问题本身，而在于改变看待它的框架。",
      sourceIndices: [0, 2, 3],
    },
  ];

  // Pick 3-5 insights based on thinking count
  const count = Math.min(Math.max(3, thinking.length), 5);
  const selected = pool.slice(0, count);

  // Inject anchor context into first insight
  if (selected.length > 0 && anchor.length > 0) {
    const shortAnchor = anchor.length > 15 ? anchor.slice(0, 15) + "…" : anchor;
    selected[0] = {
      text: `关于「${shortAnchor}」，${selected[0].text}`,
      sourceIndices: selected[0].sourceIndices,
    };
  }

  return selected.map((insight) => ({
    text: insight.text,
    source: insight.sourceIndices
      .map((idx) => sourceLabels[idx] || "思考记录")
      .join("、"),
  }));
}
