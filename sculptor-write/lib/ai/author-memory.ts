// lib/ai/author-memory.ts
// Author Memory 辅助函数 —— 默认数据、禁忌过滤、AI 上下文构建器

import type { AuthorMemory } from "@/types/author";

// ── 默认作者记忆（Mock 数据） ──────────────────────────────

export function getDefaultMemory(): AuthorMemory {
  return {
    preferences: [
      "偏好短句，单句不超过 25 字",
      "偏好白描手法，少用形容词",
      "偏好含蓄留白，避免直接说教",
      "偏好具象比喻，以物写情",
    ],
    dislikes: [
      "不喜欢过度华丽的修辞堆砌",
      "不喜欢口号式的结尾",
      "不喜欢大段内心独白",
    ],
    habits: [
      "常用冒号引出细节描写",
      "善用排比句式营造节奏",
      "段落首句常有时间或空间锚点",
      "对话中穿插环境白描",
    ],
    masterpieces: [
      {
        title: "《城南旧事》节选",
        excerpt:
          "太阳从大玻璃窗透进来，照到大理石的地面上，反射出柔和的光。我坐在窗前，看着阳光一寸一寸地挪动。",
        style: "白描、留白、以景写情",
        score: 95,
      },
      {
        title: "《故乡的秋》节选",
        excerpt:
          "秋天，无论在什么地方的秋天，总是好的；可是啊，北国的秋，却特别地来得清，来得静，来得悲凉。",
        style: "排比、抒情、节奏感强",
        score: 88,
      },
      {
        title: "《边城》节选",
        excerpt:
          "小溪流下去，绕山岨流去了约三里便汇入茶峒的大河。人若过溪越小山走去，则只一里路就到了茶峒城边。",
        style: "朴素叙事、空间锚点、简练",
        score: 90,
      },
    ],
    forbiddenExpressions: [
      "综上所述",
      "总而言之",
      "一言以蔽之",
      "众所周知",
      "不言而喻",
      "在这个快节奏的时代",
      "随着社会的发展",
    ],
  };
}

// ── 禁忌表达过滤 ──────────────────────────────────────────

/**
 * 从文本中移除所有禁忌表达。
 * 使用正则匹配并替换为空字符串，同时清理多余空格。
 */
export function applyForbiddenFilter(
  text: string,
  memory: AuthorMemory
): string {
  if (!memory.forbiddenExpressions || memory.forbiddenExpressions.length === 0) {
    return text;
  }

  let filtered = text;

  for (const expr of memory.forbiddenExpressions) {
    // Escape special regex characters in the expression
    const escaped = expr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    filtered = filtered.replace(regex, "");
  }

  // Clean up: remove double+ spaces, spaces before punctuation
  filtered = filtered
    .replace(/\s{2,}/g, " ")
    // Chinese punctuation preceded by space
    .replace(/\s+([，。；：、！？）】》）])/g, "$1")
    // Space before opening Chinese punctuation
    .replace(/([（【《])\s+/g, "$1")
    // Empty lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return filtered;
}

// ── AI 提示词上下文构建器 ────────────────────────────────

/**
 * 将作者记忆构建为可直接注入 AI system prompt 的上下文文本。
 * 用于风格引擎、续写建议等场景，让 AI 了解作者的偏好与禁忌。
 */
export function buildMemoryContext(memory: AuthorMemory): string {
  const lines: string[] = [];

  lines.push("## 作者写作偏好与风格记忆");
  lines.push("");

  // 偏好
  if (memory.preferences && memory.preferences.length > 0) {
    lines.push("### 写作偏好");
    for (const p of memory.preferences) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }

  // 不喜欢的表达
  if (memory.dislikes && memory.dislikes.length > 0) {
    lines.push("### 避讳风格");
    for (const d of memory.dislikes) {
      lines.push(`- ${d}`);
    }
    lines.push("");
  }

  // 写作习惯
  if (memory.habits && memory.habits.length > 0) {
    lines.push("### 写作习惯");
    for (const h of memory.habits) {
      lines.push(`- ${h}`);
    }
    lines.push("");
  }

  // 禁忌表达（重要：明确告诉 AI 绝对不能出现）
  if (memory.forbiddenExpressions && memory.forbiddenExpressions.length > 0) {
    lines.push("### 禁忌表达（绝对不能出现以下词句）");
    for (const fe of memory.forbiddenExpressions) {
      lines.push(`- 「${fe}」—— 绝对禁止`);
    }
    lines.push("");
  }

  // 代表作参考
  if (memory.masterpieces && memory.masterpieces.length > 0) {
    lines.push("### 代表作风格参考");
    for (let i = 0; i < memory.masterpieces.length; i++) {
      const mp = memory.masterpieces[i];
      lines.push(`**${i + 1}. ${mp.title}**（风格匹配度: ${mp.score}/100）`);
      lines.push(`  风格标签: ${mp.style}`);
      lines.push(`  示例: "${mp.excerpt}"`);
    }
    lines.push("");
  }

  lines.push("请严格遵循以上偏好与禁忌。优先模仿代表作的风格特征，避免使用任何禁忌表达。");

  return lines.join("\n");
}
