import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";
import {
  diagnose,
  generateNextQuestions,
} from "@/lib/ai/cognitive-diagnoser";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── POST /api/discover/chat ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, thinking, ideas } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      thinking?: string[];
      ideas?: string[];
    };

    const topic = anchor?.trim() || "这个话题";
    const thinkingItems = thinking || [];
    const ideaItems = ideas || [];
    const roundCount = history?.filter((m) => m.role === "user").length || 0;

    // v9.0: Cognitive Diagnoser — diagnose before asking
    const diagnosis = diagnose(topic, thinkingItems, ideaItems, roundCount);

    // Mock mode: use diagnoser-driven question generation
    if (isMockMode()) {
      const questions = generateNextQuestions(diagnosis, topic);
      return Response.json({ questions, diagnosis });
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
      return Response.json({ questions: generateNextQuestions(diagnosis, topic), diagnosis });
    }

    return Response.json({ questions, diagnosis });
  } catch (error) {
    console.error("[discover/chat]", error);
    const fallbackDiagnosis = diagnose("这个话题", [], [], 0);
    return Response.json({ questions: generateNextQuestions(fallbackDiagnosis, "这个话题"), diagnosis: fallbackDiagnosis });
  }
}
