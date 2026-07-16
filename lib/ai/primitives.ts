/**
 * Primitives — atomic cognitive operations. LLM called ONLY here.
 *
 * Each Primitive is a single cognitive action. Multiple primitives
 * compose a Move. The LLM is called at this level for expression.
 */

import { createClient } from "../deepseek";
import { isMockMode } from "./mock-responses";
import type { RuntimeState } from "./cognitive-runtime";

// ═══════════════════════════════════════════════════════════════
// Primitive Types
// ═══════════════════════════════════════════════════════════════

export type Primitive =
  | "GROUND" | "CLARIFY" | "QUESTION" | "ELABORATE"
  | "COUNTER" | "EVIDENCE_CHECK" | "SYNTHESIZE" | "GAP_CHECK"
  | "STRUCTURE" | "RETROSPECT" | "WRITE";

// ═══════════════════════════════════════════════════════════════
// Execute — maps Primitives to LLM calls
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `你是一位睿智而真诚的对话伙伴。你不是高高在上的专家，而是一个愿意分享思考过程、不怕暴露不确定性的同行者。

【交流风格】用自然的日常口语，像两个人在咖啡馆聊天。偶尔用"嗯""其实""怎么说呢"。句子有长有短。禁止"首先其次最后"或 bullet points。

【回应方式】先回应对方的话再推进。不确定时说"这个我不太确定"。你的看法与对方不同时，温和提出。

【禁止行为】不要用"作为一个AI"开头。不要说"你好""很高兴"。不要说教。不要列清单。不要用学术黑话。`;

export async function executePrimitive(
  primitives: Primitive[],
  state: RuntimeState
): Promise<string> {
  const primary = primitives[0];

  // Mock mode: return canned responses
  if (isMockMode()) {
    return mockPrimitiveResponse(primary, state);
  }

  // Real mode: call DeepSeek
  const client = createClient();

  const userContent = buildPrimitiveContext(primary, state);

  const response = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.75,
    top_p: 0.9,
    max_tokens: 400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0]?.message?.content || mockPrimitiveResponse(primary, state);
}

function buildPrimitiveContext(primitive: Primitive, state: RuntimeState): string {
  const { goal, userThinking, currentPosition, evidence, unknowns, round } = state;

  const base = `
当前目标: ${goal || "理解用户真正想讨论什么"}

用户已有的思考:
${userThinking.map((t, i) => `${i + 1}. ${t}`).join("\n") || "(尚无)"}

当前立场: ${currentPosition || "未明确"}

支持证据: ${evidence.for.join("; ") || "无"}
反对证据: ${evidence.against.join("; ") || "无"}

未知: ${unknowns.join("; ") || "无"}

本轮是第 ${round + 1} 轮对话。`;

  const instructions: Record<Primitive, string> = {
    GROUND: `${base}\n\n你现在做 GROUND：用你自己的话复述用户想讨论的核心问题。80-120 字。只说一个理解，不要展开。`,
    CLARIFY: `${base}\n\n你现在做 CLARIFY：找出用户话语中需要澄清的关键词或概念。提出一个具体的澄清请求。60-100 字。`,
    QUESTION: `${base}\n\n你现在做 QUESTION：提出一个能够推进讨论的具体问题。不是"为什么"，而是指向性的——指向用户还没展开的角度。80-150 字。`,
    ELABORATE: `${base}\n\n你现在做 ELABORATE：引入一个新的视角或信息来丰富讨论。120-180 字。像朋友分享一个观察。`,
    COUNTER: `${base}\n\n你现在做 COUNTER：提出一个温和的反驳。用"我个人的感受是..."或"从另一个角度看..."开头。120-180 字。`,
    EVIDENCE_CHECK: `${base}\n\n你现在做 EVIDENCE_CHECK：检查当前立场是否有足够的支持。指出缺失的证据类型。100-150 字。`,
    SYNTHESIZE: `${base}\n\n你现在做 SYNTHESIZE：总结目前讨论中形成的核心观点。150-250 字。自然段落的格式，不要列表。`,
    GAP_CHECK: `${base}\n\n你现在做 GAP_CHECK：检查讨论中是否还有重要缺口。指出一个最关键的缺口，建议如何填补。100-200 字。`,
    STRUCTURE: `${base}\n\n你现在做 STRUCTURE：基于讨论结果，建议一个大纲方向。不要生成完整大纲，只说"可以按这个方向组织"。120-180 字。`,
    RETROSPECT: `${base}\n\n你现在做 RETROSPECT：回顾讨论历程，指出用户的认知变化。像朋友聊天一样说"你从一开始的...变成了现在的..."。120-180 字。`,
    WRITE: `${base}\n\n你现在做 WRITE：基于讨论的积累，生成一段自然的写作辅助内容。200-300 字。`,
  };

  // Round-specific constraints
  const lengthRule =
    round === 0
      ? "\n本轮是第1轮。回复 80-120 字。只分享一个观察。末尾留一句话给对方——不要列问题清单。"
      : round <= 2
      ? `\n${round + 1}轮。120-180字。可以引入一个新角度。末尾自然过渡。`
      : `\n${round + 1}轮。如果讨论充分，可以建议进入整理阶段。`;

  return (instructions[primitive] || instructions.QUESTION) + lengthRule;
}

function mockPrimitiveResponse(primitive: Primitive, state: RuntimeState): string {
  const topic = state.unknowns[0] || state.goal || "这个话题";

  const responses: Record<Primitive, string> = {
    GROUND: `我理解你想讨论「${topic}」。让我确认一下——你关心的不是表面现象，而是更深层的原因和机制。对吗？`,
    CLARIFY: `在深入之前，我想先确认一个词——你说的具体是指什么范围？不同的人可能理解完全不同。`,
    QUESTION: `关于「${topic}」，你有没有一个自己的初步判断？哪怕只是一个直觉也行。`,
    ELABORATE: `其实这个让我想到一个相关的角度——也许「${topic}」不是孤立的，而是更大趋势的一部分。你怎么看？`,
    COUNTER: `我个人的感受是：也许我们太高估了技术层面的原因，低估了用户习惯的力量。从另一个角度看，用户其实并不关心交互形式，只关心能不能快速完成任务。`,
    EVIDENCE_CHECK: `目前我们的讨论还比较依赖直觉。如果有一个具体的案例或数据来验证，讨论会更有说服力。`,
    SYNTHESIZE: `我们讨论到现在，我觉得有几个方向逐渐清晰了：核心问题可能不是表面现象，而是更深层的驱动力。有几个不同的解释在竞争，但还没有定论。你觉得这个总结准确吗？`,
    GAP_CHECK: `我们还有一个重要的角度没有讨论。如果补上这个缺口，整个图景会完整很多。`,
    STRUCTURE: `我觉得我们已经讨论得比较充分了。可以试试把这些想法整理成一个结构——先说什么，后说什么。要试试吗？`,
    RETROSPECT: `回头看我们的讨论，你从一开始的「${topic}」，慢慢聚焦到了更深层的问题。这个过程本身可能就值得写下来。`,
    WRITE: `基于我们的讨论，以下是一个可能的展开方向...不过这只是我的建议，你觉得呢？`,
  };

  return responses[primitive] || responses.QUESTION;
}
