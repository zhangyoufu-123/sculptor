/**
 * Runtime v3 — The Brain. LLM is just the CPU.
 *
 * Architecture: parse → understand → missing → think → update → output
 * State > History. Move > Answer. Writing > Chat. Delivery > Generation.
 */

import { createClient } from "../deepseek";
import { isMockMode } from "./mock-responses";

// ═══════════════════════════════════════════════════════════════
// State — the single source of truth, NOT history
// ═══════════════════════════════════════════════════════════════

export interface RuntimeState {
  goal: string;
  genre: string;
  blueprint: BlueprintSlot[];
  currentStep: "parse" | "understand" | "missing" | "think" | "update" | "output";
  completeness: number;
  outline: string[];
  outputReady: boolean;
  round: number;
  wasReset: boolean;
}

export interface BlueprintSlot {
  key: string;
  label: string;
  value: string;
  confidence: number;
  status: "empty" | "filling" | "stable";
}

// ═══════════════════════════════════════════════════════════════
// Genre → Blueprint mapping
// ═══════════════════════════════════════════════════════════════

const GENRE_SLOTS: Record<string, string[]> = {
  "议论文": ["核心论点", "论证角度", "关键论据", "反方观点", "结论"],
  "散文": ["核心意象", "触发场景", "感官细节", "情感转折", "结尾感悟"],
  "游记": ["目的地", "意外发现", "感官描写", "情感变化", "回望"],
  "小说": ["人物", "冲突", "高潮", "世界观", "结局"],
  "论文": ["研究问题", "方法", "发现", "讨论", "局限", "贡献"],
  "公众号": ["切入点", "共鸣点", "核心观点", "金句", "CTA"],
  "视频文案": ["钩子", "问题", "方案", "证据", "CTA"],
  "日记": ["瞬间", "细节", "感受", "反思"],
  "演讲": ["开场Hook", "核心消息", "故事", "高潮", "号召"],
  "产品文案": ["痛点", "方案", "卖点", "证据", "CTA"],
  "教程": ["目标", "前置", "步骤", "常见错误"],
  "评论": ["对象", "判断", "论据", "独特视角"],
  "求职": ["岗位", "优势", "经历", "匹配"],
  "致辞": ["场合", "关系", "情感", "祝福"],
  "诗歌": ["意象", "情感", "节奏", "转折"],
  "故事": ["开头", "发展", "转折", "高潮", "结局"],
  "报告": ["背景", "数据", "分析", "建议"],
  "广告": ["人群", "痛点", "方案", "CTA"],
};

// ═══════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════

export function initState(anchor: string, genre?: string): RuntimeState {
  const g = genre || detectGenre(anchor);
  const labels = GENRE_SLOTS[g] || GENRE_SLOTS["议论文"];
  const slots: BlueprintSlot[] = labels.map((label) => ({
    key: label, label, value: "", confidence: 0, status: "empty",
  }));

  return {
    goal: anchor,
    genre: g,
    blueprint: slots,
    currentStep: "parse",
    completeness: 0,
    outline: [],
    outputReady: false,
    round: 0,
    wasReset: false,
  };
}

function detectGenre(input: string): string {
  const signals: [string, RegExp][] = [
    ["散文", /散文|回忆|故乡|院子|午后|季节|雨|雪/],
    ["游记", /游记|旅行|西藏|云南|海边|山上|途中/],
    ["小说", /小说|故事|角色|情节|虚构|科幻|悬疑/],
    ["论文", /论文|研究|文献|方法|数据|分析|结论/],
    ["公众号", /公众号|爆款|阅读量|涨粉|朋友圈/],
    ["视频文案", /视频|脚本|三分钟|短视频|抖音/],
    ["日记", /日记|今天|心情|记录|日常/],
    ["演讲", /演讲|Keynote|大会|致辞|发言/],
    ["产品文案", /文案|广告|推广|App|产品介绍/],
    ["教程", /教程|入门|怎么学|指南|新手/],
    ["求职", /简历|求职|面试|应聘|岗位/],
    ["评论", /评|影评|书评|观点|批判/],
    ["诗歌", /诗|诗歌|写诗|韵律/],
    ["致辞", /致辞|婚礼|毕业|典礼|悼词/],
    ["报告", /报告|报表|季度|分析|总结/],
  ];
  for (const [genre, pattern] of signals) {
    if (pattern.test(input)) return genre;
  }
  return "议论文";
}

// ═══════════════════════════════════════════════════════════════
// Runtime Loop — the engine
// ═══════════════════════════════════════════════════════════════

export async function runtimeLoop(
  state: RuntimeState,
  userInput: string = ""
): Promise<{ response: string; state: RuntimeState }> {
  state.round += 1;

  // Step 1: Parse — understand what the user just said
  state = parseStep(state, userInput);

  // Step 2: Understand — what does this mean for the blueprint?
  state = understandStep(state);

  // Step 3: Missing — what's the biggest gap?
  const missing = findMissing(state);

  // Step 4: Think — what should happen next?
  const thought = thinkStep(state, missing);

  // Step 5: Update — apply changes to state
  state = updateStep(state, thought, userInput);

  // Step 6: Output — generate response
  const response = await outputStep(state, thought);

  return { response, state };
}

// ═══════════════════════════════════════════════════════════════
// Step 1: Parse
// ═══════════════════════════════════════════════════════════════

function parseStep(state: RuntimeState, input: string): RuntimeState {
  // Handle "开始写" / "可以写了" → trigger outline
  if (/开始写|可以写了|写吧|生成大纲|做大纲|出大纲/i.test(input)) {
    const anyFilling = state.blueprint.some((s) => s.status === "filling");
    if (anyFilling) {
      // Mark all filling slots as stable
      state.blueprint = state.blueprint.map((s) =>
        s.status === "filling" ? { ...s, confidence: 0.8, status: "stable" } : s
      );
    } else {
      // No filling slots — mark all non-empty slots as stable
      state.blueprint = state.blueprint.map((s) =>
        s.value.trim() ? { ...s, confidence: 0.8, status: "stable" } : s
      );
      // If still all empty, mark the first slot as stable with goal as value
      if (state.blueprint.every((s) => !s.value.trim())) {
        state.blueprint[0] = {
          ...state.blueprint[0],
          value: state.goal,
          confidence: 0.6,
          status: "stable",
        };
      }
    }
    state.outputReady = true;
    return state;
  }

  // Handle "说错了" / "不对" → reset current slot
  if (/说错了|不对|不是|搞错了|重新来|换一个方向/i.test(input)) {
    const activeIdx = state.blueprint.findIndex((s) => s.status === "filling");
    if (activeIdx >= 0) {
      state.blueprint[activeIdx] = {
        ...state.blueprint[activeIdx],
        value: "",
        confidence: 0,
        status: "empty",
      };
    }
    state.wasReset = true;
    return state;
  }

  // If user is confirming a slot
  if (input && /好了|可以了|没问题|满意|就这样|✓|ok/i.test(input)) {
    const activeIdx = state.blueprint.findIndex((s) => s.status === "filling");
    if (activeIdx >= 0) {
      const s = state.blueprint[activeIdx];
      state.blueprint[activeIdx] = { ...s, confidence: 1, status: "stable" };
    }
    return state;
  }

  // If user provided new content, merge into current filling slot
  if (input && !/好了|可以了|没问题|满意|就这样|✓|ok|说错了|不对|不是|开始写/i.test(input)) {
    const activeIdx = state.blueprint.findIndex((s) => s.status === "filling");
    if (activeIdx >= 0) {
      const s = state.blueprint[activeIdx];
      const newValue = s.value ? `${s.value}\n${input}` : input;
      const conf = calcConfidence(newValue);
      // Cap filling iterations: if still < 0.45 after 3+ inputs, mark as stable and move on
      const inputCount = newValue.split("\n").filter((l: string) => l.trim()).length;
      const forceStable = inputCount >= 3 && conf < 0.5;
      state.blueprint[activeIdx] = {
        ...s, value: newValue, confidence: forceStable ? 0.65 : conf,
        status: conf >= 0.6 || forceStable ? "stable" : "filling",
      };
    }
    // If no slot is filling, start the first empty slot
    else {
      const emptyIdx = state.blueprint.findIndex((s) => s.status === "empty");
      if (emptyIdx >= 0) {
        const s = state.blueprint[emptyIdx];
        const conf = calcConfidence(input);
        state.blueprint[emptyIdx] = {
          ...s, value: input, confidence: conf,
          status: conf >= 0.6 ? "stable" : "filling",
        };
      }
    }
  }

  return state;
}

function calcConfidence(text: string): number {
  let score = 0.4;  // raised base
  if (text.length > 20) score += 0.1;
  if (text.length > 60) score += 0.1;
  if (/看到|听到|闻到|感觉到|味道|声音|颜色|光/.test(text)) score += 0.1;
  if (/开心|难过|感动|震撼|安静|紧张|放松|温暖|冷|害怕|孤独/.test(text)) score += 0.1;
  if (/因为|所以|因此|但是|然而|不过|觉得|认为/.test(text)) score += 0.15;
  if (/\d+/.test(text)) score += 0.1;
  if (text.includes("互联网") || text.includes("社交") || text.includes("手机")) score += 0.05;
  return Math.min(1, score);
}

// ═══════════════════════════════════════════════════════════════
// Step 2: Understand
// ═══════════════════════════════════════════════════════════════

function understandStep(state: RuntimeState): RuntimeState {
  const stable = state.blueprint.filter((s) => s.status === "stable").length;
  const total = state.blueprint.length;
  state.completeness = total > 0 ? Math.round((stable / total) * 100) : 0;
  // Don't overwrite outputReady if already set by parseStep
  if (!state.outputReady) {
    state.outputReady = stable >= total;
  }
  return state;
}

// ═══════════════════════════════════════════════════════════════
// Step 3: Missing — find the biggest gap
// ═══════════════════════════════════════════════════════════════

type GapType = "welcome" | "fill_new" | "deepen" | "confirm" | "output";

function findMissing(state: RuntimeState): { type: GapType; slot?: BlueprintSlot; idx: number } {
  // outputReady overrides everything
  if (state.outputReady) {
    return { type: "output", idx: -1 };
  }
  const stableCount = state.blueprint.filter((s) => s.status === "stable").length;

  // No stable slots → welcome
  if (stableCount === 0 && state.blueprint.every((s) => s.status === "empty")) {
    return { type: "welcome", idx: -1 };
  }

  // All stable → output
  const allStable = state.blueprint.every((s) => s.status === "stable");
  if (allStable) {
    return { type: "output", idx: -1 };
  }

  // Deepen current filling slot if confidence < 0.6
  const fillingIdx = state.blueprint.findIndex(
    (s) => s.status === "filling" && s.confidence < 0.6
  );
  if (fillingIdx >= 0) {
    return { type: "deepen", slot: state.blueprint[fillingIdx], idx: fillingIdx };
  }

  // Confirm filling slot if confidence >= 0.6
  const highIdx = state.blueprint.findIndex(
    (s) => s.status === "filling" && s.confidence >= 0.6
  );
  if (highIdx >= 0) {
    return { type: "confirm", slot: state.blueprint[highIdx], idx: highIdx };
  }

  // Fill next empty slot
  const emptyIdx = state.blueprint.findIndex((s) => s.status === "empty");
  if (emptyIdx >= 0) {
    return { type: "fill_new", slot: state.blueprint[emptyIdx], idx: emptyIdx };
  }

  return { type: "welcome", idx: -1 };
}

// ═══════════════════════════════════════════════════════════════
// Step 4: Think — decide what to say
// ═══════════════════════════════════════════════════════════════

function thinkStep(state: RuntimeState, gap: ReturnType<typeof findMissing>): string {
  const stableList = state.blueprint
    .filter((s) => s.status === "stable")
    .map((s) => `✓ ${s.label}`)
    .join(", ");

  const context = `写作蓝图（${state.genre}）
━━━━━━━━━━━━━
目标: ${state.goal}
第${state.round}轮
完成度: ${state.completeness}%
已完成: ${stableList || "无"}

`;

  // Handle reset scenario
  if (state.wasReset) {
    return context + `用户刚才说"说错了"——这说明之前的理解不对。这是好事。先确认用户现在想往哪个方向走。不要说"没关系"或道歉，直接问新的方向。120字以内。`;
  }

  // Handle "开始写" scenario
  if (state.outputReady) {
    const allSlots = state.blueprint.map((s) => `${s.status === "stable" ? "✓" : "○"} ${s.label}: ${s.value.slice(0, 40)}`).join("\n");
    return `所有部分已完成。以下是写作蓝图：\n${allSlots}\n\n现在生成大纲并引导用户进入写作。恭喜用户。120字以内。`;
  }

  switch (gap.type) {
    case "welcome":
      return context + `这是第一轮。欢迎用户，用一句话描述你想帮TA做什么。然后问TA脑海中最先浮现的一个画面或想法。150字以内。`;

    case "fill_new":
      return context + `现在聚焦「${gap.slot!.label}」。先确认用户对这个部分有没有初步想法。如果有，就深入追问。如果没有，用一个具体的角度引导。不要跳到其他话题。150字以内。`;

    case "deepen":
      return context + `继续深挖「${gap.slot!.label}」。目前内容: "${gap.slot!.value.slice(0, 80)}..."。追问具体细节：感官、情感、场景、数据。不要换话题。不要满意于概括性回答。120字以内。`;

    case "confirm":
      return context + `「${gap.slot!.label}」看起来已经有足够内容（置信度 ${Math.round(gap.slot!.confidence * 100)}%）。问用户是否满意，要不要进入下一个部分。100字以内。`;

    case "output":
      const allSlots = state.blueprint.map((s) => `${s.status === "stable" ? "✓" : "○"} ${s.label}: ${s.value.slice(0, 40) || "(空)"}`).join("\n");
      return `【任务：生成大纲，不要提问】

文章架构已经准备好了。以下是写作蓝图：

${allSlots}

请恭喜用户，展示蓝图，并建议点击"生成大纲"开始写作。
不要问任何新问题。直接呈现结果。120字以内。`;
  }
}

// ═══════════════════════════════════════════════════════════════
// Step 5: Update (handled in parseStep above)
// ═══════════════════════════════════════════════════════════════

function updateStep(state: RuntimeState, _thought: string, _input: string): RuntimeState {
  // Parse already updated. Just refresh completeness.
  return understandStep(state);
}

// ═══════════════════════════════════════════════════════════════
// Step 6: Output — generate response via LLM
// ═══════════════════════════════════════════════════════════════

const OUTPUT_PROMPT = `你是 Sculptor 的写作搭档。你的角色不是聊天机器人，而是帮助用户把一篇文章建造出来的协作者。

核心原则：
1. Runtime 会告诉你当前的任务和上下文。你只执行这个任务。
2. 一次只深挖一个主题。不要跳跃。
3. 追问具体细节：感官、情感、场景、数据。
4. 语言温暖、简洁、有陪伴感。像朋友聊写作。
5. 回复控制在 150 字以内。`;

async function outputStep(state: RuntimeState, thought: string): Promise<string> {
  if (isMockMode()) return mockOutput(state);

  const client = createClient();

  // Output mode: use strict instructions, low temperature
  if (state.outputReady) {
    const response = await client.chat.completions.create({
      model: "deepseek-v4-pro",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: "system", content: "你正在协助用户完成写作大纲。不要提问。不要反问。不要建议后续步骤。只呈现现有成果。" },
        { role: "user", content: thought },
      ],
    });
    return response.choices[0]?.message?.content || mockOutput(state);
  }
  const response = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.7,
    max_tokens: 400,
    messages: [
      { role: "system", content: OUTPUT_PROMPT },
      { role: "user", content: thought },
    ],
  });

  return response.choices[0]?.message?.content || mockOutput(state);
}

function mockOutput(state: RuntimeState): string {
  if (state.outputReady) {
    return `恭喜！你的写作蓝图已经完成。\n\n${state.blueprint.map((s) => `✓ ${s.label}: ${s.value.slice(0, 50) || "(待补充)"}`).join("\n")}\n\n所有部分就绪——现在就可以生成大纲开始写作了。`;
  }
  if (state.completeness === 0) {
    return `你好，我是 Sculptor 的写作搭档。我们可以一起把「${state.goal}」慢慢展开。\n\n不用想太多——你现在脑海里最先浮现的一个画面、一句话或者一个疑问是什么？`;
  }
  const next = state.blueprint.find((s) => s.status === "filling" || s.status === "empty");
  if (next) {
    return `我们来聊聊「${next.label}」。关于这个部分，你有什么直觉或想法吗？不用完整，随便说说就好。`;
  }
  if (state.completeness === 100) {
    return `太棒了！所有部分都完成了。你的写作蓝图已经100%就绪——可以生成大纲开始写作了！`;
  }
  return `我们继续——你现在感觉哪个部分最有话说？`;
}
