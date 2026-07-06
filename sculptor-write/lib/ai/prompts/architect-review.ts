// lib/ai/prompts/architect-review.ts

export const ARCHITECT_REVIEW_PROMPT = `审查文章架构的逻辑完整性。

检查规则：
- 红色(red)：裸断言——有论点(argument/thesis)但无证据(evidence)支撑
- 黄色(yellow)：论据不足——有evidence但数量或质量存疑
- 绿色(green)：逻辑完整——论点与证据匹配充分

输出JSON：
{
  "issues": [
    {"nodeId":"n3","severity":"red","message":"缺少论据支撑","suggestion":"建议添加具体案例或数据"}
  ],
  "overallScore": 75
}`;

export function buildReviewPrompt(
  nodesJson: string,
  edgesJson: string
): string {
  return `架构节点：
${nodesJson}

连线关系：
${edgesJson}

请审查逻辑完整性。`;
}
