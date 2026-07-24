/**
 * Runtime v4 — Completion-driven. Not conversation-driven.
 *
 * Constitution: ARTICLE_COMPLETION_FIRST.
 * Every output must advance the work toward completion.
 * Never chat for the sake of chatting.
 */

import { createClient } from "../deepseek";
import { isMockMode } from "./mock-responses";

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

export interface CompletionState {
  goal: string;
  genre: string;
  skeleton: SkeletonSection[];
  completion: number;
  phase: "skeleton" | "discussion" | "writing" | "done";
  round: number;
  lastAdvance: boolean;
}

export interface SkeletonSection {
  label: string;
  priority: 1 | 2 | 3;  // P1=核心 P2=支撑 P3=细节
  value: string;
  confidence: number;
  status: "empty" | "building" | "done";
}

// ═══════════════════════════════════════════════════════════════
// Genre → Skeleton (priority-weighted)
// ═══════════════════════════════════════════════════════════════

const GENRE_SKELETONS: Record<string, SkeletonSection[]> = {
  "议论文": [
    { label: "核心论点", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "论证角度", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "关键论据", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "反方观点", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "结论方向", priority: 1, value: "", confidence: 0, status: "empty" },
  ],
  "散文": [
    { label: "核心意象", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "触发场景", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "感官细节", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "情感转折", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "结尾感悟", priority: 1, value: "", confidence: 0, status: "empty" },
  ],
  "小说": [
    { label: "核心人物", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "核心冲突", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "世界观设定", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "高潮设计", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "结局方向", priority: 1, value: "", confidence: 0, status: "empty" },
  ],
  "公众号": [
    { label: "切入角度", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "核心观点", priority: 1, value: "", confidence: 0, status: "empty" },
    { label: "共鸣场景", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "金句方向", priority: 2, value: "", confidence: 0, status: "empty" },
    { label: "行动建议", priority: 3, value: "", confidence: 0, status: "empty" },
  ],
};

function getSkeleton(anchor: string): SkeletonSection[] {
  const g = detectGenre(anchor);
  const template = GENRE_SKELETONS[g] || GENRE_SKELETONS["议论文"];
  return template.map((s) => ({ ...s }));
}

function detectGenre(input: string): string {
  if (/散文|回忆|故乡|院子|午后|季节/.test(input)) return "散文";
  if (/小说|故事|角色|情节|虚构/.test(input)) return "小说";
  if (/公众号|爆款|阅读量|涨粉/.test(input)) return "公众号";
  return "议论文";
}

// ═══════════════════════════════════════════════════════════════
// Init — always start with a skeleton
// ═══════════════════════════════════════════════════════════════

export function initCompletion(anchor: string): CompletionState {
  return {
    goal: anchor,
    genre: detectGenre(anchor),
    skeleton: getSkeleton(anchor),
    completion: 0,
    phase: "skeleton",
    round: 0,
    lastAdvance: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Completion detection
// ═══════════════════════════════════════════════════════════════

function calcCompletion(state: CompletionState): number {
  const done = state.skeleton.filter((s) => s.status === "done").length;
  const total = state.skeleton.length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function hasAdvanced(state: CompletionState): boolean {
  return state.skeleton.some((s) => s.status === "done");
}

// ═══════════════════════════════════════════════════════════════
// Main loop
// ═══════════════════════════════════════════════════════════════

export async function completionLoop(
  state: CompletionState,
  userInput: string = ""
): Promise<{ response: string; state: CompletionState }> {
  state.round += 1;

  // Phase 1: Generate skeleton immediately (round 1)
  if (state.phase === "skeleton") {
    // Pre-fill P1 sections with intelligent guesses
    const p1s = state.skeleton.filter((s) => s.priority === 1);
    for (const s of p1s) {
      if (!s.value) {
        s.value = `[待讨论] ${s.label}`;
        s.status = "building";
        s.confidence = 0.3;
      }
    }
    state.completion = calcCompletion(state);
    state.phase = "discussion";

    const response = await generateSkeletonResponse(state);
    return { response, state };
  }

  // Phase 2: Discussion — fill skeleton
  if (state.phase === "discussion") {
    // Apply user input to current building section
    if (userInput) {
      applyInput(state, userInput);
    }

    // Check if all P1 done → move to P2
    const p1Done = state.skeleton.filter((s) => s.priority === 1 && s.status === "done").length;
    const p1Total = state.skeleton.filter((s) => s.priority === 1).length;

    // Find next gap by priority
    const next = findNextPriorityGap(state);

    if (!next) {
      state.phase = "writing";
      state.completion = 100;
      const response = await generateDoneResponse(state);
      return { response, state };
    }

    const response = await generateDiscussionResponse(state, next);
    state.completion = calcCompletion(state);
    return { response, state };
  }

  // Phase 3: Writing — all sections done
  const response = "所有部分已完成。你现在可以开始写作了。";
  return { response, state };
}

// ═══════════════════════════════════════════════════════════════
// Input application
// ═══════════════════════════════════════════════════════════════

function applyInput(state: CompletionState, input: string) {
  // Find building section with lowest confidence
  const building = state.skeleton
    .filter((s) => s.status === "building")
    .sort((a, b) => a.confidence - b.confidence);

  if (building.length === 0) return;

  const target = building[0];

  // Mark as done if input is substantial
  if (input.length > 20 || /觉得|认为|因为|所以|但是/.test(input)) {
    target.value = input;
    target.confidence = 0.7;
    target.status = "done";
    state.lastAdvance = true;
  } else {
    target.value = target.value ? `${target.value} | ${input}` : input;
    target.confidence = Math.min(1, target.confidence + 0.2);
    if (target.confidence >= 0.6) {
      target.status = "done";
    }
    state.lastAdvance = true;
  }
}

// ═══════════════════════════════════════════════════════════════
// Priority-based gap finding
// ═══════════════════════════════════════════════════════════════

function findNextPriorityGap(state: CompletionState): SkeletonSection | null {
  for (const priority of [1, 2, 3]) {
    const gap = state.skeleton.find(
      (s) => s.priority === priority && s.status !== "done"
    );
    if (gap) return gap;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Response generators
// ═══════════════════════════════════════════════════════════════

async function generateSkeletonResponse(state: CompletionState): Promise<string> {
  const sections = state.skeleton
    .map((s) => `${s.priority === 1 ? "●" : "○"} ${s.label}`)
    .join("\n");

  const thought = `你已经看完用户的命题「${state.goal}」。

第一轮，你的任务不是提问。而是先搭骨架。

以下是已经预填的文章骨架：
${sections}

现在告诉用户：
1. 你已经初步理解了话题
2. 骨架已经搭好（展示骨架）
3. 下一步我们从●标记的核心部分开始讨论
4. 直接开始第一个话题

不要问"你觉得呢"。直接进入讨论。120字以内。`;

  if (isMockMode()) {
    return `我理解了——「${state.goal}」这个话题可以从这几个方向展开：\n\n${sections}\n\n我们从最核心的部分开始。关于${state.skeleton.find((s) => s.priority === 1 && s.status === "building")?.label || "第一个方向"}，你现在有什么想法？`;
  }

  const client = createClient();
  const r = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.5,
    max_tokens: 300,
    messages: [
      { role: "system", content: "你是写作搭档。目标是帮用户搭好文章骨架。直接、高效、温暖。" },
      { role: "user", content: thought },
    ],
  });
  return r.choices[0]?.message?.content || "";
}

async function generateDiscussionResponse(
  state: CompletionState,
  next: SkeletonSection
): Promise<string> {
  const done = state.skeleton
    .filter((s) => s.status === "done")
    .map((s) => `✓ ${s.label}: ${s.value.slice(0, 30)}`)
    .join("\n");

  const thought = `当前文章: ${state.goal}
完成度: ${state.completion}%
已完成:
${done || "(无)"}

现在聚焦: ${next.label} (P${next.priority === 1 ? "1核心" : next.priority === 2 ? "2支撑" : "3细节"})

P1优先于P3。细节问题（天气、颜色、声音）除非所有P1完成，否则禁止问。
当前任务：只讨论「${next.label}」，不跳其他话题。120字以内。`;

  if (isMockMode()) {
    return `我们来聊「${next.label}」。关于这个部分，你有什么想法或直觉？`;
  }

  const client = createClient();
  const r = await client.chat.completions.create({
    model: "deepseek-v4-pro",
    temperature: 0.6,
    max_tokens: 400,
    messages: [
      { role: "system", content: "你是写作搭档。一次只聚焦一个话题。P1核心优先于P3细节。不跳跃。" },
      { role: "user", content: thought },
    ],
  });
  return r.choices[0]?.message?.content || "";
}

async function generateDoneResponse(state: CompletionState): Promise<string> {
  const done = state.skeleton
    .filter((s) => s.status === "done")
    .map((s) => `✓ ${s.label}`)
    .join("\n");

  return `太好了！所有部分都完成了。\n\n${done}\n\n骨架100%完成——可以开始写作了。`;
}
