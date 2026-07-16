/**
 * Goal Builder — determines and refines the session Goal.
 * Includes cold start handling for sparse/vague first input.
 */

import { isMockMode } from "./mock-responses";
import { createClient } from "../deepseek";
import type { RuntimeState } from "./cognitive-runtime";

// --- Types ---

type GoalType = "UNDERSTAND" | "DECIDE" | "CREATE" | "DEBATE" | "EXPLORE";

export interface ColdStartResult {
  understanding: string;
  reframe: string;
  goalOptions: GoalOption[];
  suggestedMove: string;
}

export interface GoalOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

// --- Build Goal ---

export async function buildGoal(input: string, thinking: string[]): Promise<string> {
  if (isMockMode()) return mockBuildGoal(input, thinking);

  const client = createClient();
  const response = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.5,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "分析用户输入，推断他们真正的目标。目标类型包括：" +
          "UNDERSTAND(想理解某事)、DECIDE(需要做决定)、CREATE(想产出内容)、" +
          "DEBATE(想讨论/辩论)、EXPLORE(开放式探索)。" +
          "用一句话（20字以内）概括目标。只输出这句话。",
      },
      {
        role: "user",
        content: `用户说: "${input}"\n已有思考: ${thinking.join("; ") || "无"}\n\n一句话总结用户目标：`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || mockBuildGoal(input, thinking);
}

function mockBuildGoal(input: string, _thinking: string[]): string {
  if (input.includes("为什么")) return "理解现象背后的深层原因";
  if (input.includes("怎么") || input.includes("如何")) return "找到可行的解决方案";
  if (input.includes("是否") || input.includes("是不是")) return "检验一个命题是否成立";
  if (input.length < 10) return "明确自己想讨论的方向";
  return "深入探索这个主题";
}

// --- Reframe Goal ---

export async function reframeGoal(goal: string, state: RuntimeState): Promise<string> {
  if (state.currentPosition && state.evidence.for.length >= 2) {
    return `组织并表达关于「${state.unknowns[0] || goal}」的观点`;
  }
  if (state.evidence.against.length >= 1 && state.evidence.for.length >= 1) {
    return `在矛盾证据中找到更准确的立场`;
  }
  if (state.unknowns.length >= 3) {
    return `缩小不确定性范围，聚焦最关键的问题`;
  }
  return goal;
}

// --- Goal Achievement Check ---

export function isGoalAchieved(state: RuntimeState): boolean {
  if (state.round < 3) return false;
  const hasPosition = !!state.currentPosition;
  const hasEvidence = state.evidence.for.length >= 2;
  const unknownsLow = state.unknowns.length <= 2;
  const enoughThinking = state.userThinking.length >= 3;
  return hasPosition && hasEvidence && unknownsLow && enoughThinking;
}

// --- Cold Start ---

export function handleColdStart(input: string): ColdStartResult {
  const clean = input.trim();
  const len = clean.length;
  const keywords = extractKeywords(clean);
  const isQuestion = clean.includes("？") || clean.includes("?") || clean.includes("为什么") || clean.includes("怎么");
  const isTopic = len >= 5 && !isQuestion;
  const isVague = len < 5 || (!isQuestion && !isTopic);

  return {
    understanding: isVague
      ? `虽然只是几个字，但「${clean}」背后可能藏着很多想说的东西。`
      : isQuestion
      ? `你想弄明白「${clean.replace(/[？?]/g, "")}」——这是一个值得深入的问题。`
      : `「${clean}」——这个话题可以有很多不同的切入角度。`,
    reframe: buildReframe(clean, keywords, isQuestion),
    goalOptions: buildGoalOptions(isQuestion, isTopic),
    suggestedMove: isVague ? "先从澄清开始" : "可以先聚焦一个方向",
  };
}

function extractKeywords(text: string): string[] {
  const kw: string[] = [];
  const topicWords = [
    "注意力", "创造力", "焦虑", "自由", "公平", "创新",
    "教育", "AI", "产品", "设计", "写作", "思考", "哲学",
    "科技", "社会", "文化", "商业", "历史", "心理学",
    "年轻人", "未来", "工作", "生活", "关系", "意义",
  ];
  for (const w of topicWords) {
    if (text.includes(w) && !kw.includes(w)) kw.push(w);
  }
  return kw;
}

function buildReframe(input: string, keywords: string[], isQuestion: boolean): string {
  const topic = keywords[0] || input;
  const reframes: Record<string, string> = {
    "注意力": "注意力可能不是一个「个人问题」，而是一个「资源问题」——我们不是失去了注意力，而是注意力被更有力的东西抢走了。",
    "焦虑": "焦虑不一定是坏事——它可能是一个信号，告诉你有什么事情需要被正视。",
    "AI": "AI 产品的问题往往不只在技术，更在人——我们为什么愿意跟机器聊天？",
    "教育": "教育的问题从来不只是「教什么」，而是「为什么教」和「谁来定义好坏」。",
    "创造力": "创造力可能不是天赋，而是一种可以被环境激发或压抑的状态。",
    "自由": "自由不仅仅是「没有约束」，而是「有能力做出真正属于自己的选择」。",
  };
  if (reframes[topic]) return reframes[topic];
  if (isQuestion) return `也许问题本身可以换个问法——不是「${input.replace(/[？?]/g, "")}」，而是「为什么这个问题对你重要？」`;
  if (keywords.length > 0) return `「${topic}」可以从个人体验、社会现象、或者理论框架等多个角度来讨论。`;
  return `任何大的话题都可以从一个小的切入口开始——一个故事、一个场景、一个疑问。`;
}

function buildGoalOptions(isQuestion: boolean, isTopic: boolean): GoalOption[] {
  if (isQuestion) return [
    { id: "clarify", label: "先澄清问题", description: "把问题定义得更清晰，看看真正想问的是什么", icon: "🔍" },
    { id: "explore", label: "探索原因", description: "一起分析这个现象背后的深层原因", icon: "🧭" },
    { id: "debate", label: "挑战前提", description: "也许问题本身就不成立——换个角度看看", icon: "⚡" },
  ];
  if (isTopic) return [
    { id: "explore", label: "自由探索", description: "不设方向，聊聊这个话题的各种可能性", icon: "🌊" },
    { id: "focus", label: "聚焦一个角度", description: "找一个具体的切入口深入讨论", icon: "🎯" },
    { id: "create", label: "开始组织想法", description: "已经有想法了，直接开始整理", icon: "✍️" },
  ];
  return [
    { id: "clarify", label: "先聊聊看", description: "不着急定义，随便聊聊看会走到哪里", icon: "💬" },
    { id: "inspire", label: "给我一些灵感", description: "看看这个话题可以怎么展开", icon: "💡" },
  ];
}
