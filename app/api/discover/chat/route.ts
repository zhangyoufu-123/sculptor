import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Mock: Socratic questions based on anchor topic ──────────

const MOCK_QUESTIONS: Record<string, string[]> = {
  default: [
    "你真正想解决的问题是什么？",
    "为什么会想到这个话题？它对你意味着什么？",
    "有没有一个具体的例子或场景能说明你的关切？",
    "如果从相反的角度看，你会怎么描述这个问题？",
  ],
};

function getMockQuestions(anchor: string): string[] {
  // Use anchor to seed variety
  const pool = [
    "你真正想解决的问题是什么？",
    "为什么会想到这个话题？它对你意味着什么？",
    "有没有一个具体的例子或场景能说明你的关切？",
    "如果从相反的角度看，你会怎么描述这个问题？",
    "你希望读者读完你的文章后，产生什么样的感受或行动？",
    "这个问题背后，有没有一个更深层的问题？",
    "你的观点中，哪个部分最容易被质疑？为什么？",
    "这个问题是最近才出现的，还是已经存在了很久？",
    "有没有人持完全相反的立场？他们的理由可能是什么？",
    "如果只能用一个比喻来描述这个问题，你会用什么？",
    "这个问题的核心矛盾是什么？",
    "你个人与这个话题有什么关联？这种关联会影响你的立场吗？",
    "有没有一个你已经默认接受但从未审视过的前提？",
    "最让你感到困惑或不确定的部分是什么？",
    "有没有一种'第三种可能'，既不是A也不是B？",
    // Principle 3 closing questions — help user know they're done
    "你觉得我们已经找到足够的方向了吗？",
    "在这些思考中，哪个观点最让你感到意外？",
    "如果把刚才的讨论浓缩成一句话，会是什么？",
  ];

  // Seed-based shuffle for consistent variety per anchor
  let seed = 0;
  for (let i = 0; i < anchor.length; i++) seed = (seed * 31 + anchor.charCodeAt(i)) | 0;

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed >> (i % 8)) & 0x7fffffff) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 3 + (Math.abs(seed) % 2)); // 3-4 questions
}

// ── POST /api/discover/chat ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
    };

    const topic = anchor?.trim() || "这个话题";

    // Mock mode: return seeded questions
    if (isMockMode()) {
      return Response.json({ questions: getMockQuestions(topic) });
    }

    // Real mode: use DeepSeek
    const client = createClient();

    const systemPrompt = `你是 Mentor，不是 Assistant。你的三个原则：
1. 绝不抢答案。用户问问题，你用问题回应，引导用户自己找到答案。
2. 不断提高思考层级。从具体现象上升到抽象问题，从个人经历上升到普遍规律。
3. 知道什么时候闭嘴。对话超过3轮后，开始帮助用户总结而不是继续发散。最后一轮应该问：'你觉得我们已经找到足够的方向了吗？'

每次回复3-4个问题。问题应该让用户自己发现答案。不要打招呼，不要总结，不要给出观点。只输出问题，每行一个，不要编号。`;

    const historyText = history?.length
      ? "\n\n之前的对话：\n" + history.map((m) => `${m.role === "user" ? "用户" : "你"}: ${m.content}`).join("\n")
      : "";

    const userContent = `用户正在思考的话题是："${topic}"。${historyText}\n\n请提出3-4个苏格拉底式问题，帮助用户深入探索这个话题。每行一个问题，不要编号，不要前缀。`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.9,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const questions = raw
      .split("\n")
      .map((l) => l.replace(/^\d+[.、)\s]+/, "").trim())
      .filter((l) => l.length > 4 && (l.endsWith("？") || l.endsWith("?") || l.length > 10))
      .slice(0, 4);

    if (questions.length === 0) {
      return Response.json({ questions: getMockQuestions(topic) });
    }

    return Response.json({ questions });
  } catch (error) {
    console.error("[discover/chat]", error);
    // Fallback to mock on error
    const topic = "这个话题";
    return Response.json({ questions: getMockQuestions(topic) });
  }
}
