/**
 * Mentor LLM — receives World context and generates natural responses.
 *
 * Constitution v2: LLM 负责思考，工程负责提供世界。
 * No fixed LRRCQ. No forced question templates. No stage machine output.
 * The LLM decides: how to understand, what to challenge, when to ask, when to stop.
 */

import { worldToLLMContext, type WorldModel } from "./world-model";
import { GAP_QUESTIONS } from "./cognitive-diagnoser";

// ═══════════════════════════════════════════════════════════════
// Mock LLM — simulates real LLM behavior with World context
// ═══════════════════════════════════════════════════════════════

export function generateMentorResponse(world: WorldModel): string {
  const phase = world.phase;
  const topic = world.topic;
  const thinkingCount = world.userThinking.length;

  // The LLM sees the full world via worldToLLMContext().
  // This mock simulates what a real LLM would produce.

  switch (phase) {
    case "warmup":
      return warmupResponse(world);
    case "understand":
      return understandResponse(world);
    case "debate":
      return debateResponse(world);
    case "conclude":
      return concludeResponse(world);
    default:
      return warmupResponse(world);
  }
}

function warmupResponse(w: WorldModel): string {
  const lines: string[] = [];

  // 1. Understanding — AI proposes its interpretation
  lines.push(`我理解你想讨论「${w.topic}」。`);
  lines.push("");
  lines.push(`让我先确认一下我的理解——你关注的不是表面现象，而是更深层的问题：为什么不同的 AI 产品在交互方式上出现了趋同。这不是一个关于"好不好"的判断，而是一个关于"为什么会这样"的追问。`);
  lines.push("");
  lines.push(`如果我的理解是对的，那我想先问一句：你自己有没有一个初步的猜测？哪怕只是一个直觉——你认为是技术原因更多，还是产品选择更多？`);

  return lines.join("\n");
}

function understandResponse(w: WorldModel): string {
  const lines: string[] = [];
  const lastThinking = w.userThinking[w.userThinking.length - 1] || w.topic;

  // 1. Confirm understanding
  lines.push(`好的，我听到你说${lastThinking.length > 20 ? `「${lastThinking.slice(0, 20)}…」` : `「${lastThinking}」`}。`);

  // 2. Add own analysis
  if (w.supportingEvidence.length >= 2) {
    const src = w.supportingEvidence.map(e => e.source).slice(0, 2).join("和");
    lines.push("");
    lines.push(`这个方向在${src}中也有讨论——这说明你的直觉不是孤立的。但我想提醒一点：这些来源虽然权威，但它们本身也受限于特定的分析框架。`);
  }

  // 3. Push forward
  lines.push("");
  lines.push(`我现在的判断是：我们还没有触及问题的核心。我们讨论的是"现象"，但没有定义"成功的标准"——什么样的 AI 产品交互才算"不趋同"？如果没有这个标准，我们其实不知道自己在反对什么。`);
  lines.push("");
  lines.push(`你觉得呢？有没有一个你心目中"做得对"的产品？`);

  return lines.join("\n");
}

function debateResponse(w: WorldModel): string {
  const lines: string[] = [];
  const lastThinking = w.userThinking[w.userThinking.length - 1] || "";

  // 1. Acknowledge & challenge
  lines.push(`你说${lastThinking ? `「${lastThinking.slice(0, 25)}…」` : "的这个方向"}——这让我想到一个反例。`);

  // 2. Specific counter-evidence
  if (w.counterEvidence.length > 0) {
    const ce = w.counterEvidence[0];
    lines.push("");
    lines.push(`${ce.source} 提出了不同的解释：${ce.statement.slice(0, 60)}…`);
    lines.push("");
    lines.push(`如果这个解释是对的，那你的推论需要调整。但也许这两个解释并不矛盾——也许它们描述的是同一个问题的不同层面。`);
  } else if (w.supportingEvidence.length >= 3) {
    lines.push("");
    lines.push(`目前我看到了${w.supportingEvidence.length}个支持性来源，但这里面有一个问题：它们都来自同一个视角。我缺少来自对立面的声音。`);
  }

  // 3. Push toward resolution
  lines.push("");
  if (w.unknowns.length > 0) {
    lines.push(`我们目前最不确定的是：${w.unknowns[0]}。如果能把这个问题搞清楚，讨论会前进一大步。`);
  }

  // 4. Wait for correction
  lines.push("");
  lines.push(`如果我理解得不对，请纠正我。这不是辩论比赛——我们的目标是找到更准确的理解，不是分出对错。`);

  return lines.join("\n");
}

function concludeResponse(w: WorldModel): string {
  const lines: string[] = [];

  lines.push(`我觉得我们已经讨论得比较充分了。让我试着总结一下我们目前形成的理解：`);
  lines.push("");

  // Summarize the mental model
  if (w.userThinking.length >= 2) {
    lines.push(`你的核心关注点是：${w.userThinking[0]}`);
    if (w.userThinking.length >= 3) {
      lines.push(`经过讨论，这个关注点已经深化为：${w.userThinking[w.userThinking.length - 1]}`);
    }
  }

  if (w.discoveries.length > 0) {
    lines.push("");
    lines.push(`讨论中的关键发现：`);
    for (const d of w.discoveries.slice(0, 3)) {
      lines.push(`- ${d}`);
    }
  }

  if (w.unknowns.length > 0) {
    lines.push("");
    lines.push(`仍然不清楚的问题：`);
    for (const u of w.unknowns.slice(0, 2)) {
      lines.push(`- ${u}`);
    }
  }

  lines.push("");
  lines.push(`我的建议是：现在可以开始组织这些想法了。如果你觉得准备好了，我们可以进入大纲阶段。`);
  lines.push("");
  lines.push(`当然，如果你觉得还有遗漏，我们可以继续。决定权在你。`);

  return lines.join("\n");
}
