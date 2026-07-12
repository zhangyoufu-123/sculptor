import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/deepseek";
import { getSupabase } from "@/lib/supabase";
import { isMockMode } from "@/lib/ai/mock-responses";
import { ARCHITECT_CHAT_SYSTEM_PROMPT, buildArchitectChatPrompt } from "@/lib/ai/prompts/architect-chat";
import { getRecentCanvasChanges, getUserPreferences } from "@/lib/ai/architect-memory";
import { detectGenre, getGenreInfo, type Genre } from "@/lib/ai/genre-detector";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── v8.0: 任务类型提取 ──────────────────────────────────

/** 从对话历史中提取写作任务类型（首条用户消息） */
function extractGenre(hist: { role: string; content: string }[]): Genre {
  for (const m of hist) {
    if (m.role !== "user") continue;
    const match = m.content.match(/^\[文体：(.+?)\]/);
    if (match) return match[1] as Genre;
  }
  // 基于关键词内容检测
  for (const m of hist) {
    if (m.role !== "user") continue;
    return detectGenre(m.content);
  }
  return "其它";
}

// ── v8.0: 主题提取（按任务类型）───────────────────

/** 去除常见前缀，提取用户核心主题 */
function extractTopic(messages: string[], genre: Genre): string {
  for (const m of messages) {
    // 先去除文体前缀
    let cleaned = m.replace(/^\[文体：.+?\]\s*/, "");

    // 按任务类型去除前缀/后缀
    switch (genre) {
      case "论文":
        cleaned = cleaned
          .replace(/^写一篇|^帮我写|^我想写|^研究|^关于/, "")
          .replace(/的学术论文|的论文|的研究|的综述/g, "")
          .trim();
        break;
      case "博客":
        cleaned = cleaned
          .replace(/^写一篇|^写个|^帮我写|^关于/, "")
          .replace(/的博客|的技术文章|的教程/g, "")
          .trim();
        break;
      case "公众号":
        cleaned = cleaned
          .replace(/^写一篇|^写个|^帮我写|^关于/, "")
          .replace(/的推送|的公众号文章|的公号文/g, "")
          .trim();
        break;
      case "报告":
        cleaned = cleaned
          .replace(/^写|^帮我写|^关于/, "")
          .replace(/的报告|的周报|的月报|的总结|的汇报/g, "")
          .trim();
        break;
      case "邮件":
        cleaned = cleaned
          .replace(/^写|^帮我写|^关于/, "")
          .replace(/的邮件|的email|的信函/g, "")
          .trim();
        break;
      case "演讲":
        cleaned = cleaned
          .replace(/^写|^帮我写|^关于/, "")
          .replace(/的演讲稿|的发言|的致辞/g, "")
          .trim();
        break;
      case "日记":
        cleaned = cleaned
          .replace(/^写|^记录|^关于/, "")
          .replace(/的日记|的记录/g, "")
          .trim();
        break;
      default: // 其它
        cleaned = cleaned
          .replace(/^写|^帮我写|^创作|^关于|^我想写|^我想/, "")
          .trim();
    }

    if (cleaned.length >= 2 && !/^可以了|^生成|^够了|^没问题|^开始/.test(cleaned)) {
      return cleaned;
    }
  }
  return messages[0]?.replace(/^\[文体：.+?\]\s*/, "").replace(/^写一篇|^关于/, "").trim() || "这个话题";
}

/** 从对话历史中获取所有用户回答 */
function getUserAnswers(hist: { role: string; content: string }[]): string[] {
  return hist.filter(m => m.role === "user").map(m => m.content);
}

// ── v8.0: 节点工厂 ──────────────────────────────────

function n(id: string, label: string, type: string, children: string[] = [], tip?: string) {
  return { id, label, type, children, writingTip: tip };
}

function q(label: string, value: string) {
  return { label, value };
}

// ── v8.0: 任务类型节点构建器 ──────────────────────

/** 论文：abstract → introduction → literature → method → result → discussion → conclusion */
function buildPaperNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `摘要：${topic}的核心问题`, "abstract", ["n2"], "概括研究问题、方法和主要发现"),
        n("n2", `引言：为什么研究${topic}？`, "introduction", ["n3"], "阐述研究背景、意义和现有研究缺口"),
        n("n3", `文献综述：${topic}的现有研究`, "literature", ["n4"], "梳理已有研究的脉络和不足"),
      ];
    case 1:
      return [
        n("n4", `方法：如何研究${topic}？`, "method", ["n5"], "说明数据来源、实验设计或论证路径"),
        n("n5", `结果：${topic}的研究发现`, "result", ["n6"], "呈现核心数据、案例或论证结果"),
      ];
    case 2:
    default:
      return [
        n("n6", `讨论：${topic}的意义与局限`, "discussion", ["n7"], "解释结果的含义，承认局限性"),
        n("n7", `结论：${topic}的贡献与展望`, "conclusion", [], "总结贡献，提出未来研究方向"),
      ];
  }
}

/** 博客：hook → introduction → body → example → conclusion */
function buildBlogNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `开篇：${topic}的吸引力`, "hook", ["n2"], "用一个问题或场景抓住读者兴趣"),
        n("n2", `背景：${topic}为什么值得写`, "introduction", ["n3"], "解释这篇文章的缘起和读者群体"),
        n("n3", `正文：${topic}的第一个要点`, "body", ["n4"], "展开第一个核心内容"),
      ];
    case 1:
      return [
        n("n4", `深入：${topic}的第二个要点`, "body", ["n5"], "继续展开，逐步深入"),
        n("n5", `案例：${topic}的实战演示`, "example", ["n6"], "用代码、截图或具体案例说明"),
      ];
    case 2:
    default:
      return [
        n("n6", `总结：${topic}的要点回顾`, "conclusion", [], "归纳全文，给读者可带走的东西"),
      ];
  }
}

/** 公众号：hook → lead → body → section → cta */
function buildWechatNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `标题/封面：${topic}的爆款切入点`, "hook", ["n2"], "标题要引发好奇心或共鸣"),
        n("n2", `导语：${topic}的前三句`, "lead", ["n3"], "前三句话决定读者是否继续读"),
        n("n3", `第一部分：${topic}的引入`, "body", ["n4"], "用故事或数据引出主题"),
      ];
    case 1:
      return [
        n("n4", `第二部分：${topic}的展开`, "section", ["n5"], "分段论述，每段一个观点"),
        n("n5", `结尾：${topic}的号召`, "cta", [], "引导转发、关注或行动"),
      ];
    case 2:
    default:
      return [
        n("n5", `结尾：${topic}的号召`, "cta", [], "引导转发、关注或行动"),
      ];
  }
}

/** 报告：background → methodology → finding → analysis → conclusion */
function buildReportNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `背景：${topic}的报告缘起`, "background", ["n2"], "说明报告的目的和读者"),
        n("n2", `方法：${topic}的数据来源`, "methodology", ["n3"], "数据如何收集、分析框架"),
        n("n3", `发现一：${topic}的第一个关键数据`, "finding", ["n4"], "呈现第一个核心发现"),
      ];
    case 1:
      return [
        n("n4", `发现二：${topic}的第二个关键数据`, "finding", ["n5"], "第二个发现，可与第一个对比"),
        n("n5", `分析：${topic}的数据解读`, "analysis", ["n6"], "对发现进行解读和归因"),
      ];
    case 2:
    default:
      return [
        n("n6", `结论与建议：${topic}的行动方案`, "conclusion", [], "总结发现，提出可执行建议"),
      ];
  }
}

/** 邮件：subject → greeting → body → call_to_action → closing */
function buildEmailNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `主题：关于${topic}`, "subject", ["n2"], "邮件主题行，简明扼要"),
        n("n2", `称呼与背景：${topic}的来意`, "greeting", ["n3"], "收件人称呼 + 发件缘由"),
        n("n3", `正文：${topic}的具体内容`, "body", ["n4"], "事情的详细说明"),
      ];
    case 1:
      return [
        n("n4", `行动：${topic}需要对方做什么`, "call_to_action", ["n5"], "明确列出需要回复或执行的行动"),
      ];
    case 2:
    default:
      return [
        n("n5", `结尾：${topic}的落款`, "closing", [], "礼貌结束语 + 签名"),
      ];
  }
}

/** 演讲：opening → body_point → story → climax → closing */
function buildSpeechNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `开场：${topic}的第一印象`, "opening", ["n2"], "用故事、问题或金句开场"),
        n("n2", `要点一：${topic}的第一个核心`, "body_point", ["n3"], "第一个主要论点或信息"),
        n("n3", `故事：${topic}的生动案例`, "story", ["n4"], "用一个真实故事让观众产生共鸣"),
      ];
    case 1:
      return [
        n("n4", `要点二：${topic}的深化`, "body_point", ["n5"], "第二个核心，与前一个形成递进"),
        n("n5", `高潮：${topic}的最强音`, "climax", ["n6"], "情感或逻辑的最高点"),
      ];
    case 2:
    default:
      return [
        n("n6", `结束：${topic}的最后一句`, "closing", [], "让人记住的结尾，呼应开场"),
      ];
  }
}

/** 日记：date → event → reflection → emotion */
function buildDiaryNodes(round: number, topic: string): ReturnType<typeof n>[] {
  switch (round) {
    case 0:
      return [
        n("n1", `日期与天气`, "date", ["n2"], "记下今天的时间和环境"),
        n("n2", `事件：${topic}发生了什么`, "event", ["n3"], "记录今天的主要事件"),
        n("n3", `感受：${topic}让我想到什么`, "reflection", [], "最初的感受和想法"),
      ];
    case 1:
      return [
        n("n4", `深入：${topic}的更多细节`, "reflection", ["n5"], "补充更多细节和思考"),
        n("n5", `情绪：${topic}带给我的心情`, "emotion", [], "今天的情绪基调是什么"),
      ];
    case 2:
    default:
      return [
        n("n5", `情绪：${topic}带给我的心情`, "emotion", [], "今天的情绪基调是什么"),
      ];
  }
}

// ── v8.0: 通用节点构建器（其它类型回退） ────────

function buildGenericNodes(round: number, topic: string, nodeTypes: string[]): ReturnType<typeof n>[] {
  const primary = nodeTypes[0] || "section";
  const secondary = nodeTypes[1] || "detail";
  
  switch (round) {
    case 0:
      return [
        n("n1", `${topic}`, primary, ["n2", "n3"], `从这里开始整理关于「${topic}」的素材`),
        n("n2", `开头：${topic}的引入`, "hook", ["n3"], "用一个引人入胜的开头抓住注意力"),
        n("n3", `背景：${topic}的来龙去脉`, "background", [], "必要的背景信息"),
      ];
    case 1:
      return [
        n("n4", `展开：${topic}的核心`, secondary, ["n5"], "深入展开核心内容"),
        n("n5", `补充：${topic}的支撑材料`, "detail", ["n6"], "用具体素材充实结构"),
      ];
    case 2:
    default:
      return [
        n("n6", `收尾：${topic}的落点`, "conclusion", [], "有力的收尾"),
      ];
  }
}

// ── v8.0: 任务类型路由 ─────────────────────────────

function buildTaskNodes(round: number, topic: string, genre: Genre): ReturnType<typeof n>[] {
  switch (genre) {
    case "论文": return buildPaperNodes(round, topic);
    case "博客": return buildBlogNodes(round, topic);
    case "公众号": return buildWechatNodes(round, topic);
    case "报告": return buildReportNodes(round, topic);
    case "邮件": return buildEmailNodes(round, topic);
    case "演讲": return buildSpeechNodes(round, topic);
    case "日记": return buildDiaryNodes(round, topic);
    default: {
      const info = getGenreInfo(genre);
      return buildGenericNodes(round, topic, info.nodeTypes);
    }
  }
}

// ── v8.0: 任务类型深度提问 ────────────────────────

function getDeepQuestion(
  round: number,
  message: string,
  hist: { role: string; content: string }[],
  genre: Genre,
) {
  const topic = extractTopic(getUserAnswers(hist), genre);
  const answers = getUserAnswers(hist);

  // v8.0: 新的任务类别（论文/博客/公众号/报告/邮件/演讲/日记）使用专用提问
  // 其它类型使用通用提问

  switch (genre) {
    // ── 论文 ───────────────────────────────────────────
    case "论文":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `好的，来梳理「${topic}」的论文结构。\n\n第一个问题：这篇论文的研究性质是什么？`,
            options: [
              q("文献综述——梳理已有研究", "文献综述"),
              q("实证研究——有数据或实验", "实证研究"),
              q("理论分析——概念辨析与论证", "理论分析"),
              q("案例研究——具体案例深度分析", "案例研究"),
            ],
            round: 1,
            nodes: buildPaperNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `框架在成形。\n\n关于「${topic}」，你的核心论点或假设是什么？`,
            options: [
              q("验证一个明确的假设", "验证假设"),
              q("提出一个新的理论框架", "新框架"),
              q("反驳已有的主流观点", "反驳主流"),
              q("比较多种方法或理论的优劣", "比较分析"),
            ],
            round: 2,
            nodes: buildPaperNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `主体框架就位。\n\n关于「${topic}」，你希望这篇论文的贡献点是什么？`,
            options: [
              q("填补研究空白，提供新数据", "填补空白"),
              q("改进已有方法，提升效果", "方法改进"),
              q("揭示新的现象或规律", "新发现"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildPaperNodes(2, topic),
          };
      }

    // ── 博客 ───────────────────────────────────────────
    case "博客":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `来构思这篇关于「${topic}」的博客。\n\n第一个问题：你的目标读者是谁？`,
            options: [
              q("技术同行——可以深入技术细节", "技术同行"),
              q("初学者——需要从基础讲起", "初学者"),
              q("产品/业务人员——关注应用价值", "业务人员"),
              q("泛技术爱好者——重在启发和分享", "泛爱好者"),
            ],
            round: 1,
            nodes: buildBlogNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `读者明确了。\n\n关于「${topic}」，你打算用什么方式呈现内容？`,
            options: [
              q("教程式——手把手步骤讲解", "教程式"),
              q("心得式——分享踩坑经验和思考", "心得式"),
              q("对比式——比较不同方案的优劣", "对比式"),
              q("问题解决式——从问题到方案", "问题解决"),
            ],
            round: 2,
            nodes: buildBlogNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `内容方向清楚了。\n\n关于「${topic}」，你需要配代码示例或截图吗？`,
            options: [
              q("需要代码示例，我会提供", "有代码"),
              q("需要截图或图表", "有截图"),
              q("纯文字就可以", "纯文字"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildBlogNodes(2, topic),
          };
      }

    // ── 公众号 ─────────────────────────────────────────
    case "公众号":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `来构思「${topic}」的公众号文章。\n\n第一个问题：这篇文章的传播目标是什么？`,
            options: [
              q("涨粉——吸引新读者关注", "涨粉"),
              q("转化——引导读者行动（买课/报名）", "转化"),
              q("品牌——建立专业形象", "品牌"),
              q("维系——与现有读者互动", "维系"),
            ],
            round: 1,
            nodes: buildWechatNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `目标清晰了。\n\n关于「${topic}」，你打算用什么钩子开头？`,
            options: [
              q("热点事件——蹭近期热点", "热点事件"),
              q("痛点共鸣——说出读者的困境", "痛点共鸣"),
              q("反常识——挑战已有认知", "反常识"),
              q("故事引入——用一个真实故事", "故事引入"),
            ],
            round: 2,
            nodes: buildWechatNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `内容方向清楚了。\n\n关于「${topic}」，需要配图或排版建议吗？`,
            options: [
              q("需要配图位置建议", "需要配图"),
              q("需要小标题和分隔建议", "需要排版"),
              q("不用，纯文字结构即可", "纯文字"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildWechatNodes(2, topic),
          };
      }

    // ── 报告 ───────────────────────────────────────────
    case "报告":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `来整理「${topic}」的报告结构。\n\n第一个问题：这个报告的受众是谁？`,
            options: [
              q("给领导/管理层看的——需要结论先行", "管理层"),
              q("给团队同事看的——需要协作透明", "团队"),
              q("给客户/外部看的——需要正式专业", "客户"),
              q("自己存档用的——重在记录和反思", "个人存档"),
            ],
            round: 1,
            nodes: buildReportNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `受众明确了。\n\n关于「${topic}」，你有哪些数据或素材可以用？`,
            options: [
              q("有量化数据（数字、指标、对比）", "有数据"),
              q("有案例或项目记录", "有案例"),
              q("有过程描述和时间线", "有时间线"),
              q("目前只有想法，需要我梳理框架", "只有想法"),
            ],
            round: 2,
            nodes: buildReportNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `素材梳理中。\n\n关于「${topic}」，报告的核心结论是什么？`,
            options: [
              q("进展顺利，数据支持", "进展顺利"),
              q("有风险，需要关注", "有风险"),
              q("有重要发现或洞察", "有洞察"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildReportNodes(2, topic),
          };
      }

    // ── 邮件 ───────────────────────────────────────────
    case "邮件":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `来整理关于「${topic}」的邮件。\n\n第一个问题：收件人与你的关系是什么？`,
            options: [
              q("上级/领导——正式、汇报语气", "上级"),
              q("平级同事——协作、平等语气", "同事"),
              q("客户/外部——专业、礼貌语气", "客户"),
              q("下属/团队——指导、明确语气", "下属"),
            ],
            round: 1,
            nodes: buildEmailNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `关系清楚了。\n\n关于「${topic}」，你希望对方收到邮件后做什么？`,
            options: [
              q("回复确认——只需要对方知晓", "回复确认"),
              q("执行操作——需要对方做某件事", "执行操作"),
              q("提供信息——需要对方回复数据/文档", "提供信息"),
              q("开会讨论——预约会议进一步沟通", "开会讨论"),
            ],
            round: 2,
            nodes: buildEmailNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `意图明确了。\n\n关于「${topic}」，需要附件或额外说明吗？`,
            options: [
              q("有附件需要提及", "有附件"),
              q("有截止日期需要强调", "有截止日期"),
              q("没有，简洁直接即可", "简洁直接"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildEmailNodes(2, topic),
          };
      }

    // ── 演讲 ───────────────────────────────────────────
    case "演讲":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `来整理「${topic}」的演讲结构。\n\n第一个问题：演讲的场合和时长？`,
            options: [
              q("正式场合（会议/典礼），10-20分钟", "正式场合"),
              q("内部分享（团队/部门），5-10分钟", "内部分享"),
              q("即兴发言（饭局/聚会），2-3分钟", "即兴发言"),
              q("TED风格，15-18分钟", "TED风格"),
            ],
            round: 1,
            nodes: buildSpeechNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `场合清楚了。\n\n关于「${topic}」，你想用什么方式打动观众？`,
            options: [
              q("讲一个亲身经历的故事", "亲身故事"),
              q("用数据和事实说服", "数据说服"),
              q("用幽默和自嘲拉近距离", "幽默自嘲"),
              q("提出一个挑战性观点引发思考", "挑战观点"),
            ],
            round: 2,
            nodes: buildSpeechNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `演讲主线清晰了。\n\n关于「${topic}」，你希望观众记住的一句话是什么？`,
            options: [
              q("一个行动号召", "行动号召"),
              q("一个值得反思的问题", "反思问题"),
              q("一个金句或格言", "金句"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildSpeechNodes(2, topic),
          };
      }

    // ── 日记 ───────────────────────────────────────────
    case "日记":
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `来记录关于「${topic}」的日记。\n\n第一个问题：今天主要的情绪基调是什么？`,
            options: [
              q("平静满足——日常的安稳", "平静满足"),
              q("兴奋激动——发生了好事", "兴奋激动"),
              q("疲惫焦虑——有些压力", "疲惫焦虑"),
              q("感伤怀念——想到过去的事", "感伤怀念"),
            ],
            round: 1,
            nodes: buildDiaryNodes(0, topic),
          };

        case 1:
          return {
            type: "clarification",
            message: `情绪确认了。\n\n关于「${topic}」，今天最值得记录的一件事是什么？`,
            options: [
              q("一次有意义的对话或相遇", "对话相遇"),
              q("一个突然的领悟或想法", "突然领悟"),
              q("一件完成的事或进展", "完成进展"),
              q("一件让我情绪波动的小事", "情绪波动"),
            ],
            round: 2,
            nodes: buildDiaryNodes(1, topic),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `事件清晰了。\n\n关于「${topic}」，你想在日记中提炼什么？`,
            options: [
              q("感恩——记录值得感谢的事", "感恩"),
              q("反思——今天有什么可以改进", "反思"),
              q("展望——对明天的期待", "展望"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildDiaryNodes(2, topic),
          };
      }

    // ── 其它（通用）────────────────────────────────────
    default:
      switch (round) {
        case 0:
          return {
            type: "clarification",
            message: `好的，我来帮你整理「${topic}」的结构。\n\n第一个问题：你想从哪里切入？`,
            options: [
              q("从背景和定义开始", "背景定义"),
              q("直接进入核心内容", "直接核心"),
              q("用一个故事或场景引入", "场景引入"),
              q("先提出问题，再逐步解答", "问题引入"),
            ],
            round: 1,
            nodes: buildGenericNodes(0, topic, getGenreInfo(genre).nodeTypes),
          };

        case 1:
          return {
            type: "clarification",
            message: `框架在扩展。\n\n关于「${topic}」，你最想突出的是什么？`,
            options: [
              q("核心观点/主题", "核心观点"),
              q("具体细节/案例", "具体细节"),
              q("情感/氛围", "情感氛围"),
              q("实用价值/建议", "实用价值"),
            ],
            round: 2,
            nodes: buildGenericNodes(1, topic, getGenreInfo(genre).nodeTypes),
          };

        case 2:
        default:
          return {
            type: "clarification",
            message: `核心内容已就位。\n\n怎么收尾最有力量？`,
            options: [
              q("总结升华", "总结升华"),
              q("留下思考空间", "开放结尾"),
              q("呼应开头", "呼应开头"),
              q("✅ 可以了，生成完整大纲", "生成大纲"),
            ],
            round: 3,
            nodes: buildGenericNodes(2, topic, getGenreInfo(genre).nodeTypes),
          };
      }
  }
}

// ── v8.0: 完整大纲生成 ─────────────────────────────

function buildFullArchitecture(topic: string, genre: Genre) {
  switch (genre) {
    case "论文":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的论文大纲`,
        nodes: [
          n("n1", `摘要：${topic}的核心问题`, "abstract", ["n2"], "概括研究问题、方法和主要发现"),
          n("n2", `引言：为什么研究${topic}？`, "introduction", ["n3"], "阐述研究背景、意义和现有研究缺口"),
          n("n3", `文献综述：${topic}的现有研究`, "literature", ["n4"], "梳理已有研究的脉络和不足"),
          n("n4", `方法：如何研究${topic}？`, "method", ["n5"], "说明数据来源、实验设计或论证路径"),
          n("n5", `结果：${topic}的研究发现`, "result", ["n6"], "呈现核心数据、案例或论证结果"),
          n("n6", `讨论：${topic}的意义与局限`, "discussion", ["n7"], "解释结果的含义，承认局限性"),
          n("n7", `结论：${topic}的贡献与展望`, "conclusion", [], "总结贡献，提出未来研究方向"),
        ],
        edges: [],
        highlight_nodes: ["n5"],
        suggestion: { type: "missing_evidence", message: `建议为「${topic}」的结果部分补充具体数据或引用`, node_id: "n5", auto_fix_available: true },
      };

    case "博客":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的博客大纲`,
        nodes: [
          n("n1", `开篇：${topic}的吸引力`, "hook", ["n2"], "用一个问题或场景抓住读者兴趣"),
          n("n2", `背景：${topic}为什么值得写`, "introduction", ["n3"], "解释这篇文章的缘起和读者群体"),
          n("n3", `正文：${topic}的第一个要点`, "body", ["n4"], "展开第一个核心内容"),
          n("n4", `深入：${topic}的第二个要点`, "body", ["n5"], "继续展开，逐步深入"),
          n("n5", `案例：${topic}的实战演示`, "example", ["n6"], "用代码、截图或具体案例说明"),
          n("n6", `总结：${topic}的要点回顾`, "conclusion", [], "归纳全文，给读者可带走的东西"),
        ],
        edges: [],
        highlight_nodes: ["n5"],
        suggestion: { type: "missing_example", message: `建议为「${topic}」补充至少一个可运行的代码示例`, node_id: "n5", auto_fix_available: true },
      };

    case "公众号":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的公众号大纲`,
        nodes: [
          n("n1", `标题/封面：${topic}的爆款切入点`, "hook", ["n2"], "标题要引发好奇心或共鸣"),
          n("n2", `导语：${topic}的前三句`, "lead", ["n3"], "前三句话决定读者是否继续读"),
          n("n3", `第一部分：${topic}的引入`, "body", ["n4"], "用故事或数据引出主题"),
          n("n4", `第二部分：${topic}的展开`, "section", ["n5"], "分段论述，每段一个观点"),
          n("n5", `结尾：${topic}的号召`, "cta", [], "引导转发、关注或行动"),
        ],
        edges: [],
        highlight_nodes: ["n1"],
        suggestion: { type: "better_title", message: `标题是公众号文章的生命线，建议准备3-5个备选标题测试`, node_id: "n1", auto_fix_available: true },
      };

    case "报告":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的报告大纲`,
        nodes: [
          n("n1", `背景：${topic}的报告缘起`, "background", ["n2"], "说明报告的目的和读者"),
          n("n2", `方法：${topic}的数据来源`, "methodology", ["n3"], "数据如何收集、分析框架"),
          n("n3", `发现一：${topic}的第一个关键数据`, "finding", ["n4"], "呈现第一个核心发现"),
          n("n4", `发现二：${topic}的第二个关键数据`, "finding", ["n5"], "第二个发现，可与第一个对比"),
          n("n5", `分析：${topic}的数据解读`, "analysis", ["n6"], "对发现进行解读和归因"),
          n("n6", `结论与建议：${topic}的行动方案`, "conclusion", [], "总结发现，提出可执行建议"),
        ],
        edges: [],
        highlight_nodes: ["n6"],
        suggestion: { type: "missing_detail", message: `建议在结论部分加入具体的行动时间表和责任人`, node_id: "n6", auto_fix_available: true },
      };

    case "邮件":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的邮件大纲`,
        nodes: [
          n("n1", `主题：关于${topic}`, "subject", ["n2"], "邮件主题行，简明扼要"),
          n("n2", `称呼与背景：${topic}的来意`, "greeting", ["n3"], "收件人称呼 + 发件缘由"),
          n("n3", `正文：${topic}的具体内容`, "body", ["n4"], "事情的详细说明"),
          n("n4", `行动：${topic}需要对方做什么`, "call_to_action", ["n5"], "明确列出需要回复或执行的行动"),
          n("n5", `结尾：${topic}的落款`, "closing", [], "礼貌结束语 + 签名"),
        ],
        edges: [],
        highlight_nodes: ["n4"],
        suggestion: { type: "missing_detail", message: `建议为行动项设置明确的截止日期`, node_id: "n4", auto_fix_available: true },
      };

    case "演讲":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的演讲大纲`,
        nodes: [
          n("n1", `开场：${topic}的第一印象`, "opening", ["n2"], "用故事、问题或金句开场"),
          n("n2", `要点一：${topic}的第一个核心`, "body_point", ["n3"], "第一个主要论点或信息"),
          n("n3", `故事：${topic}的生动案例`, "story", ["n4"], "用一个真实故事让观众产生共鸣"),
          n("n4", `要点二：${topic}的深化`, "body_point", ["n5"], "第二个核心，与前一个形成递进"),
          n("n5", `高潮：${topic}的最强音`, "climax", ["n6"], "情感或逻辑的最高点"),
          n("n6", `结束：${topic}的最后一句`, "closing", [], "让人记住的结尾，呼应开场"),
        ],
        edges: [],
        highlight_nodes: ["n5"],
        suggestion: { type: "missing_detail", message: `建议在高潮部分加入一个具体的个人故事`, node_id: "n5", auto_fix_available: true },
      };

    case "日记":
      return {
        type: "confirmation",
        message: `已整理「${topic}」的日记大纲`,
        nodes: [
          n("n1", `日期与天气`, "date", ["n2"], "记下今天的时间和环境"),
          n("n2", `事件：${topic}发生了什么`, "event", ["n3"], "记录今天的主要事件"),
          n("n3", `感受：${topic}让我想到什么`, "reflection", ["n4"], "最初的感受和想法"),
          n("n4", `深入：${topic}的更多细节`, "reflection", ["n5"], "补充更多细节和思考"),
          n("n5", `情绪：${topic}带给我的心情`, "emotion", [], "今天的情绪基调是什么"),
        ],
        edges: [],
        highlight_nodes: ["n3"],
        suggestion: { type: "missing_detail", message: `建议在感受部分加入一个具体的感官细节（声音、气味、触觉）`, node_id: "n3", auto_fix_available: true },
      };

    default:
      return {
        type: "confirmation",
        message: `已整理「${topic}」的结构大纲`,
        nodes: [
          n("n1", `开头：${topic}的引入`, "hook", ["n2"], "用一个引人入胜的开头抓住注意力"),
          n("n2", `背景：${topic}的来龙去脉`, "background", ["n3"], "必要的背景信息"),
          n("n3", `展开：${topic}的核心`, "body", ["n4"], "深入展开核心内容"),
          n("n4", `补充：${topic}的支撑材料`, "detail", ["n5"], "用具体素材充实结构"),
          n("n5", `收尾：${topic}的落点`, "conclusion", [], "有力的收尾"),
        ],
        edges: [],
        highlight_nodes: ["n3"],
        suggestion: { type: "missing_detail", message: `建议为核心段落补充具体案例或数据`, node_id: "n3", auto_fix_available: true },
      };
  }
}

// ── v5.1 保留: 任务类型确认引导 ──

function getMockClarification(genre: string) {
  const q = (label: string, value: string) => ({ label, value });
  switch (genre) {
    case "论文": return { type: "clarification", message: "好的，来梳理论文结构。先确认研究类型：", options: [q("文献综述", "文献综述"), q("实证研究", "实证研究"), q("理论分析", "理论分析"), q("案例研究", "案例研究")] };
    case "博客": return { type: "clarification", message: "来构思这篇博客。你的目标读者是？", options: [q("技术同行", "技术同行"), q("初学者", "初学者"), q("泛爱好者", "泛爱好者")] };
    case "公众号": return { type: "clarification", message: "来构思公众号文章。传播目标是什么？", options: [q("涨粉", "涨粉"), q("转化", "转化"), q("品牌建设", "品牌建设")] };
    case "报告": return { type: "clarification", message: "来整理报告结构。受众是谁？", options: [q("管理层", "管理层"), q("团队", "团队"), q("客户", "客户"), q("个人存档", "个人存档")] };
    case "邮件": return { type: "clarification", message: "来整理邮件结构。收件人与你的关系是？", options: [q("上级", "上级"), q("同事", "同事"), q("客户", "客户")] };
    case "演讲": return { type: "clarification", message: "来整理演讲结构。场合和时长？", options: [q("正式会议", "正式"), q("内部分享", "内部"), q("即兴发言", "即兴")] };
    case "日记": return { type: "clarification", message: "来记录今天的日记。情绪基调是？", options: [q("平静满足", "平静"), q("兴奋激动", "兴奋"), q("感伤怀念", "感伤")] };
    default: return { type: "clarification", message: "在整理结构前，先了解几个关键问题：", options: [q("我想表达一个明确的观点", "表达观点"), q("我想记录一段经历", "记录经历"), q("我想分享一种感受", "分享感受")] };
  }
}

// ── 主路由处理器 ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";
    const body = await request.json();
    const { message, conversationHistory, currentArchitecture, selectedNodeId } = body;
    if (!message) return Response.json({ error: "Missing message" }, { status: 400 });

    // Mock 模式 — 动态主题感知大纲
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 300));
      const genreMatch = (message || "").match(/^\[文体：(.+?)\]/);
      const genreFromMsg = genreMatch ? genreMatch[1] as Genre : null;
      const hist = Array.isArray(conversationHistory) ? conversationHistory : [];
      const genre = genreFromMsg || extractGenre(hist);
      const prevUserMsgCount = hist.filter((m: { role: string }) => m.role === "user").length - 1;
      const triggerWords = /可以了|生成大纲|开始搭建|搭建大纲|够了|没问题|开始吧|生成|确认/;
      const shouldGenerate = triggerWords.test(message) && prevUserMsgCount >= 0;
      const topic = extractTopic(getUserAnswers(hist), genre);

      // 深度提问（逐步展开节点）
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

      // 文体前缀消息 — 使用确认引导
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

      // 生成完整大纲（提问结束或触发词）
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
          enq({ type: "progress", stage: "done", message: `大纲生成完成，共 ${nodes.length} 个节点`, progress: 100 });
          enq({ type: "done" });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ── 真实模式（DeepSeek）─────────────────────────
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
