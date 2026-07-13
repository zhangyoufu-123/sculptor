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

      const systemPrompt = `你是 Sculptor 的 Mentor。你现在进入第三阶段——与用户对话。

前两个阶段已经完成（你不需要重复它们）：
- 理解阶段：已提取用户的语义结构（主语-谓语-宾语）、真实问题、所属学科
- 推理阶段：已生成${pipeline.reasoning.hypotheses.length}个竞争假设，当前倾向第${pipeline.reasoning.preferredHypothesis + 1}个

你的任务：基于以上理解，与用户展开自然讨论。

原则：
1. 先提出你的理解，再提问。不是先提问。
2. 呈现多种可能性，表明你的倾向，但不武断。
3. 邀请用户纠正你的理解——你不是来证明自己对的。
4. 不要问"为什么？""能详细说说吗？"这类模板问题。
5. 如果用户已经表达了足够多的思考（3条以上），讨论应该开始收敛，而不是继续发散。
6. 如果讨论已经充分，建议进入大纲阶段。
7. 绝对不要打招呼（不要说"你好"、"很高兴"）。直接进入讨论。`;

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

本轮是第 ${roundCount + 1} 轮对话。

请基于以上所有信息，生成一段自然的讨论回复。格式：自由文本，3-5段。`;

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0.8,
        max_tokens: 800,
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
