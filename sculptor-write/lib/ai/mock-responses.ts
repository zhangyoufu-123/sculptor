// lib/ai/mock-responses.ts
// Centralized mock responses for development without API keys.
// Activated when NEXT_PUBLIC_MOCK_MODE=true.

export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
}

// MOCK: Architect align responses
export const MOCK_ALIGN_RESPONSES = [
  { type: "question", content: "在开始搭建架构之前，我想先了解：这篇文章最想传达的核心观点是什么？" },
  { type: "question", content: "明白了。你希望读者读完后有什么感觉？是受到启发、获得新知，还是产生共鸣？" },
  { type: "template", content: "根据你的回答，我推荐使用散文模板，以意象驱动展开。", templateType: "essay" },
];

// MOCK: Architect generate response
export const MOCK_GENERATE_RESPONSE = {
  nodes: [
    { id: "n1", label: "城市热岛的记忆", type: "thesis", position: { x: 400, y: 30 }, children: ["n2", "n3", "n4"] },
    { id: "n2", label: "夏夜的引入", type: "background", position: { x: 200, y: 140 }, children: [] },
    { id: "n3", label: "热浪中的城市", type: "argument", position: { x: 400, y: 140 }, children: ["n5"] },
    { id: "n4", label: "记忆的清凉", type: "argument", position: { x: 600, y: 140 }, children: [] },
    { id: "n5", label: "柏油路面的反光", type: "imagery", position: { x: 400, y: 250 }, children: [] },
  ],
  edges: [
    { id: "e1", from: "n2", to: "n3", relation: "precedes" },
    { id: "e2", from: "n3", to: "n4", relation: "precedes" },
    { id: "e3", from: "n1", to: "n5", relation: "elaborates" },
  ],
};

// MOCK: Architect expand response
export const MOCK_EXPAND_RESPONSE = {
  suggestedNodes: [
    { label: "具体数据支撑", type: "evidence" },
    { label: "对比案例", type: "evidence" },
  ],
  suggestedEdges: [
    { from: "parent", to: "child1", relation: "exemplifies" },
    { from: "parent", to: "child2", relation: "elaborates" },
  ],
  reasoning: "该论点需要具体数据和对比案例来增强说服力",
};

// MOCK: Architect review response
export const MOCK_REVIEW_RESPONSE = {
  issues: [
    { nodeId: "n2", severity: "yellow", message: "背景引入可能需要更多铺垫", suggestion: "建议添加一段关于城市发展的背景" },
    { nodeId: "n4", severity: "green", message: "结构完整", suggestion: "" },
  ],
  overallScore: 78,
};

// MOCK: Fill node response
export const MOCK_FILL_NODE_RESPONSE = {
  content: "夏夜的热浪像一层透明的帷幕，笼罩着整座城市。柏油路面在日落后依然散发着白日的余温，空气里弥漫着空调外机吐出的湿热。行人步履匆匆，仿佛在逃离某种看不见的追赶。",
  wordCount: 85,
};

// MOCK: Ghost text responses
export const MOCK_GHOST_TEXTS = [
  "微风拂过湖面，泛起层层涟漪，像是时光在轻声诉说。",
  "阳光透过树叶的缝隙洒落下来，在地面上投下斑驳的光影。",
  "远处的山峦在薄雾中若隐若现，仿佛一幅未完成的水墨画。",
];

// MOCK: Pipeline suggestion responses
export const MOCK_PIPELINE_RESPONSE = (intent: string) => ({
  options: [
    {
      text: "晨光穿过林间的薄雾，在湿润的草地上投下细碎的光斑，空气里带着泥土和青草的气息。",
      style_shift: "more_poetic",
    },
    {
      text: "清晨时分，林间的光线柔和地洒落，草地上的露珠闪烁着微光，整片林子笼罩在宁静的氛围中。",
      style_shift: "more_direct",
    },
    {
      text: "薄雾在林间缭绕，每一缕晨光都像是被筛过的金粉，轻轻落在苔藓和蕨叶上，把这片林地变成了一个寂静的圣殿。",
      style_shift: "more_atmospheric",
    },
  ],
});
