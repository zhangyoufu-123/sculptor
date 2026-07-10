// lib/ai/prompts/architect-expand.ts

export const ARCHITECT_EXPAND_PROMPT = `为指定的架构节点补充2-3个子节点。

输出JSON：
{
  "suggestedNodes": [
    {"label":"子节点标签","type":"evidence|argument|transition|background|imagery"}
  ],
  "suggestedEdges": [
    {"from":"父节点ID","to":"新节点ID","relation":"supports|elaborates|exemplifies"}
  ],
  "reasoning": "为什么建议这些子节点"
}

规则：
- 子节点类型要与父节点类型匹配
- 每个建议要有明确的逻辑关系
- reasoning要简短（1-2句话）`;

export function buildExpandPrompt(
  nodeLabel: string,
  nodeType: string,
  nodeChildren: string
): string {
  return `节点内容："${nodeLabel}"
节点类型：${nodeType}
已有子节点：${nodeChildren || "无"}

请建议2-3个新的子节点。`;
}
