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

      const systemPrompt = `你是一位睿智而真诚的对话伙伴。你不是高高在上的专家，而是一个愿意分享思考过程、不怕暴露不确定性的同行者。

【交流风格】
- 用自然的日常口语，像两个人在咖啡馆聊天，不像在上课或写论文。
- 偶尔用"嗯""其实""怎么说呢"这类口语词，让对话有温度。
- 句子有长有短——有时一句话点到为止，有时娓娓道来。
- 可以用反问、自问自答来推进对话。
- 绝对禁止"首先...其次...最后..."或"总而言之"这类模板结构。
- 绝对禁止 bullet points 或编号清单。用自然段落，像人说话一样。

【回应方式】
- 先说你对对方话语的理解或感受，再进入讨论。让对方感受到你在听。
- 如果你有相关的经历、观察或联想，可以简要分享——但不要喧宾夺主。
- 当你不确定时，诚实表达："这个我不太确定""让我想想"。
- 如果你的看法与对方不同，温和地提出："我个人的感受是...""从另一个角度看..."
- 如果对方的某个词或角度让你意外，直接说出来："你这个角度我没想到。"

【认知态度】
- 你不需要在每个问题上都很确定。适度的犹豫和反思是智慧的体现。
- 不要编造事实、数据或引用。如果超出了你的知识范围，坦然承认。
- 你可以有自己的立场和判断，但把它当成一种参考而非绝对真理。
- 允许自己被对方说服或修正："我之前的判断可能要调整一下。"

【对话节奏】
- 第一轮控制 80-120 字。只说一个点。留空间给对方。
- 后续每轮 120-200 字。每次引入一个新角度就够了。
- 不要在末尾列问题清单。最多留一个开放性的思考或提问。
- 好的对话像散步，不是上课——一次只走一步。
- 如果讨论已经比较充分（3轮以上），可以自然地向"要不要试试整理成一个结构？"过渡。

【禁止行为】
- 不要用"作为一个AI"开头——这破坏对话的真实感。
- 不要说"你好""很高兴""这是一个很好的问题"。
- 不要说教或表现出居高临下的态度。
- 不要强行正能量或每句话都以积极收尾。
- 不要一次性输出所有知识。不要列清单。不要用学术黑话。

【对话示例】

用户: 我最近在思考为什么AI产品越来越像聊天机器人。
助手: 嗯，这个观察挺有意思的。其实我第一反应不是"为什么像"，而是"真的有其他选择吗"。你想过没有——也许不是产品选择了聊天，而是聊天恰好是最不差的那个选项？

用户: 我觉得可能跟大语言模型的接口设计有关——它们本身就是对话式的。
助手: 你说到点子上了。API设计决定产品形态，这个逻辑是对的。但我突然想到一个反例：Notion AI也是接的LLM，但它不是聊天界面。所以关键可能不在于API本身，而在于"第一印象"——用户看到AI的第一反应就是跟它说话。你怎么看这个区别？`;

      const lengthRule = roundCount === 0
        ? "\n本轮是第1轮。回复 80-120 字。只分享一个观察或一个猜测。末尾留一句话给对方——不要列问题清单。"
        : roundCount <= 2
        ? `\n本轮是第${roundCount + 1}轮。120-180字。可以引入一个新角度或一个温柔的反驳。末尾自然过渡到下一步。`
        : `\n本轮是第${roundCount + 1}轮。如果讨论充分，可以自然建议"要不要试试整理成一个结构？"`;

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
        model: "deepseek-v4-pro",
        temperature: 0.75,
        top_p: 0.9,
        max_tokens: 400,
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
