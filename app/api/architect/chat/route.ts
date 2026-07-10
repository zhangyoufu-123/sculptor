import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/deepseek";
import { getSupabase } from "@/lib/supabase";
import { isMockMode } from "@/lib/ai/mock-responses";
import { ARCHITECT_CHAT_SYSTEM_PROMPT, buildArchitectChatPrompt } from "@/lib/ai/prompts/architect-chat";
import { getRecentCanvasChanges, getUserPreferences } from "@/lib/ai/architect-memory";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── v5.3: Genre extraction ──────────────────────────────────

type Genre = "记叙文" | "说明文" | "散文" | "游记" | "议论文";

/** Extract genre from conversation history (first user message) */
function extractGenre(hist: { role: string; content: string }[]): Genre {
  for (const m of hist) {
    if (m.role !== "user") continue;
    const match = m.content.match(/^\[文体：(.+?)\]/);
    if (match) return match[1] as Genre;
    
    // Content-based genre detection (no prefix)
    const c = m.content;
    if (/故事|经历|回忆|那年|曾经|记得|小时候/.test(c)) return "记叙文";
    if (/解释|说明|为什么|什么是|原理|定义|概念|如何|怎么/.test(c)) return "说明文";
    if (/散文|随笔|感悟|心境|随笔|随想/.test(c)) return "散文";
    if (/游记|旅行|游记|之旅|景点|游|去了/.test(c)) return "游记";
  }
  return "议论文";
}

// ── v5.3: Topic extraction (genre-aware) ────────────────────

/** Strip common prefixes to extract the user's core topic */
function extractTopic(messages: string[], genre: Genre): string {
  for (const m of messages) {
    // Strip genre prefix first
    let cleaned = m.replace(/^\[文体：.+?\]\s*/, "");

    // Genre-specific prefix stripping
    switch (genre) {
      case "记叙文":
        cleaned = cleaned
          .replace(/^写一篇|^讲一个|^叙述|^记叙|^我想写|^我想/, "")
          .replace(/的故事|的往事|的经历/g, "")
          .trim();
        break;
      case "散文":
        cleaned = cleaned
          .replace(/^写一篇|^关于|^我想写|^我想|^抒发|^描绘/, "")
          .replace(/的散文|的随笔|的感悟$/g, "")
          .trim();
        break;
      case "游记":
        cleaned = cleaned
          .replace(/^写一篇|^关于|^我想写|^我想|^记录|^游/, "")
          .replace(/的游记|之旅|之行$/g, "")
          .trim();
        break;
      case "说明文":
        cleaned = cleaned
          .replace(/^说明|^介绍|^解释|^阐述|^我想写|^我想/, "")
          .replace(/的说明|的原理|的概念$/g, "")
          .trim();
        break;
      default: // 议论文
        cleaned = cleaned
          .replace(/^论证|^论述|^探讨|^分析|^关于|^谈谈|^我想写|^我想/, "")
          .replace(/的必要性|的意义|的重要性|的利弊|的影响$/g, "")
          .trim();
    }

    if (cleaned.length >= 2 && !/^可以了|^生成|^够了|^没问题|^开始/.test(cleaned)) {
      return cleaned;
    }
  }
  return messages[0]?.replace(/^\[文体：.+?\]\s*/, "").replace(/^论证|^论述|^探讨|^分析|^关于|^写一篇|^讲一个/, "").trim() || "这个话题";
}

/** Get all user answers from conversation history */
function getUserAnswers(hist: { role: string; content: string }[]): string[] {
  return hist.filter(m => m.role === "user").map(m => m.content);
}

// ── v5.3: Dynamic node factory ──────────────────────────────

function n(id: string, label: string, type: string, children: string[] = [], tip?: string) {
  return { id, label, type, children, writingTip: tip };
}

function q(label: string, value: string) {
  return { label, value };
}

// ── v5.3: Genre-aware node builders ─────────────────────────

interface DeepQuestionResult {
  type: string;
  message: string;
  options: { label: string; value: string }[];
  round: number;
  nodes: ReturnType<typeof n>[];
}

/** Build genre-specific nodes for each round */
function buildGenreNodes(round: number, topic: string, genre: Genre, _answers: string[]): ReturnType<typeof n>[] {
  switch (genre) {
    case "记叙文":
      return buildNarrativeNodes(round, topic);
    case "说明文":
      return buildExpositoryNodes(round, topic);
    case "散文":
      return buildEssayNodes(round, topic);
    case "游记":
      return buildTravelogueNodes(round, topic);
    default:
      return buildArgumentativeNodes(round, topic);
  }
}

// ── 记叙文 nodes: hook → scene → scene → climax → reflection

function buildNarrativeNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `开篇：引入${topic}的故事`, "hook", ["n2"], "用一个引人入胜的开头抓住读者，点出时间地点氛围"),
        n("n2", `场景展开：${topic}的时空背景`, "scene", ["n3"], "细腻描绘故事发生的时间、地点与环境氛围"),
        n("n3", `故事推进：${topic}的缘起`, "scene", ["n4"], "展开故事线索，铺垫即将到来的转折"),
      ];
    case 1:
      return [
        n("n4", `高潮：${topic}的核心事件`, "climax", ["n5"], "这是故事最关键的时刻——发生了什么？人物的反应是什么？"),
      ];
    case 2:
    default:
      return [
        n("n5", `尾声：${topic}留给我的思考`, "reflection", [], "从故事中提炼感悟，让读者带着余味离开"),
      ];
  }
}

// ── 说明文 nodes: hook → definition → component → component → step → summary

function buildExpositoryNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `引入：为什么需要了解${topic}？`, "hook", ["n2"], "用一个日常场景或问题引出要说明的概念"),
        n("n2", `定义：${topic}到底是什么？`, "definition", ["n3"], "用一句话概括核心定义，让读者建立初步印象"),
        n("n3", `拆解：${topic}的第一个关键要素`, "component", ["n4"], "将概念分解为可理解的组成部分"),
      ];
    case 1:
      return [
        n("n4", `深入：${topic}的第二个关键要素`, "component", ["n5"], "继续拆解，帮助读者建立系统认知"),
        n("n5", `操作：如何理解／应用${topic}？`, "step", ["n6"], "给出可操作的步骤或思维路径"),
      ];
    case 2:
    default:
      return [
        n("n6", `总结：${topic}的核心要点回顾`, "summary", [], "用精炼的语言归纳全文，强化读者记忆"),
      ];
  }
}

// ── 散文 nodes: hook → imagery → imagery → imagery → reflection

function buildEssayNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `起笔：${topic}的第一印象`, "hook", ["n2"], "用一个画面、声音或气味瞬间将读者带入情境"),
        n("n2", `意象一：${topic}中的核心画面`, "imagery", ["n3"], "选取一个具象的画面来承载你想表达的情感"),
        n("n3", `意象二：${topic}的延伸联想`, "imagery", ["n4"], "由核心画面自然联想，拓展意境层次"),
      ];
    case 1:
      return [
        n("n4", `意象三：${topic}的记忆深处`, "imagery", ["n5"], "挖掘与核心意象关联的个人记忆，注入真情实感"),
      ];
    case 2:
    default:
      return [
        n("n5", `收束：${topic}的哲思与感悟`, "reflection", [], "从具体意象升华到人生体悟，让文章有余韵"),
      ];
  }
}

// ── 游记 nodes: hook → departure → scene → scene → scene → impression → reflection

function buildTravelogueNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `启程：踏上${topic}的旅途`, "hook", ["n2"], "点明目的地与出发时的心情，营造期待感"),
        n("n2", `初抵：${topic}的第一印象`, "departure", ["n3"], "到达时的所见所感，环境与氛围的掠影"),
        n("n3", `游历：${topic}的第一个场景`, "scene", ["n4"], "选取一个代表性场景进行细致描写"),
      ];
    case 1:
      return [
        n("n4", `深入：${topic}的第二个场景`, "scene", ["n5"], "另一个视角或时间段的见闻"),
        n("n5", `高潮：${topic}最难忘的瞬间`, "scene", ["n6"], "旅途中最打动你的时刻——风景、人物或偶遇"),
      ];
    case 2:
    default:
      return [
        n("n6", `印记：${topic}留给我的印象`, "impression", ["n7"], "综合旅途体验，提炼最深刻的感受"),
        n("n7", `归途：${topic}之行带给我的思考`, "reflection", [], "从旅途回归日常，沉淀出的感悟与成长"),
      ];
  }
}

// ── 议论文 nodes: thesis → hook → background → argument → argument → counterargument → evidence → evidence → rebuttal → conclusion

function buildArgumentativeNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `论${topic}`, "thesis", ["n3", "n4"], "用一句鲜明论断提出你的核心观点"),
        n("n2", `当我们谈论${topic}时，我们在谈论什么？`, "hook", ["n3"], "用一个反问或设问引发读者思考"),
        n("n3", `什么是${topic}？`, "background", [], `简要介绍${topic}的背景与定义`),
        n("n4", `为什么${topic}如此重要？`, "argument", ["n7"], "展开第一个核心论据"),
      ];
    case 1:
      return [
        n("n5", `${topic}的深层逻辑`, "argument", ["n8"], "从第二个角度深化论证"),
        n("n6", `对${topic}的常见质疑`, "counterargument", ["n9"], "客观呈现反方的核心论据"),
        n("n7", `数据与研究：${topic}的事实基础`, "evidence", [], "引用研究数据支撑第一个论点"),
        n("n8", `案例分析：${topic}的现实映照`, "evidence", [], "用具体案例支撑第二个论点"),
      ];
    case 2:
    default:
      return [
        n("n9", `回应质疑：为什么${topic}仍然成立`, "rebuttal", ["n10"], "反驳对方论点，强化己方立场"),
        n("n10", `${topic}给我们的启示`, "conclusion", [], "总结全文，升华主题"),
      ];
  }
}

// ── v5.3: Genre-aware full architecture ─────────────────────

function buildFullArchitecture(topic: string, genre: Genre) {
  switch (genre) {
    case "记叙文":
      return {
        type: "confirmation",
        message: `已生成「${topic}」的叙事架构`,
        nodes: [
          n("n1", `开篇：引入${topic}的故事`, "hook", ["n2"], "用一个引人入胜的开头抓住读者，点出时间地点氛围"),
          n("n2", `场景展开：${topic}的时空背景`, "scene", ["n3"], "细腻描绘故事发生的时间、地点与环境氛围"),
          n("n3", `故事推进：${topic}的缘起`, "scene", ["n4"], "展开故事线索，铺垫即将到来的转折"),
          n("n4", `高潮：${topic}的核心事件`, "climax", ["n5"], "这是故事最关键的时刻——发生了什么？人物的反应是什么？"),
          n("n5", `尾声：${topic}留给我的思考`, "reflection", [], "从故事中提炼感悟，让读者带着余味离开"),
        ],
        edges: [],
        highlight_nodes: ["n4"],
        suggestion: { type: "missing_detail", message: `建议为「${topic}」的高潮部分补充更丰富的感官细节（声音、气味、触觉）`, node_id: "n4", auto_fix_available: true },
      };

    case "说明文":
      return {
        type: "confirmation",
        message: `已生成「${topic}」的说明架构`,
        nodes: [
          n("n1", `引入：为什么需要了解${topic}？`, "hook", ["n2"], "用一个日常场景或问题引出要说明的概念"),
          n("n2", `定义：${topic}到底是什么？`, "definition", ["n3"], "用一句话概括核心定义，让读者建立初步印象"),
          n("n3", `拆解：${topic}的第一个关键要素`, "component", ["n4"], "将概念分解为可理解的组成部分"),
          n("n4", `深入：${topic}的第二个关键要素`, "component", ["n5"], "继续拆解，帮助读者建立系统认知"),
          n("n5", `操作：如何理解／应用${topic}？`, "step", ["n6"], "给出可操作的步骤或思维路径"),
          n("n6", `总结：${topic}的核心要点回顾`, "summary", [], "用精炼的语言归纳全文，强化读者记忆"),
        ],
        edges: [],
        highlight_nodes: ["n5"],
        suggestion: { type: "missing_example", message: `建议为「${topic}」的操作步骤补充一个生动的类比或实例`, node_id: "n5", auto_fix_available: true },
      };

    case "散文":
      return {
        type: "confirmation",
        message: `已生成「${topic}」的散文架构`,
        nodes: [
          n("n1", `起笔：${topic}的第一印象`, "hook", ["n2"], "用一个画面、声音或气味瞬间将读者带入情境"),
          n("n2", `意象一：${topic}中的核心画面`, "imagery", ["n3"], "选取一个具象的画面来承载你想表达的情感"),
          n("n3", `意象二：${topic}的延伸联想`, "imagery", ["n4"], "由核心画面自然联想，拓展意境层次"),
          n("n4", `意象三：${topic}的记忆深处`, "imagery", ["n5"], "挖掘与核心意象关联的个人记忆，注入真情实感"),
          n("n5", `收束：${topic}的哲思与感悟`, "reflection", [], "从具体意象升华到人生体悟，让文章有余韵"),
        ],
        edges: [],
        highlight_nodes: ["n5"],
        suggestion: { type: "missing_detail", message: `建议在「${topic}」的收束部分加入一句具体的细节回忆，让感悟更有根基`, node_id: "n5", auto_fix_available: true },
      };

    case "游记":
      return {
        type: "confirmation",
        message: `已生成「${topic}」的游记架构`,
        nodes: [
          n("n1", `启程：踏上${topic}的旅途`, "hook", ["n2"], "点明目的地与出发时的心情，营造期待感"),
          n("n2", `初抵：${topic}的第一印象`, "departure", ["n3"], "到达时的所见所感，环境与氛围的掠影"),
          n("n3", `游历：${topic}的第一个场景`, "scene", ["n4"], "选取一个代表性场景进行细致描写"),
          n("n4", `深入：${topic}的第二个场景`, "scene", ["n5"], "另一个视角或时间段的见闻"),
          n("n5", `高潮：${topic}最难忘的瞬间`, "scene", ["n6"], "旅途中最打动你的时刻——风景、人物或偶遇"),
          n("n6", `印记：${topic}留给我的印象`, "impression", ["n7"], "综合旅途体验，提炼最深刻的感受"),
          n("n7", `归途：${topic}之行带给我的思考`, "reflection", [], "从旅途回归日常，沉淀出的感悟与成长"),
        ],
        edges: [],
        highlight_nodes: ["n5"],
        suggestion: { type: "missing_detail", message: `建议为「${topic}」最难忘的瞬间补充当时的天气、光线和声音`, node_id: "n5", auto_fix_available: true },
      };

    default: // 议论文
      return {
        type: "confirmation",
        message: `已生成「${topic}」的论证架构`,
        nodes: [
          n("n1", `论${topic}`, "thesis", ["n4", "n5"], "核心论点：用一句鲜明论断提出立场"),
          n("n2", `当我们谈论${topic}时，我们在谈论什么？`, "hook", ["n3"], "开篇钩子：引发读者兴趣"),
          n("n3", `${topic}的背景与现状`, "background", [], "交代背景：为什么这个话题值得讨论"),
          n("n4", `论点一：${topic}的第一个核心维度`, "argument", ["n7"], "展开第一个论证方向"),
          n("n5", `论点二：${topic}的深层逻辑`, "argument", ["n8"], "从另一个角度深化论证"),
          n("n6", `对${topic}的反方观点`, "counterargument", ["n9"], "客观呈现不同声音"),
          n("n7", `证据一：关于${topic}的数据与研究`, "evidence", [], "用事实数据支撑第一个论点"),
          n("n8", `证据二：${topic}的案例分析`, "evidence", [], "用具体案例支撑第二个论点"),
          n("n9", `回应质疑：为什么${topic}仍然成立`, "rebuttal", ["n10"], "反驳并强化己方立场"),
          n("n10", `结论：${topic}给我们的启示`, "conclusion", [], "总结升华，留下余韵"),
        ],
        edges: [],
        highlight_nodes: ["n4"],
        suggestion: { type: "missing_evidence", message: `建议为「${topic}」的第一个论点补充具体数据或案例`, node_id: "n4", auto_fix_available: true },
      };
  }
}

// ── v5.3: Genre-aware deep questioning ──────────────────────

function getDeepQuestion(
  round: number,
  message: string,
  hist: { role: string; content: string }[],
  genre: Genre,
): DeepQuestionResult {
  const topic = extractTopic(getUserAnswers(hist), genre);
  const answers = getUserAnswers(hist);

  switch (genre) {
    // ── 记叙文 ──────────────────────────────────────────────
    case "记叙文":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `好的，我们来构思「${topic}」这个故事。\n\n**第一个问题：这个故事发生在什么时间、什么地点？当时的氛围是怎样的？**`,
            options: [
              q("这是一个发生在特定年代的故事", "特定年代"),
              q("这是一个发生在特定地点的故事", "特定地点"),
              q("故事有独特的时间跨度（如一天、一年、一生）", "时间跨度"),
              q("故事的氛围感最重要（如怀旧、温馨、紧张）", "氛围优先"),
            ],
            round: 1,
            nodes: buildNarrativeNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `框架在成形。现在我想了解——\n\n**关于「${topic}」，故事的核心人物是谁？最关键的事件是什么？**`,
            options: [
              q("核心是人物性格的转变与成长", "人物成长"),
              q("核心是一个关键事件引发的连锁反应", "关键事件"),
              q("核心是人与人之间关系的演变", "关系演变"),
              q("核心是对一个瞬间的深度刻画", "瞬间刻画"),
            ],
            round: 2,
            nodes: buildNarrativeNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `故事骨架已经就位。最后一个问题——\n\n**关于「${topic}」，你想通过这个故事传达什么情感或思考？读者读完应该感受到什么？**`,
            options: [
              q("温暖治愈——让人感到生活的美好", "温暖治愈"),
              q("深刻反思——引发读者对某个问题的思考", "深刻反思"),
              q("感动共鸣——让读者想起自己的类似经历", "感动共鸣"),
              q("震撼警醒——让人重新审视某些习以为常的事", "震撼警醒"),
              q("✅ 可以了，生成完整架构", "生成架构"),
            ],
            round: 3,
            nodes: buildNarrativeNodes(2, topic),
          };
      }

    // ── 说明文 ──────────────────────────────────────────────
    case "说明文":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `好的，我们来拆解「${topic}」这个概念。\n\n**第一个问题：「${topic}」最核心的定义是什么？用一句话该怎么概括？**`,
            options: [
              q("它是一个需要精确定义的专业概念", "精确定义"),
              q("它是一个日常生活中常见但容易误解的事物", "常见误解"),
              q("它是一个需要从多个维度理解的现象", "多维概念"),
              q("它是一个过程或方法，需要按步骤说明", "过程方法"),
            ],
            round: 1,
            nodes: buildExpositoryNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `概念明确了。现在想想——\n\n**关于「${topic}」，你的读者是谁？你打算用什么方式让他们理解？**`,
            options: [
              q("读者完全不了解，需要用类比来解释", "零基础类比"),
              q("读者有了解但存在常见误区，需要纠偏", "纠偏澄清"),
              q("读者有一定基础，可以深入拆解机理", "深入机理"),
              q("用具体案例或生活场景来让抽象概念落地", "案例落地"),
            ],
            round: 2,
            nodes: buildExpositoryNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `逻辑链已经清晰。最后一个问题——\n\n**关于「${topic}」，你希望读者带走的最重要的一句话是什么？**`,
            options: [
              q("一个简洁有力的核心定义", "核心定义"),
              q("一个让人恍然大悟的类比", "关键类比"),
              q("一个可以马上用的方法或步骤", "实用方法"),
              q("对这个概念的全新认识视角", "新视角"),
              q("✅ 可以了，生成完整架构", "生成架构"),
            ],
            round: 3,
            nodes: buildExpositoryNodes(2, topic),
          };
      }

    // ── 散文 ────────────────────────────────────────────────
    case "散文":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `散文贵在真情。我们来寻找「${topic}」的内核。\n\n**第一个问题：提起「${topic}」，你脑海中浮现的第一个具体画面或意象是什么？**`,
            options: [
              q("浮现了一个具体的自然景物（如树、河、雨）", "自然意象"),
              q("浮现了一个具体的生活物件（如旧书、信、茶杯）", "生活意象"),
              q("浮现了一个人的身影或某个表情", "人物意象"),
              q("浮现了一种颜色、声音或气味的组合感受", "感官意象"),
            ],
            round: 1,
            nodes: buildEssayNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `意象在生长。现在往深处走——\n\n**关于「${topic}」，这个意象让你想起了哪一段具体的记忆或经历？**`,
            options: [
              q("童年的一段温暖或遗憾的回忆", "童年记忆"),
              q("与某个重要的人相关的经历", "人生经历"),
              q("一个看似平凡却意味深长的瞬间", "平凡瞬间"),
              q("一段关于失去、告别或重逢的经历", "离散重逢"),
            ],
            round: 2,
            nodes: buildEssayNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `情感已经充沛。最后一步——\n\n**关于「${topic}」，从这段记忆和意象中，你领悟到了什么？你想传递怎样的人生感悟？**`,
            options: [
              q("关于时间流逝与珍惜当下的感悟", "时光感悟"),
              q("关于人与自然关系或生命哲理的思考", "生命哲思"),
              q("关于爱与陪伴、人与人情谊的体悟", "情谊体悟"),
              q("关于接纳不完美、与自己和解的领悟", "自我和解"),
              q("✅ 可以了，生成完整架构", "生成架构"),
            ],
            round: 3,
            nodes: buildEssayNodes(2, topic),
          };
      }

    // ── 游记 ────────────────────────────────────────────────
    case "游记":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `带我去「${topic}」看看。\n\n**第一个问题：你去「${topic}」是什么时候？是独自旅行还是与谁同行？出发时的心情如何？**`,
            options: [
              q("独自一人的探索之旅", "独自旅行"),
              q("与家人／朋友的温暖同行", "结伴同行"),
              q("一次意外的偶遇或计划外的到访", "意外之旅"),
              q("一次期待已久、精心策划的旅行", "期待之旅"),
            ],
            round: 1,
            nodes: buildTravelogueNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `旅途在展开。说说最难忘的时刻——\n\n**关于「${topic}」，哪一个瞬间让你觉得"这趟值了"？是风景、人物还是某个偶然的发现？**`,
            options: [
              q("看到了令人震撼的自然／人文景观", "震撼风景"),
              q("遇到了有趣的当地人或其他旅者", "遇见人物"),
              q("发生了一件意外或有趣的小插曲", "旅途插曲"),
              q("在一个安静时刻获得了内心的感悟", "内心时刻"),
            ],
            round: 2,
            nodes: buildTravelogueNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `旅途接近尾声。最后一个问题——\n\n**关于「${topic}」，回来之后，这段旅程在你心里留下了什么？你变了什么？**`,
            options: [
              q("对世界的多样性有了新的认识", "世界认知"),
              q("对自己的人生有了新的理解或方向", "自我认识"),
              q("珍藏了一段美好的人际记忆", "人际记忆"),
              q("获得了一种持续的内心平静或力量", "内心力量"),
              q("✅ 可以了，生成完整架构", "生成架构"),
            ],
            round: 3,
            nodes: buildTravelogueNodes(2, topic),
          };
      }

    // ── 议论文（默认）───────────────────────────────────────
    default:
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `好的，我先为「${topic}」搭建一个基本框架。\n\n**第一个问题：这个论证的根本出发点是什么？**`,
            options: [
              q("从理论/学术角度分析", "理论角度"),
              q("从社会现实/案例分析", "现实角度"),
              q("从个人经验/观察出发", "个人视角"),
              q("从批判/反思角度切入", "批判视角"),
            ],
            round: 1,
            nodes: buildArgumentativeNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `框架在扩展。现在我想确认——\n\n**关于「${topic}」，你打算从哪几个方向展开论证？有没有需要反驳的观点？**`,
            options: [
              q("我有一个明确的对立观点需要反驳", "有对立观点"),
              q("我的论证是正面展开的，不需要专门反驳", "正面展开"),
              q("我想先正面论证，再回应可能的质疑", "先正后反"),
              q("我想用辩证的方式，正反两面同时推进", "辩证推进"),
            ],
            round: 2,
            nodes: buildArgumentativeNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `核心框架已就位。最后一个问题——\n\n**关于「${topic}」，你希望读者读完最后一句产生什么感受？**`,
            options: [
              q("受到启发，想要采取行动", "启发行动"),
              q("被说服，认同文章的观点", "被说服"),
              q("陷入沉思，重新审视这个问题", "沉思反思"),
              q("感到震撼，看到问题的新维度", "感到震撼"),
              q("✅ 可以了，生成完整架构", "生成架构"),
            ],
            round: 3,
            nodes: buildArgumentativeNodes(2, topic),
          };
      }
  }
}

// ── v5.1 legacy: Genre-specific clarification (preserved) ──

function getMockClarification(genre: string) {
  const q = (label: string, value: string) => ({ label, value });
  switch (genre) {
    case "议论文": return { type: "clarification", message: "好的，我们来梳理议论文的要素。你的核心立场是什么？", options: [q("我完全支持这个观点", "完全支持"), q("我持反对态度", "完全反对"), q("我有比较折中的看法", "折中态度")] };
    case "记叙文": return { type: "clarification", message: "好的，我们来构思这个故事。", options: [q("这是真实的个人经历", "真实经历"), q("这是一个虚构的故事", "虚构故事"), q("基于真实事件改编", "真实改编")] };
    case "散文": return { type: "clarification", message: "散文贵在真情实感。先确认情感基调：", options: [q("温暖的回忆", "温暖"), q("淡淡的忧伤", "忧伤"), q("冷静的思考", "冷静"), q("豁达的感悟", "豁达")] };
    case "游记": return { type: "clarification", message: "说说这次旅行。先确定写作重点：", options: [q("以风景描写为主", "风景为主"), q("以个人感悟为主", "感悟为主"), q("风景与感悟并重", "两者并重")] };
    case "说明文": return { type: "clarification", message: "先明确说明对象和读者基础：", options: [q("读者对这个概念完全不了解", "零基础"), q("读者有了解但存在误解", "有误解"), q("读者已有基础", "有基础")] };
    default: return { type: "clarification", message: "在搭建架构之前，先了解几个关键问题：", options: [q("我想表达一个明确的观点", "表达观点"), q("我想讲述一个故事", "讲述故事"), q("我想分享一种感受", "分享感受")] };
  }
}

// ── Main route handler ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";
    const body = await request.json();
    const { message, conversationHistory, currentArchitecture, selectedNodeId } = body;
    if (!message) return Response.json({ error: "Missing message" }, { status: 400 });

    // Mock mode — dynamic topic-aware architecture (v5.3)
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 300));
      const genreMatch = (message || "").match(/^\[文体：(.+?)\]/);
      const genreFromMsg = genreMatch ? genreMatch[1] as Genre : null;
      const hist = Array.isArray(conversationHistory) ? conversationHistory : [];
      const genre = genreFromMsg || extractGenre(hist);
      const prevUserMsgCount = hist.filter((m: { role: string }) => m.role === "user").length - 1;
      const triggerWords = /可以了|生成架构|开始搭建|搭建架构|够了|没问题|开始吧|生成|确认/;
      const shouldGenerate = triggerWords.test(message) && prevUserMsgCount >= 0;
      const topic = extractTopic(getUserAnswers(hist), genre);

      // Deep questioning with interleaved nodes (genre-aware)
      if (!shouldGenerate && !genreMatch && prevUserMsgCount <= 2) {
        const round = prevUserMsgCount;
        const questions = getDeepQuestion(round, message, hist, genre);
        const partialNodes = questions.nodes || [];

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            for (const node of partialNodes) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "node", node })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: questions.type, message: questions.message, options: questions.options, round: questions.round })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      // Genre-prefixed first message — use genre-aware deep questioning round 0
      if (!shouldGenerate && genreMatch && prevUserMsgCount <= 0) {
        const questions = getMockClarification(genre);
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(questions)}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      // Generate full architecture (after questioning or trigger)
      const mock = buildFullArchitecture(topic, genre);
      persistConversation(userId, body.documentId, message, JSON.stringify(mock));
      const nodes = mock.nodes || [];

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const enq = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

          enq({ type: "progress", stage: "analyzing", message: `正在综合关于「${topic}」的观点...`, progress: 10 });
          await delay(500);
          enq({ type: "progress", stage: "structuring", message: "正在构建逻辑框架...", progress: 40 });
          await delay(500);
          enq({ type: "progress", stage: "generating", message: "正在生成节点...", progress: 60 });
          for (let i = 0; i < nodes.length; i++) {
            enq({ type: "node", node: nodes[i], progress: 60 + Math.floor((i + 1) / nodes.length * 30) });
            await delay(120);
          }
          await delay(200);
          enq({ type: "confirmation", message: mock.message, nodes, edges: mock.edges || [], highlight_nodes: mock.highlight_nodes || [], suggestion: mock.suggestion || null });
          enq({ type: "progress", stage: "done", message: `架构生成完成，共 ${nodes.length} 个节点`, progress: 100 });
          enq({ type: "done" });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ── Real mode (DeepSeek) ─────────────────────────────────
    const manualChanges = await getRecentCanvasChanges(body.documentId);
    const userPreferences = await getUserPreferences(userId);

    const userPrompt = buildArchitectChatPrompt({
      message,
      currentArchitecture: currentArchitecture || { nodes: [], edges: [] },
      selectedNodeId: selectedNodeId || null,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      manualChanges: manualChanges || undefined,
      userPreferences: userPreferences || undefined,
    });

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat", temperature: 0.5, max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITECT_CHAT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    const parsed = JSON.parse(content);

    if (parsed.nodes) {
      parsed.nodes = parsed.nodes.map((n: Record<string, unknown>) => ({
        ...n, label: n.label || n.title || "未命名",
        notes: n.notes || n.description || undefined, children: n.children || [],
      }));
    }
    if (parsed.edges) {
      parsed.edges = parsed.edges.map((e: Record<string, unknown>) => ({
        id: e.id || e._id, from: e.from || e.source, to: e.to || e.target,
        relation: e.relation || "supports",
      }));
    }

    persistConversation(userId, body.documentId, message, content);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

async function persistConversation(
  userId: string, documentId: string | undefined,
  userMessage: string, aiResponse: string,
) {
  try {
    if (userId === "anonymous" || !documentId) return;
    const supabase = getSupabase();
    await supabase.from("architect_conversations").insert({ document_id: documentId, user_id: userId, role: "user", content: userMessage });
    await supabase.from("architect_conversations").insert({ document_id: documentId, user_id: userId, role: "assistant", content: aiResponse });
  } catch { /* */ }
}
