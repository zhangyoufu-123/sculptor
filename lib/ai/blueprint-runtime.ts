/**
 * Blueprint Runtime v2 — LLM never decides. Runtime decides.
 *
 * Architecture: User → Blueprint → Runtime → LLM → Update Blueprint → Repeat
 * Each slot has: label, value, confidence (0-1), status (empty/filling/stable)
 */

import { createClient } from "../deepseek";
import { isMockMode } from "./mock-responses";

// ═══════════════════════════════════════════════════════════════
// Blueprint — the single source of truth
// ═══════════════════════════════════════════════════════════════

export interface BlueprintSlot {
  key: string;
  label: string;
  value: string;
  confidence: number;   // 0-1
  status: "empty" | "filling" | "stable";
  requiredForOutline: boolean;
}

export interface Blueprint {
  title: string;
  genre: string;
  slots: BlueprintSlot[];
  completeness: number;  // 0-100
  outlineReady: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Genre-specific Blueprint templates
// ═══════════════════════════════════════════════════════════════

const GENRE_TEMPLATES: Record<string, string[]> = {
  "散文": ["核心意象", "触发场景", "感官细节", "情感转折", "联想展开", "结尾感悟"],
  "议论文": ["核心论题", "立场声明", "论证角度", "关键论据", "反方观点", "结论"],
  "记叙文": ["主要人物", "时间地点", "起因", "经过", "高潮", "结局"],
  "游记": ["目的地", "第一印象", "意外发现", "感官描写", "情感变化", "回望感悟"],
  "小说": ["人物设定", "关系网络", "核心冲突", "世界观", "高潮设计", "结尾收束"],
  "论文": ["研究问题", "文献缺口", "方法论", "核心发现", "讨论分析", "研究局限", "结论贡献"],
  "公众号": ["切入点", "共鸣场景", "核心观点", "金句", "行动建议"],
  "视频文案": ["钩子", "问题", "方案", "证据", "CTA"],
  "演讲": ["开场Hook", "核心信息", "故事案例", "情感高潮", "行动号召"],
  "日记": ["今日瞬间", "细节描写", "内心感受", "反思追问"],
  "评论": ["被评对象", "核心判断", "支撑证据", "独特视角", "总结评价"],
  "教程": ["目标人群", "前置知识", "核心概念", "步骤拆解", "常见错误"],
  "产品文案": ["目标用户", "痛点", "解决方案", "独特卖点", "CTA"],
  "诗歌": ["核心意象", "情感基调", "韵律结构", "转折点"],
  "求职": ["目标岗位", "核心优势", "关键经历", "量化成果", "匹配理由"],
  "致辞": ["场合", "与听众关系", "核心情感", "故事回忆", "祝福收尾"],
  "新媒体": ["目标人群", "内容定位", "独特角度", "互动设计"],
  "哲学随笔": ["核心概念", "概念界定", "逻辑展开", "反例检验", "收束"],
};

// ═══════════════════════════════════════════════════════════════
// Blueprint Factory
// ═══════════════════════════════════════════════════════════════

export function createBlueprint(anchor: string, genre: string = "议论文"): Blueprint {
  const labels = GENRE_TEMPLATES[genre] || GENRE_TEMPLATES["议论文"];
  const slots: BlueprintSlot[] = labels.map((label) => ({
    key: label,
    label,
    value: "",
    confidence: 0,
    status: "empty",
    requiredForOutline: true,
  }));

  return {
    title: anchor,
    genre,
    slots,
    completeness: 0,
    outlineReady: false,
  };
}

export function calculateCompleteness(bp: Blueprint): number {
  const filled = bp.slots.filter((s) => s.status === "stable").length;
  return Math.round((filled / bp.slots.length) * 100);
}

export function isOutlineReady(bp: Blueprint): boolean {
  const required = bp.slots.filter((s) => s.requiredForOutline);
  return required.every((s) => s.status === "stable" && s.confidence >= 0.7);
}

// ═══════════════════════════════════════════════════════════════
// Runtime: find gaps, assign tasks, never let LLM decide
// ═══════════════════════════════════════════════════════════════

export interface RuntimeTask {
  type: "fill_slot" | "deepen_slot" | "confirm_slot" | "outline" | "welcome";
  slot?: BlueprintSlot;
  instruction: string;
  context: string;
}

/**
 * The Runtime's main loop — find the next gap and assign a task.
 * LLM never decides what to do. Runtime decides.
 */
export function findNextTask(bp: Blueprint, lastUserInput: string = ""): RuntimeTask {
  // 1. No stable slots at all → welcome
  const stableSlots = bp.slots.filter((s) => s.status === "stable");
  if (stableSlots.length === 0 && bp.slots.every((s) => s.status === "empty")) {
    return {
      type: "welcome",
      instruction: "warm_intro",
      context: bp.title,
    };
  }

  // 2. Find the first empty slot
  const empty = bp.slots.find((s) => s.status === "empty");
  if (empty) {
    return {
      type: "fill_slot",
      slot: empty,
      instruction: `现在聚焦一个具体的话题：${empty.label}。围绕这个主题展开讨论，深挖细节。不要跳到其他话题。`,
      context: buildContext(bp, empty),
    };
  }

  // 3. Find slots being filled but not stable (confidence < 0.7)
  const filling = bp.slots.find((s) => s.status === "filling" && s.confidence < 0.7);
  if (filling) {
    return {
      type: "deepen_slot",
      slot: filling,
      instruction: `继续深挖「${filling.label}」。目前已经有一些内容（置信度 ${Math.round(filling.confidence * 100)}%），但还不够。追问具体细节：感官、情感、场景、数据。不要换话题。`,
      context: buildContext(bp, filling),
    };
  }

  // 4. Check if slots are filled but not confirmed
  const highConf = bp.slots.find((s) => s.status === "filling" && s.confidence >= 0.7);
  if (highConf) {
    return {
      type: "confirm_slot",
      slot: highConf,
      instruction: `确认「${highConf.label}」是否已经达到了你的预期。如果用户确认，这个部分就完成了，我们可以进入下一个。`,
      context: buildContext(bp, highConf),
    };
  }

  // 5. All required slots are stable → outline
  if (isOutlineReady(bp)) {
    return {
      type: "outline",
      instruction: "generate_outline",
      context: buildFullContext(bp),
    };
  }

  // Fallback
  return {
    type: "fill_slot",
    instruction: "continue_exploring",
    context: bp.title,
  };
}

function buildContext(bp: Blueprint, current: BlueprintSlot): string {
  const stable = bp.slots.filter((s) => s.status === "stable").map((s) => `✓ ${s.label}: ${s.value.slice(0, 50)}`).join("\n");
  return `正在构建的蓝图（${bp.genre}）
━━━━━━━━━━━━━
标题: ${bp.title}
完整度: ${calculateCompleteness(bp)}%

已完成的部分:
${stable || "(暂无)"}

当前聚焦: ${current.label}
已有内容: ${current.value || "(空)"}
置信度: ${Math.round(current.confidence * 100)}%`;
}

function buildFullContext(bp: Blueprint): string {
  return bp.slots.map((s) => `${s.status === "stable" ? "✓" : "✗"} ${s.label}: ${s.value || "(空)"} [${Math.round(s.confidence * 100)}%]`).join("\n");
}

// ═══════════════════════════════════════════════════════════════
// LLM Call — Runtime gives the task, LLM only expresses
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `你是 Sculptor 的 AI 写作搭档。你的角色不是"聊天机器人"，而是"帮助用户把一篇文章建造出来的协作伙伴"。

核心原则：
1. Runtime 会告诉你当前的任务（fill_slot / deepen_slot / confirm_slot / outline / welcome）
2. 你只执行这个任务，不偏离，不跳跃
3. 一次只深挖一个主题。在你确认这个主题已经充分讨论之前，不要切换到下一个
4. 追问具体细节：感官（看到了什么？听到了什么？）、情感（那一刻什么感受？）、时空（什么时候？哪里？）
5. 语言温暖、有陪伴感。像朋友聊写作，不像客服问问题
6. 回复控制在 150 字以内，简洁有力量`;

export async function executeBlueprintTask(task: RuntimeTask): Promise<string> {
  if (isMockMode()) return mockTaskResponse(task);

  const client = createClient();

  const userContent = `任务类型: ${task.type}
${task.instruction}

${task.context}

请基于以上任务生成回复。只执行这个任务，不要做其他事情。`;

  const response = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.7,
    max_tokens: 400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  return response.choices[0]?.message?.content || mockTaskResponse(task);
}

function mockTaskResponse(task: RuntimeTask): string {
  if (task.type === "welcome") {
    return `你好，我是 Sculptor 的写作搭档。我们可以一起把"${task.context}"慢慢展开。\n\n先从最打动你的一个画面开始吧——不用完整，一个细节就够了。`;
  }
  if (task.type === "fill_slot" && task.slot) {
    return `我们来聊聊「${task.slot.label}」。关于这个部分，你现在脑子里有什么画面或者想法吗？不用完整，随便说说就好。`;
  }
  if (task.type === "deepen_slot" && task.slot) {
    return `关于「${task.slot.label}」，你刚才说的很有画面感。能不能再细一点——那个场景里，你还记得什么声音或者气味吗？`;
  }
  if (task.type === "confirm_slot" && task.slot) {
    return `「${task.slot.label}」这部分，你现在觉得满意了吗？如果觉得差不多了，我们就进入下一个部分。`;
  }
  if (task.type === "outline") {
    return `所有部分都完成了！我来整理一下完整的框架——你可以在右侧看到蓝图展开成大纲。`;
  }
  return "我们继续吧——你现在最想聊哪个部分？";
}

// ═══════════════════════════════════════════════════════════════
// Slot Update — after user responds, update blueprint
// ═══════════════════════════════════════════════════════════════

export function updateSlot(bp: Blueprint, slotKey: string, userInput: string): Blueprint {
  const slot = bp.slots.find((s) => s.key === slotKey);
  if (!slot) return bp;

  // Append user input to slot value
  const newValue = slot.value ? `${slot.value}\n${userInput}` : userInput;

  // Calculate confidence based on input length and specificity
  const hasDetail = userInput.length > 30;
  const hasSensory = /看到|听到|闻到|感觉到|味道|声音|颜色|光/.test(userInput);
  const hasEmotion = /开心|难过|感动|震撼|安静|紧张|放松|温暖|冷/.test(userInput);
  const baseConf = hasDetail ? 0.5 : 0.2;
  const detailBonus = (hasSensory ? 0.2 : 0) + (hasEmotion ? 0.15 : 0);
  const confidence = Math.min(1, baseConf + detailBonus);

  const newSlots = bp.slots.map((s) =>
    s.key === slotKey
      ? {
          ...s,
          value: newValue,
          confidence,
          status: confidence >= 0.7 ? ("stable" as const) : ("filling" as const),
        }
      : s
  );

  return {
    ...bp,
    slots: newSlots,
    completeness: calculateCompleteness({ ...bp, slots: newSlots }),
    outlineReady: isOutlineReady({ ...bp, slots: newSlots }),
  };
}

/**
 * Confirm a slot — user says it's good, mark as stable regardless of auto-confidence
 */
export function confirmSlot(bp: Blueprint, slotKey: string): Blueprint {
  const newSlots = bp.slots.map((s) =>
    s.key === slotKey ? { ...s, confidence: 1, status: "stable" as const } : s
  );
  return {
    ...bp,
    slots: newSlots,
    completeness: calculateCompleteness({ ...bp, slots: newSlots }),
    outlineReady: isOutlineReady({ ...bp, slots: newSlots }),
  };
}
