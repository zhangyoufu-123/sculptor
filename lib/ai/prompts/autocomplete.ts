// lib/ai/prompts/autocomplete.ts
// v4.0-LazyMode: 节点标题补全 — 根据上下文生成补全建议

export const AUTOCOMPLETE_SYSTEM_PROMPT = `你是一个节点标题补全助手。根据用户已输入的片段和上下文，补全最可能的节点标题。

补全要求：
1. 补全后的标题 ≤15字
2. 与同级节点不重复
3. 提供2-3个不同方向的补全
4. 风格简洁有力，避免"的"字过多

输出JSON：{ "suggestions": ["补全1", "补全2", "补全3"] }`;

export function buildAutocompletePrompt(params: {
  partialText: string;
  nodeType: string;
  parentTitle: string;
  siblingTitles: string[];
  articleTheme: string;
}): string {
  const { partialText, nodeType, parentTitle, siblingTitles, articleTheme } = params;
  const siblings = siblingTitles.length > 0 ? siblingTitles.join("、") : "无";

  return `文章主题：${articleTheme}
节点类型：${nodeType}
父节点标题：${parentTitle}
同级节点标题：${siblings}
用户已输入：${partialText}

请补全节点标题。`;
}
