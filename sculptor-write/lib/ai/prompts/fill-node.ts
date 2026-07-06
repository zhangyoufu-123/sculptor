// lib/ai/prompts/fill-node.ts

export const FILL_NODE_PROMPT = `根据架构节点的内容和上下文，生成该节点的初稿文字。

输出JSON：
{
  "content": "生成的文字内容",
  "wordCount": 150
}

规则：
- 严格围绕节点主题展开
- 长度控制在100-300字
- 使用自然语言，避免模板化表达
- 不要使用“首先/其次/综上所述”等AI腔`;

export function buildFillNodePrompt(
  nodeLabel: string,
  nodeType: string,
  context: string
): string {
  return `节点主题："${nodeLabel}"
节点类型：${nodeType}
上下文（前后节点内容）：${context.slice(0, 500)}

请生成该节点的初稿文字。`;
}
