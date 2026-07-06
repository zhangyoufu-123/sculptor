// lib/ai/instruction-rewriter.ts
import type {
  ContextPackage,
  IntentAnalysis,
  StyleConstraints,
  RelevantMaterial,
} from "@/types/editor";

interface FinalPrompt {
  systemPrompt: string;
  userMessage: string;
}

const DE_AI_TONE = `CRITICAL: Never use templated AI language. Banned phrases:
- "首先", "其次", "再次", "最后", "综上所述", "总而言之"
- "值得注意的是", "不可否认", "毋庸置疑"
- "在这个意义上", "从某种角度来说"
Write as a human writer would — organic, varied, alive.`;

export function buildFinalPrompt(
  ctx: ContextPackage,
  intent: IntentAnalysis,
  style: StyleConstraints,
  materials: RelevantMaterial[]
): FinalPrompt {
  const systemParts: string[] = [
    "You are a writing companion inside Sculptor, an AI-enhanced editor.",
    "",
    `Genre: ${intent.genre}. Function: ${intent.function}. Emotion: ${intent.emotion}. Pace: ${intent.pace}.`,
    "",
    "Style requirements:",
    `- Tone: ${style.toneProfile}`,
    `- Target sentence length: ~${style.avgSentenceLength} characters`,
    `- Formality: ${style.formality}`,
    style.activeImagery.length > 0
      ? `- Active imagery: ${style.activeImagery.join(", ")}`
      : "",
    "",
    DE_AI_TONE,
    "",
    "Respond in JSON format only:",
    '{"options":[{"text":"...","style_shift":"..."}]}',
    "3 options, meaningfully different in approach.",
    "Never use markdown, lists, or bullet points in the generated text.",
  ];

  // Relevant materials (for future deep retrieval)
  if (materials.length > 0) {
    systemParts.push("", "Reference materials (use for inspiration, do NOT copy):");
    for (const m of materials.slice(0, 3)) {
      systemParts.push(`- [${m.source}] ${m.snippet.slice(0, 200)}`);
    }
  }

  // Style observations
  if (style.observations.length > 0) {
    systemParts.push("", "Style observations:");
    for (const obs of style.observations) {
      systemParts.push(`- ${obs}`);
    }
  }

  // Context memory hints
  const rejectedPatterns = ctx.recentMemories
    ?.filter((m) => m.memoryType === "rejected_pattern")
    .slice(0, 3);

  if (rejectedPatterns && rejectedPatterns.length > 0) {
    systemParts.push("", "User's previously REJECTED patterns (DO NOT repeat):");
    for (const mem of rejectedPatterns) {
      const data = mem.memoryData as { pattern?: string };
      if (data.pattern) {
        systemParts.push(`- "${data.pattern.slice(0, 80)}"`);
      }
    }
  }

  // Build user message
  let userMessage = `Selected text:\n"""${ctx.currentText}"""`;

  if (ctx.userInstruction) {
    userMessage += `\n\nUser instruction: ${ctx.userInstruction}`;
  }

  const acceptedCount = ctx.recentFeedback.filter(
    (f) => f.action === "accept"
  ).length;
  const rejectedCount = ctx.recentFeedback.filter(
    (f) => f.action === "reject"
  ).length;
  if (acceptedCount + rejectedCount > 0) {
    userMessage += `\n\nRecent feedback: ${acceptedCount} accepted, ${rejectedCount} rejected.`;
  }

  return {
    systemPrompt: systemParts.filter((p) => p !== "").join("\n"),
    userMessage,
  };
}
