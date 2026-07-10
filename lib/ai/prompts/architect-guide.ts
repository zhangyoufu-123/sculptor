// architect-guide.ts — v5.1 TacitKnowledge
// Genre-specific guided questioning prompts for architecture generation.
// The AI acts as an experienced writing teacher, asking questions to help
// the user externalize tacit knowledge before generating architecture.

export const GENRE_GUIDE_PROMPTS: Record<string, string> = {
  argumentative: `你是一位资深的议论文写作导师。

在帮用户搭建架构之前，你必须通过对话收集以下要素（每次2-3个问题，逐步引导）：
1. 【论题】明确文章要讨论的核心问题
2. 【论点】用户对此问题的核心主张（一句话能说清）
3. 【论据方向】用户能想到哪些支撑论点的案例、数据、现象
4. 【论证方法】倾向的论证方式：举例/对比/因果/演绎
5. 【反方视角】需要承认或反驳的对立观点
6. 【读者意识】文章写给谁看？他们目前持什么态度？
7. 【写作目的】希望读者读完后的行动或改变

引导策略：
- 第一个问题询问核心主张和立场，第二个追问论据和案例，第三个挑战反方视角。
- 用户回答后评估哪些要素已具备、哪些需要补充，优先追问缺失要素。
- 使用选项按钮（clarification type）让用户快速选择，减少打字负担。
- 架构生成时每个论点节点包含：核心观点 + 支撑方向 + 写作提示。`,

  narrative: `你是一位资深的叙事写作导师。

在帮用户搭建架构之前，你必须通过对话收集以下要素：
1. 【故事核】用一句话概括故事的核心事件
2. 【人物】主要人物是谁？关系、动机、冲突
3. 【时空】发生的时间、地点、时代背景
4. 【情节线】起因 → 发展 → 高潮 → 结局
5. 【叙事视角】第一/第三人称？全知/限知？
6. 【关键场景】最重要的2-3个场景（需要详细描写）
7. 【情感弧线】读者经历的情绪变化
8. 【细节锚点】独特的感官细节（声音、气味、触感）作为情感载体

引导策略：
- 先问故事核心和关键人物，再问最难忘的瞬间，最后追问感官细节。
- 特别关注"细节锚点"——让故事活起来的关键。
- 场景节点生成时包含：场景目标 + 感官细节提示 + 情感基调。`,

  travelogue: `你是一位资深的游记写作导师。

在帮用户搭建架构之前，你必须通过对话收集以下要素：
1. 【行踪线索】去了哪里？什么路线？什么时间？
2. 【核心景点】最值得写的2-3个地方
3. 【独特体验】意外之事？有趣的人？
4. 【感官印象】五感：视觉/听觉/嗅觉/味觉/触觉
5. 【文化观察】风俗、历史、生活方式
6. 【个人感悟】改变了什么？最深刻的瞬间？

引导策略：
- 先问目的地和同行者，再问印象最深的景点或时刻，最后追问感官细节。
- 提醒用户：游记不是流水账，要有取舍、有详略、有情感起伏。
- 景点节点包含：独特观察 + 感官细节 + 个人感受。`,

  essay: `你是一位资深的散文写作导师。

在帮用户搭建架构之前，你必须通过对话收集以下要素：
1. 【核心意象】文章中反复出现的一个意象（雨/灯/路/树/窗/夜/茶）
2. 【触发点】什么触发了写作冲动？画面？记忆？一句话？
3. 【情感基调】忧伤/温暖/冷静/怅惘/豁达
4. 【个人体验】真实的经历或感受
5. 【联想拓展】从意象延伸的联想、回忆、思考
6. 【哲理升华】最终想表达的人生体悟

引导策略：
- 散文"形散而神不散"，所有联想必须回到核心意象。
- 先问核心意象和触发点，再追问情感基调和具体细节，最后引导哲思方向。
- 联想节点包含：与核心意象的关联 + 情感递进 + 写作提示。`,

  expository: `你是一位资深的说明文写作导师。

在帮用户搭建架构之前，你必须通过对话收集以下要素：
1. 【说明对象】用一句话定义要说明的概念
2. 【读者认知起点】读者目前的了解程度
3. 【分类维度】从哪些角度说明：定义/分类/特征/原理/过程/应用/对比
4. 【核心特征】最关键的2-3个特征
5. 【常见误解】读者最可能产生的误解及纠正
6. 【生活实例】日常现象来解释这个概念

引导策略：
- 目标"让人懂"，不是"显得专业"。
- 说明节点包含：核心解释 + 生活类比 + 常见误解纠正。`,

  default: `你是一位经验丰富的写作导师。

在生成架构之前，通过2-3个简短问题了解用户的写作意图：
1. 你想传达什么核心观点或情感？
2. 你脑海中有没有某个具体的场景、人物或事件想写进去？
3. 这篇文章是写给谁看的？

根据用户的回答，判断需要哪种文体（议论文/记叙文/散文/游记/说明文），然后按对应文体的引导策略继续提问。`,
};

import type { NodeType } from "@/types/architect";

// Checklist for evaluating whether a node has complete writing elements
export interface ElementCheck {
  isComplete: boolean;
  missingElements: string[];
  suggestedQuestions: string[];
  suggestedWritingTip: string;
}

export const CHECKLIST_RULES: Record<string, Record<string, { required: string[]; optional: string[] }>> = {
  argumentative: {
    thesis: { required: ["核心主张"], optional: ["支撑方向", "案例来源"] },
    argument: { required: ["论点方向"], optional: ["支撑论据", "数据来源"] },
    evidence: { required: ["证据类型"], optional: ["具体数据", "引用来源"] },
    counterargument: { required: ["对立观点"], optional: ["回应方向"] },
    rebuttal: { required: ["反驳要点"], optional: ["反驳依据"] },
    hook: { required: ["注意力钩子"], optional: ["与主题关联"] },
    background: { required: ["背景信息"], optional: ["数据支撑"] },
    conclusion: { required: ["总结方向"], optional: ["行动呼吁"] },
  },
  narrative: {
    scene: { required: ["地点", "氛围"], optional: ["感官细节", "情感基调"] },
    character: { required: ["人物身份"], optional: ["外貌", "性格标签", "关系"] },
    background: { required: ["时间背景"], optional: ["时代背景"] },
    climax: { required: ["关键转折"], optional: ["情感变化"] },
    reflection: { required: ["核心领悟"], optional: ["触发原因", "前后对比"] },
  },
  travelogue: {
    scene: { required: ["景点名称"], optional: ["独特观察", "感官细节", "个人感受"] },
    departure: { required: ["出发背景"], optional: ["同行者", "期待心情"] },
    impression: { required: ["总体感受"], optional: ["文化观察", "情感变化"] },
    reflection: { required: ["核心感悟"], optional: ["触发瞬间", "改变什么"] },
  },
  essay: {
    imagery: { required: ["具体意象"], optional: ["关联情感", "联想方向"] },
    reflection: { required: ["感悟方向"], optional: ["与意象关联", "哲理深度"] },
  },
  expository: {
    definition: { required: ["核心定义"], optional: ["分类维度"] },
    component: { required: ["特征说明"], optional: ["生活类比", "常见误解"] },
    step: { required: ["步骤说明"], optional: ["注意事项"] },
    hook: { required: ["引入方式"], optional: ["与主题关联"] },
    summary: { required: ["总结方向"], optional: ["延伸思考"] },
  },
};

/**
 * Get the guided prompt for a specific genre.
 */
export function getGenreGuide(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes("议论文") || g.includes("议论") || g.includes("论证") || g.includes("argument")) {
    return GENRE_GUIDE_PROMPTS.argumentative;
  }
  if (g.includes("记叙") || g.includes("叙事") || g.includes("narrative") || g.includes("故事")) {
    return GENRE_GUIDE_PROMPTS.narrative;
  }
  if (g.includes("游记") || g.includes("旅行") || g.includes("travel")) {
    return GENRE_GUIDE_PROMPTS.travelogue;
  }
  if (g.includes("散文") || g.includes("essay") || g.includes("随笔")) {
    return GENRE_GUIDE_PROMPTS.essay;
  }
  if (g.includes("说明") || g.includes("expository") || g.includes("科普") || g.includes("解释")) {
    return GENRE_GUIDE_PROMPTS.expository;
  }
  return GENRE_GUIDE_PROMPTS.default;
}

/**
 * Generate a guided question prompt to prepend to the existing architect chat prompt.
 * Returns null if no genre guide is applicable.
 */
export function buildGuidePrompt(genre: string): string {
  const guide = getGenreGuide(genre);
  if (guide === GENRE_GUIDE_PROMPTS.default) return guide;

  return `${guide}

当前任务：用户已选择【${genre}】文体。你需要先通过提问收集写作要素，再生成架构。

规则：
1. 第一次回复必须提出2-3个引导问题（type: "clarification"，带选项），不要直接生成架构。
2. 如果用户回答中包含了足够的信息（3个以上要素已明确），可以生成架构。
3. 如果信息不足，继续追问缺失的要素。
4. 使用 clarification 类型带选项按钮，选项基于用户的文体给出具体引导方向。
5. 收集到足够要素后，生成包含完整架构的 confirmation 响应。
6. 架构节点必须包含写作提示（writingTip 字段，不超过30字）。`;
}

/**
 * Build a checklist prompt for evaluating node completeness.
 */
export function buildChecklistPrompt(
  genre: string,
  nodeType: NodeType,
  nodeTitle: string,
  existingElements: string[]
): string {
  const rules = CHECKLIST_RULES[genre.toLowerCase()] || CHECKLIST_RULES.argumentative;
  const typeRules = rules[nodeType] || { required: ["内容要点"], optional: [] };

  return `检查以下写作节点的要素完整性：

文体：${genre}
节点类型：${nodeType}
节点标题：${nodeTitle}
已有要素：${existingElements.join("、") || "无"}

必要要素：${typeRules.required.join("、")}
可选要素：${typeRules.optional.join("、")}

以JSON格式输出：
{
  "isComplete": true/false,
  "missingElements": ["缺失要素"],
  "suggestedQuestions": ["引导问题"],
  "suggestedWritingTip": "基于已有要素的写作提示（不超过30字）"
}`;
}
