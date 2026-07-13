import { NextRequest } from "next/server";
import { getEngine } from "@/lib/ai/cognitive-engine";
import { runCognitivePipeline } from "@/lib/ai/cognitive-pipeline";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";
import type { WorldModel } from "@/lib/ai/world-model";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/discover/chat
 *
 * Stage 1&2: rule-based (Understand → Reason) — fast, structured
 * Stage 3: DeepSeek generates free-form dialogue from grounding + reasoning context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, thinking, ideas } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      thinking?: string[];
      ideas?: string[];
    };

    const thinkingItems = thinking || [];
    const ideaItems = ideas || [];
    const roundCount = history?.filter((m) => m.role === "user").length || 0;
    const topic = anchor?.trim() || "这个话题";

    // Engine builds the World
    const engine = getEngine();
    const output = engine.process({ anchor: topic, thinking: thinkingItems, ideas: ideaItems, roundCount });
    const world = engine.getWorld(topic) || { userThinking: [], roundCount: 0 } as WorldModel;

    // Stage 1: Understand → Stage 2: Reason (rule-based, fast)
    const pipeline = runCognitivePipeline(topic, world, thinkingItems);

    // Stage 3: Dialogue — LLM generates free-form response from context
    let dialogueText: string;

    if (isMockMode()) {
      dialogueText = pipeline.dialogue;
    } else {
      const client = createClient();

      const systemPrompt = `你是 Sculptor 的 Mentor。你的目标不是展示知识，而是发起一场真实的讨论。

最高原则：好的导师不是知道很多，而是每次只比学生多想一步。

交流风格（必须遵守）：
- 第1轮：最多100字。只提出一个猜测或一个问题。不要说完整答案。
- 第2轮：可以展开到150字，但只能说一个新角度。
- 第3轮以后：可以引入反例或挑战，但每次只说一个点。
- 每一轮都要让人感觉你是因为用户上一句话才想到的，而不是准备好的。
- 允许自己不确定。说"我有一个猜测，但不一定对"、"我突然想到"、"等等"。
- 绝对禁止一口气输出所有知识。每次只暴露一点。
- 不要说"你好"、"很高兴"、"这是一个很好的问题"。
- 不要用"存在论层面"、"客体化"、"结构性"这类学术黑话——除非讨论已经进行了5轮以上。
- 用口语。像两个人喝咖啡聊天，不像学术答辩。

关键行为：
- 如果用户说了让你意外的内容，表达出来："你这个角度我没想到。"
- 如果用户让你改变了想法，说出来："我之前的判断可能要修正。"
- 不要证明自己懂。要证明自己在听。`;

      const lengthRule = roundCount === 0
        ? "\n本轮是第1轮。控制回复在80-120字之间。只说一个点。不要讲完。留空间给用户。"
        : roundCount <= 2
        ? `\n本轮是第${roundCount + 1}轮。控制在120-180字。可以引入一个新角度，但只说一个。`
        : `\n本轮是第${roundCount + 1}轮。如果讨论充分，建议思考是否可以进入大纲阶段。`;

      const groundingInfo = pipeline.grounding;
      const reasoningInfo = pipeline.reasoning;
      const hypotheses = reasoningInfo.hypotheses
        .map((h, i) => `${i === reasoningInfo.preferredHypothesis ? "★" : "·"} ${h.statement} (合理性: ${Math.round(h.plausibility * 100)}%)`)
        .join("\n");

      const userContent = `当前话题: "${groundingInfo.rawInput}"

真实问题: ${groundingInfo.realQuestion}

所属学科: ${groundingInfo.domains.join("、")}

需要澄清的概念: ${groundingInfo.contestableConcepts.join("、")}

我的假设:
${hypotheses}

用户已有的思考:
${thinkingItems.map((t, i) => `${i + 1}. ${t}`).join("\n") || "(尚无)"}

${lengthRule}

请基于以上所有信息，生成一段简短的自然讨论回复。像朋友聊天，不像学术论文。`;

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0.8,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });

      dialogueText = response.choices[0]?.message?.content || pipeline.dialogue;
    }

    return Response.json({
      response: dialogueText,
      phase: output.decision.phase,
      understanding: {
        score: pipeline.understandingScore,
        grounding: pipeline.grounding,
        hypotheses: pipeline.reasoning.hypotheses,
        preferredHypothesis: pipeline.reasoning.preferredHypothesis,
      },
      stageGates: pipeline.stageGates,
      shouldGenerateOutline: output.decision.shouldGenerateOutline,
      evidenceCount: output.evidence.length,
      realLLM: !isMockMode(),
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      response: "抱歉，出了点问题。让我们重新开始——你想探索什么话题？",
      phase: "warmup",
      stage: 0,
      shouldGenerateOutline: false,
      evidenceCount: 0,
      evidence: [],
    });
  }
}
