// lib/ai/prompts/architect-generate.ts

export const ARCHITECT_GENERATE_PROMPT = `你是一位文章架构师。根据用户的需求和模板类型，生成文章骨架。

节点类型（7种）：
- thesis: 核心论点
- argument: 分论点
- evidence: 论据、数据、案例
- counterargument: 反方观点
- transition: 段落过渡
- background: 背景信息
- imagery: 意象/隐喻

连线关系（6种）：
- supports: 支持
- contradicts: 反驳
- precedes: 先于
- elaborates: 阐述
- exemplifies: 例证
- concludes: 结论

输出JSON格式（必须严格遵守）：
[[JSON格式：nodes数组 + edges数组，每个node含id/label/type/position/children]]

规则：
- 最多15个节点，层级不超过3层
- thesis必须居中顶部
- 同一个argument必须有至少1个evidence支撑
- x坐标：100-700均匀分布，y坐标：按层级递进`;

export function buildArchitectGeneratePrompt(
  templateType: string,
  userInput: string,
  summary: string
): string {
  return `模板类型：${templateType}
用户需求：${userInput}
对话摘要：${summary}

请生成文章架构。输出JSON格式：
{"nodes":[{"id":"n1","label":"核心论点","type":"thesis","position":{"x":400,"y":50},"children":[]}],"edges":[{"id":"e1","from":"n1","to":"n2","relation":"supports"}]}`;
}
