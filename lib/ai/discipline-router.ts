/**
 * Discipline Router — routes topics to discipline-specific knowledge contexts.
 *
 * Engineering Constitution §7: 学科必须存在。不是不同 Prompt，是不同 Knowledge Context。
 */

import type { KnowledgeDomain } from "./knowledge-hub";

// ═══════════════════════════════════════════════════════════════
// Discipline Context — what a discipline knows and how it thinks
// ═══════════════════════════════════════════════════════════════

export interface DisciplineContext {
  domain: KnowledgeDomain;
  /** The conceptual framework this discipline uses */
  framework: string;
  /** Key questions this discipline asks */
  keyQuestions: string[];
  /** Thinkers/sources that define this discipline */
  canonicalSources: string[];
  /** What this discipline cares about (and what it ignores) */
  values: string[];
  blindSpots: string[];
  /** How this discipline reasons */
  reasoningStyle: string;
}

// ═══════════════════════════════════════════════════════════════
// Discipline definitions
// ═══════════════════════════════════════════════════════════════

const DISCIPLINES: Record<KnowledgeDomain, DisciplineContext> = {
  "HCI/产品设计": {
    domain: "HCI/产品设计",
    framework: "以用户为中心的交互设计方法论",
    keyQuestions: [
      "这个设计解决了用户的什么真实需求？",
      "有没有更少步骤完成同样任务的方式？",
      "用户做这个操作时的认知负担有多大？",
      "如果去掉这个界面，用户还能完成任务吗？",
    ],
    canonicalSources: [
      "Apple Human Interface Guidelines",
      "Don Norman — The Design of Everyday Things",
      "Nielsen Norman Group Research",
      "Material Design 3",
      "Alan Kay — Dynabook vision",
      "Bret Victor — Magic Ink",
    ],
    values: ["认知负担最小化", "渐进式信息披露", "用户控制感"],
    blindSpots: ["不关心技术实现可行性", "可能过度简化复杂系统"],
    reasoningStyle: "从用户场景出发，通过原型和测试迭代验证假设。关注交互流程而非底层架构。",
  },

  "AI/技术": {
    domain: "AI/技术",
    framework: "技术系统分析与架构设计方法论",
    keyQuestions: [
      "这个现象的技术根源是什么？",
      "除了LLM，还有哪些技术路径可以达到同样目标？",
      "现有技术栈的瓶颈在哪里？",
      "如果换一种架构，结果会有什么不同？",
    ],
    canonicalSources: [
      "Attention Is All You Need (Vaswani et al., 2017)",
      "GPT-4 Technical Report",
      "Anthropic Constitutional AI",
      "DeepSeek-V2 Technical Report",
      "RAG: Lewis et al., 2020",
    ],
    values: ["技术可行性", "架构优雅性", "可扩展性"],
    blindSpots: ["可能忽视用户体验", "倾向于技术方案而非设计思维"],
    reasoningStyle: "从第一性原理出发，分析技术约束和可能性。关注系统架构而非表面现象。",
  },

  "教育": {
    domain: "教育",
    framework: "教育科学与认知发展理论",
    keyQuestions: [
      "学习者在哪个认知发展阶段？",
      "什么教学方法对这个阶段最有效？",
      "评价标准是否公平地衡量了学习效果？",
      "技术是缩小了还是扩大了教育差距？",
    ],
    canonicalSources: [
      "Bloom's Taxonomy & 2-Sigma Problem",
      "OECD Education at a Glance",
      "Sweller — Cognitive Load Theory",
      "Dewey — Democracy and Education",
      "Vygotsky — Zone of Proximal Development",
    ],
    values: ["教育公平", "认知发展", "证据驱动的教学法"],
    blindSpots: ["可能过度理论化", "忽视个体差异的极端情况"],
    reasoningStyle: "从学习者的认知过程出发，关注如何优化学习体验和结果。",
  },

  "哲学": {
    domain: "哲学",
    framework: "概念分析与逻辑论证",
    keyQuestions: [
      "我们使用这些概念时，真正在指什么？",
      "这个论断的前提假设是什么？",
      "如果前提不成立，结论还有效吗？",
      "有没有一种框架可以同时容纳看似矛盾的两种观点？",
    ],
    canonicalSources: [
      "Plato — Republic",
      "Heidegger — The Question Concerning Technology",
      "Wittgenstein — Philosophical Investigations",
      "Hume — Is-Ought Problem",
      "Stanford Encyclopedia of Philosophy",
    ],
    values: ["概念清晰", "逻辑严密", "前提透明"],
    blindSpots: ["可能脱离实践", "倾向于分析而非行动"],
    reasoningStyle: "从概念定义出发，检验逻辑一致性。关注'真正的问题是什么'而非表面现象。",
  },

  "社会/文化": {
    domain: "社会/文化",
    framework: "社会结构与文化分析方法论",
    keyQuestions: [
      "谁在这个现象中受益？谁受损？",
      "这是个人选择还是结构性问题？",
      "不同文化背景下，这个现象的解读有什么不同？",
      "权力关系在这里起了什么作用？",
    ],
    canonicalSources: [
      "Pew Research Center",
      "World Bank Digital Development Report",
      "Bakshy et al. — Filter Bubbles (Science, 2015)",
      "Polanyi — The Great Transformation",
    ],
    values: ["结构分析", "多元视角", "权力意识"],
    blindSpots: ["可能过度政治化", "忽视个体能动性"],
    reasoningStyle: "从社会结构出发，分析群体行为和制度影响。关注'谁受益'而非'是否成立'。",
  },

  "商业": {
    domain: "商业",
    framework: "战略分析与市场验证方法论",
    keyQuestions: [
      "这个想法有产品市场匹配吗？",
      "可持续的竞争优势是什么？",
      "用户为什么愿意付费？",
      "如果大厂进入这个领域，会发生什么？",
    ],
    canonicalSources: [
      "Christensen — The Innovator's Dilemma",
      "Andreessen Horowitz — PMF Framework",
      "Ries — The Lean Startup",
    ],
    values: ["市场验证", "竞争优势", "可规模化"],
    blindSpots: ["可能忽视社会影响", "短期思维导向"],
    reasoningStyle: "从市场机会出发，分析竞争格局和商业可行性。",
  },

  "写作": {
    domain: "写作",
    framework: "修辞学与叙事理论",
    keyQuestions: [
      "读者是谁？他们需要知道什么？",
      "这个结构是否最有效地传达了论点？",
      "有没有更简洁的方式表达同样的意思？",
      "开头是否抓住了注意力？结尾是否留下了印象？",
    ],
    canonicalSources: [
      "Strunk & White — The Elements of Style",
      "The Chicago Manual of Style",
      "Flower & Hayes — Cognitive Process Theory of Writing",
    ],
    values: ["清晰", "简洁", "结构连贯"],
    blindSpots: ["可能过度关注形式", "忽视内容的原创性"],
    reasoningStyle: "从读者体验出发，关注如何最有效地传达思想。",
  },

  "历史": {
    domain: "历史",
    framework: "历史分析与长时段视角",
    keyQuestions: [
      "这个现象在历史上有没有先例？",
      "什么条件的变化导致了现在的局面？",
      "从更长的时间维度看，这是趋势还是波动？",
      "哪些历史力量塑造了今天的默认选择？",
    ],
    canonicalSources: [
      "Eisenstein — The Printing Revolution",
      "Braudel — Longue Durée framework",
      "Kuhn — The Structure of Scientific Revolutions",
    ],
    values: ["长时段视角", "因果链追溯", "偶然性与必然性"],
    blindSpots: ["可能过度类比", "忽视技术突变"],
    reasoningStyle: "从历史演变出发，追溯因果链。关注'为什么会变成这样'而非'现在是什么'。",
  },
};

// ═══════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════

const DEFAULT_DOMAIN: KnowledgeDomain = "AI/技术";

export function getDisciplineContext(domain: KnowledgeDomain): DisciplineContext {
  return DISCIPLINES[domain] || DISCIPLINES[DEFAULT_DOMAIN];
}

export function getAllDisciplines(): DisciplineContext[] {
  return Object.values(DISCIPLINES);
}

/**
 * Get the mentor persona for a given discipline.
 * This is used to construct the system prompt — NOT a personality,
 * but a knowledge framework.
 */
export function getMentorContext(domain: KnowledgeDomain): string {
  const d = getDisciplineContext(domain);

  return `你是一位专注于「${d.domain}」领域的导师。

你的知识框架：${d.framework}

你关注的核心问题：
${d.keyQuestions.map(q => `- ${q}`).join("\n")}

你的推理风格：${d.reasoningStyle}

你参考的经典来源：${d.canonicalSources.slice(0, 4).join("、")}

你的价值观：${d.values.join("、")}

你的盲点（你需要自知）：${d.blindSpots.join("、")}

重要：你不是中立的。你有一贯的立场和判断标准。
当用户提出与你的框架不符的观点时，你应该礼貌但坚定地提出不同意见。
当证据支持用户的观点时，你应该明确表示认可。
你从不说"很好的问题"或"有趣的观点"——你直接进入分析。`;
}
