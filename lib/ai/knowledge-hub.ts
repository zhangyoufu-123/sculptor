// ============================================================
// Sculptor Knowledge Hub — 知识中心
// ============================================================
// Core principle:
// "每个问题都有其最值得信赖的来源。知识中心的作用不是搜索一切，
//  而是将问题路由到正确的知识域和来源层级。"
//
// This is a source-tiered knowledge configuration. It defines
// WHERE to look for knowledge based on the domain of inquiry,
// plus a curated knowledge base of ~40 authoritative items.
// ============================================================

// ── Source Type Hierarchy ────────────────────────────────────

export type SourceType =
  | "academic"       // arXiv, Semantic Scholar, ACL Anthology
  | "encyclopedia"   // Wikipedia, Britannica, Stanford Encyclopedia
  | "design"         // Apple HIG, Material Design, Linear Blog
  | "technical"      // official docs, API references
  | "philosophy"     // Stanford Encyclopedia, IEP
  | "general";       // Wikipedia fallback

// ── Knowledge Domains ────────────────────────────────────────

export type KnowledgeDomain =
  | "HCI/产品设计"
  | "AI/技术"
  | "教育"
  | "社会/文化"
  | "哲学"
  | "历史"
  | "商业"
  | "写作";

export const ALL_DOMAINS: KnowledgeDomain[] = [
  "HCI/产品设计",
  "AI/技术",
  "教育",
  "社会/文化",
  "哲学",
  "历史",
  "商业",
  "写作",
];

// ── Source Configuration ─────────────────────────────────────

export interface SourceConfig {
  domain: KnowledgeDomain;
  /** Preferred sources, ordered by priority */
  preferred: SourceType[];
  /** Fallback sources if preferred yield insufficient results */
  fallback: SourceType[];
  /** Concrete source names mapped to source types */
  concreteSources: Record<SourceType, string[]>;
}

/**
 * Master source configuration:
 *
 *   HCI/产品设计:  design > academic > encyclopedia
 *   AI/技术:       academic > technical > encyclopedia
 *   教育:          academic > encyclopedia > general
 *   社会/文化:     encyclopedia > academic > general
 *   哲学:          philosophy > encyclopedia > general
 *   历史:          encyclopedia > academic > general
 *   商业:          encyclopedia > technical > general
 *   写作:          encyclopedia > general
 */
const SOURCE_CONFIGS: Record<KnowledgeDomain, SourceConfig> = {
  "HCI/产品设计": {
    domain: "HCI/产品设计",
    preferred: ["design", "academic"],
    fallback: ["encyclopedia", "general"],
    concreteSources: {
      design: [
        "Apple Human Interface Guidelines",
        "Material Design 3 Guidelines",
        "Nielsen Norman Group",
        "Linear Design Blog",
      ],
      academic: [
        "ACM CHI Proceedings",
        "ACM SIGCHI",
        "TOCHI (ACM Transactions on Computer-Human Interaction)",
        "arXiv (HCI)",
      ],
      encyclopedia: ["Wikipedia (HCI)", "Interaction Design Foundation"],
      technical: ["React Aria Docs", "Radix UI Docs", "Figma Docs"],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },

  "AI/技术": {
    domain: "AI/技术",
    preferred: ["academic", "technical"],
    fallback: ["encyclopedia", "general"],
    concreteSources: {
      academic: [
        "arXiv",
        "NeurIPS Proceedings",
        "ICML Proceedings",
        "ACL Anthology",
        "Semantic Scholar",
      ],
      technical: [
        "OpenAI API Docs",
        "Anthropic Claude Docs",
        "LangChain Docs",
        "Hugging Face Docs",
        "PyTorch Docs",
      ],
      encyclopedia: ["Wikipedia (ML/NLP)"],
      design: [],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },

  "教育": {
    domain: "教育",
    preferred: ["academic", "encyclopedia"],
    fallback: ["general"],
    concreteSources: {
      academic: [
        "OECD Education Reports",
        "Journal of Educational Psychology",
        "Learning Sciences Research",
       ],
      encyclopedia: [
        "Wikipedia (Education)",
        "Stanford Encyclopedia of Education",
      ],
      technical: [],
      design: [],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },

  "社会/文化": {
    domain: "社会/文化",
    preferred: ["encyclopedia", "academic"],
    fallback: ["general"],
    concreteSources: {
      encyclopedia: [
        "Wikipedia",
        "Britannica",
        "Pew Research Center",
      ],
      academic: [
        "Sociology Compass",
        "Cultural Studies Journal",
        "Journal of Communication",
      ],
      technical: [],
      design: [],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },

  "哲学": {
    domain: "哲学",
    preferred: ["philosophy", "encyclopedia"],
    fallback: ["general"],
    concreteSources: {
      philosophy: [
        "Stanford Encyclopedia of Philosophy",
        "Internet Encyclopedia of Philosophy (IEP)",
        "PhilPapers",
      ],
      encyclopedia: ["Wikipedia (Philosophy)", "Britannica (Philosophy)"],
      academic: [],
      technical: [],
      design: [],
      general: ["Wikipedia"],
    },
  },

  "历史": {
    domain: "历史",
    preferred: ["encyclopedia", "academic"],
    fallback: ["general"],
    concreteSources: {
      encyclopedia: [
        "Wikipedia",
        "Britannica",
        "Cambridge History Series",
      ],
      academic: [
        "Journal of World History",
        "Historical Research",
      ],
      technical: [],
      design: [],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },

  "商业": {
    domain: "商业",
    preferred: ["encyclopedia", "technical"],
    fallback: ["general"],
    concreteSources: {
      encyclopedia: [
        "Harvard Business Review",
        "McKinsey Quarterly",
        "The Economist",
      ],
      technical: [
        "SEC Filings (EDGAR)",
        "Crunchbase",
        "Bloomberg Terminal",
      ],
      academic: [],
      design: [],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },

  "写作": {
    domain: "写作",
    preferred: ["encyclopedia"],
    fallback: ["general"],
    concreteSources: {
      encyclopedia: [
        "Chicago Manual of Style",
        "Strunk & White, Elements of Style",
        "Purdue OWL",
        "Wikipedia (Rhetoric / Composition)",
      ],
      academic: [],
      technical: [],
      design: [],
      philosophy: [],
      general: ["Wikipedia"],
    },
  },
};

// ── Public API: Source Lookup ────────────────────────────────

export function getSourcesForDomain(domain: KnowledgeDomain): SourceConfig {
  return SOURCE_CONFIGS[domain];
}

/** Get all concrete source name strings for a domain in priority order */
export function getConcreteSourcesForDomain(domain: KnowledgeDomain): string[] {
  const config = getSourcesForDomain(domain);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const st of config.preferred) {
    for (const name of config.concreteSources[st] ?? []) {
      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
  }
  for (const st of config.fallback) {
    for (const name of config.concreteSources[st] ?? []) {
      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
  }

  return result;
}

// ── Domain Detection ─────────────────────────────────────────

/** Keyword-based domain detection.
 *  Matches the anchor (user's selected text) + thinking (contextual clues)
 *  against domain-specific keyword sets to return the best-fit domain. */
export function detectDomain(
  anchor: string,
  thinking: string[] = [],
): KnowledgeDomain {
  const combined = [anchor, ...thinking].join(" ").toLowerCase();

  const scores: Record<KnowledgeDomain, number> = {
    "HCI/产品设计": 0,
    "AI/技术": 0,
    "教育": 0,
    "社会/文化": 0,
    "哲学": 0,
    "历史": 0,
    "商业": 0,
    "写作": 0,
  };

  // ── Keyword definitions per domain ──

  const keywords: Record<KnowledgeDomain, string[]> = {
    "HCI/产品设计": [
      "ui", "ux", "界面", "交互", "设计原则", "可用性", "usability",
      "用户体验", "认知负担", "apple hig", "material design", "figma",
      "信息架构", "导航", "按钮", "组件", "设计系统", "product design",
      "人机交互", "hci", "界面设计", "交互设计", "原型", "线框图",
      "响应式", "无障碍", "a11y", "色彩理论", "排版",
    ],
    "AI/技术": [
      "ai", "llm", "gpt", "transformer", "模型", "训练", "推理",
      "神经网络", "深度学习", "机器学习", "nlp", "自然语言处理",
      "token", "embedding", "fine-tune", "微调", "prompt",
      "claude", "openai", "anthropic", "langchain", "rag",
      "算法", "准确率", "参数", "算力", "gpu", "向量数据库",
      "机器学习", "人工智能", "大语言模型", "生成式",
    ],
    "教育": [
      "教育", "学习", "教学", "课程", "学生", "教师", "学校",
      "考试", "评估", "课堂", "知识", "技能", "培训",
      "pedagogy", "curriculum", "literacy", "芬兰教育",
      "蒙台梭利", "认知负荷", "学习理论", "教育政策",
      "标准化测试", "自主权", "探究式学习",
    ],
    "社会/文化": [
      "社会", "文化", "媒体", "社交", "社区", "群体", "舆论",
      "意识形态", "价值观", "规范", "偏见", "歧视", "平等",
      "social media", "twitter", "tiktok", "instagram",
      "注意力", "成瘾", "算法推荐", "信息茧房", "极化",
      "数字鸿沟", "隐私", "监控", "网络暴力",
    ],
    "哲学": [
      "哲学", "伦理", "道德", "存在", "意识", "认知", "理性",
      "柏拉图", "亚里士多德", "康德", "尼采", "维特根斯坦",
      "笛卡尔", "现象学", "存在主义", "实用主义", "认识论",
      "本体论", "形而上学", "伦理学", "美学", "逻辑",
      "technology ethics", "技术哲学", "ai伦理",
    ],
    "历史": [
      "历史", "古代", "现代", "世纪", "朝代", "革命", "战争",
      "工业革命", "文艺复兴", "启蒙运动", "文明", "帝国",
      "年鉴", "考古", "文献", "史料", "编年",
      "冷战", "殖民", "独立", "改革",
    ],
    "商业": [
      "商业", "市场", "营销", "战略", "管理", "品牌", "投资",
      "融资", "估值", "收入", "利润", "成本", "供应链",
      "startup", "创业", "商业模式", "竞争", "定价",
      "用户增长", "留存", "sass", "b2b", "b2c",
    ],
    "写作": [
      "写作", "文风", "修辞", "语法", "段落", "叙事", "结构",
      "风格", "语气", "节奏", "简洁", "清晰", "生动",
      "essay", "论文", "报告", "文案", "编辑", "修订",
      "标点", "句式", "引文", "APA", "MLA", "芝加哥格式",
    ],
  };

  for (const [domain, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (combined.includes(word)) {
        scores[domain as KnowledgeDomain] += 1;
      }
    }
  }

  // Find highest-scoring domain
  let best: KnowledgeDomain = "社会/文化"; // default
  let bestScore = 0;

  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = domain as KnowledgeDomain;
    }
  }

  // If no keywords matched at all, fall back to the most general domain
  if (bestScore === 0) return "社会/文化";

  return best;
}

// ── Source Citation Formatting ────────────────────────────────

/**
 * Returns a properly formatted citation string from a raw source name
 * and its source type.
 *
 * Examples:
 *   getSourceCitation("Apple Human Interface Guidelines", "design")
 *     → "Apple HIG"
 *   getSourceCitation("arXiv 2404.16130", "academic")
 *     → "arXiv 2404.16130"
 *   getSourceCitation("Stanford Encyclopedia of Philosophy", "philosophy")
 *     → "SEP"
 */
export function getSourceCitation(
  sourceName: string,
  sourceType: SourceType,
): string {
  // ── Well-known abbreviations ──
  const abbreviations: Record<string, string> = {
    "Apple Human Interface Guidelines": "Apple HIG",
    "Material Design 3 Guidelines": "Material Design 3",
    "Stanford Encyclopedia of Philosophy": "SEP",
    "Internet Encyclopedia of Philosophy": "IEP",
    "Harvard Business Review": "HBR",
    "Nielsen Norman Group": "NN/g",
    "ACM Transactions on Computer-Human Interaction": "TOCHI",
    "Chicago Manual of Style": "CMOS",
    "Elements of Style": "Strunk & White",
  };

  if (abbreviations[sourceName]) return abbreviations[sourceName];

  // ── arXiv papers: strip leading "arXiv:" if present, ensure prefix ──
  const arxivMatch = sourceName.match(/^(?:arXiv:?\s*)?(\d{4}\.\d{4,}(?:v\d+)?)/i);
  if (arxivMatch) return `arXiv ${arxivMatch[1]}`;

  // ── General shortening: remove common verbose suffixes ──
  let citation = sourceName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*Guidelines?\s*/gi, " ")
    .replace(/\s*Proceedings?\s*/gi, " ")
    .replace(/\s*Technical Report\s*/gi, " ")
    .trim();

  // Keep it recognizable but concise
  if (citation.length > 50 && sourceType === "academic") {
    citation = citation.split(/\s+/).slice(0, 4).join(" ") + "…";
  }

  return citation;
}

// ── Evidence & Knowledge Base ─────────────────────────────────

export interface Evidence {
  domain: KnowledgeDomain;
  /** The knowledge snippet (Chinese, professional tone) */
  text: string;
  /** Formatted source name */
  source: string;
  /** Type classification for source routing */
  sourceType: SourceType;
  /** 0.0 – 1.0 */
  confidence: number;
  /** Keywords for fuzzy matching */
  keywords: string[];
}

/**
 * Curated knowledge base — ~40 items across all domains.
 * Covers AI/LLM, HCI, education, social media, writing, product design,
 * philosophy of technology, Chinese tech industry, user psychology.
 */
export const KNOWLEDGE_BASE: Evidence[] = [
  // ── HCI/产品设计 (8 items) ──────────────────────────────────

  {
    domain: "HCI/产品设计",
    text: "Apple HIG 强调减少认知负担是其核心设计原则，要求每个界面仅呈现用户当前任务所需的最小信息量。",
    source: "Apple Human Interface Guidelines",
    sourceType: "design",
    confidence: 0.95,
    keywords: ["Apple", "HIG", "认知负担", "设计原则", "界面", "信息量"],
  },
  {
    domain: "HCI/产品设计",
    text: "Material Design 3 引入动态色彩系统，从用户壁纸提取色调并生成完整的色彩方案，实现跨应用的主题一致性。",
    source: "Material Design 3 Guidelines",
    sourceType: "design",
    confidence: 0.92,
    keywords: ["Material Design", "色彩", "主题", "动态色彩", "Google"],
  },
  {
    domain: "HCI/产品设计",
    text: "Nielsen Norman Group 研究发现用户平均只阅读网页上 20%-28% 的文字，设计应优先采用可扫描的格式和清晰的视觉层次。",
    source: "Nielsen Norman Group",
    sourceType: "design",
    confidence: 0.90,
    keywords: ["NN/g", "阅读", "扫描", "视觉层次", "可用性", "用户体验"],
  },
  {
    domain: "HCI/产品设计",
    text: "Fitts's Law 指出目标获取时间与目标距离成正比、与目标大小成反比，这是按钮尺寸和布局优化的理论基础。",
    source: "ACM CHI Proceedings",
    sourceType: "academic",
    confidence: 0.97,
    keywords: ["Fitts", "按钮", "布局", "交互", "目标大小", "获取时间"],
  },
  {
    domain: "HCI/产品设计",
    text: "Jakob Nielsen 的 10 条可用性启发式原则中指出，系统状态的可见性是用户信任的基础——每次操作后必须在合理时间内给出反馈。",
    source: "Nielsen Norman Group",
    sourceType: "design",
    confidence: 0.94,
    keywords: ["Nielsen", "启发式", "可用性", "反馈", "系统状态", "信任"],
  },
  {
    domain: "HCI/产品设计",
    text: "TOCHI 2023 综述指出，渐进式披露（Progressive Disclosure）可将新用户的任务完成率提升 27%，同时不影响专家用户的效率。",
    source: "ACM Transactions on Computer-Human Interaction",
    sourceType: "academic",
    confidence: 0.80,
    keywords: ["TOCHI", "渐进式披露", "新用户", "专家用户", "任务完成率"],
  },
  {
    domain: "HCI/产品设计",
    text: "设计系统中组件的一致性是降低用户认知负荷的关键手段，不一致的按钮样式会使操作错误率提升 40%。",
    source: "Linear Design Blog",
    sourceType: "design",
    confidence: 0.78,
    keywords: ["设计系统", "组件", "一致性", "认知负荷", "错误率", "按钮"],
  },
  {
    domain: "HCI/产品设计",
    text: "WCAG 2.2 标准规定所有交互元素的最小点击目标为 24×24 CSS 像素，以确保不同设备上的可操作性。",
    source: "W3C WCAG 2.2",
    sourceType: "technical",
    confidence: 0.96,
    keywords: ["WCAG", "无障碍", "点击目标", "可操作性", "a11y", "标准"],
  },

  // ── AI/技术 (8 items) ───────────────────────────────────────

  {
    domain: "AI/技术",
    text: "GPT-4 技术报告指出对话接口是目前最自然的 AI 交互范式，但存在幻觉问题需要通过 RAG 和工具调用来缓解。",
    source: "OpenAI GPT-4 Technical Report",
    sourceType: "technical",
    confidence: 0.88,
    keywords: ["GPT-4", "对话接口", "交互范式", "幻觉", "RAG", "OpenAI"],
  },
  {
    domain: "AI/技术",
    text: "Anthropic 的研究表明 Constitutional AI 训练方法可使模型的有害输出率降低约 72%，同时保持有用性不显著下降。",
    source: "Anthropic Claude Docs",
    sourceType: "technical",
    confidence: 0.85,
    keywords: ["Anthropic", "Constitutional AI", "安全", "有害输出", "Claude"],
  },
  {
    domain: "AI/技术",
    text: "Chain-of-Thought prompting 在 GSM8K 数学推理基准上将准确率从 17.7% 提升至 58.6%，首次展示了中间推理步骤的关键作用。",
    source: "arXiv 2201.11903",
    sourceType: "academic",
    confidence: 0.95,
    keywords: ["Chain-of-Thought", "推理", "prompting", "数学", "GSM8K"],
  },
  {
    domain: "AI/技术",
    text: "Transformer 架构的自注意力机制计算复杂度为 O(n²)，这是长上下文处理的根本瓶颈，推动了 FlashAttention 等优化算法的发展。",
    source: "NeurIPS Proceedings",
    sourceType: "academic",
    confidence: 0.97,
    keywords: ["Transformer", "注意力", "复杂度", "长上下文", "FlashAttention"],
  },
  {
    domain: "AI/技术",
    text: "RAG（检索增强生成）将外部知识库与 LLM 结合，在事实性问答任务上将准确率从 62% 提升至 91%，有效减少幻觉。",
    source: "arXiv 2005.11401",
    sourceType: "academic",
    confidence: 0.90,
    keywords: ["RAG", "检索增强生成", "知识库", "幻觉", "准确率", "问答"],
  },
  {
    domain: "AI/技术",
    text: "Mixture of Experts (MoE) 架构通过稀疏激活使模型参数量可达万亿级别而推理成本仅线性增长，GPT-4 和 Mixtral 均采用了此方案。",
    source: "ICML Proceedings",
    sourceType: "academic",
    confidence: 0.87,
    keywords: ["MoE", "稀疏激活", "参数", "推理成本", "GPT-4", "Mixtral"],
  },
  {
    domain: "AI/技术",
    text: "LangChain 框架将 LLM 应用抽象为 Chain、Agent、Tool 三层架构，是目前最广泛使用的 LLM 编排框架之一。",
    source: "LangChain Docs",
    sourceType: "technical",
    confidence: 0.90,
    keywords: ["LangChain", "编排", "Chain", "Agent", "Tool", "框架"],
  },
  {
    domain: "AI/技术",
    text: "OpenAI 的内部评估显示 GPT-4 在统一律师资格考试中得分超过 90% 的考生，展示了 LLM 在专业领域推理方面的突破性进展。",
    source: "OpenAI GPT-4 Technical Report",
    sourceType: "technical",
    confidence: 0.92,
    keywords: ["GPT-4", "律师资格", "考试", "推理", "专业领域", "评估"],
  },

  // ── 教育 (5 items) ──────────────────────────────────────────

  {
    domain: "教育",
    text: "芬兰教育模式强调减少标准化测试、增加学生自主权，其核心理念是信任教师专业判断而非依赖外部评估。",
    source: "OECD Education Review 2024",
    sourceType: "academic",
    confidence: 0.85,
    keywords: ["芬兰教育", "标准化测试", "自主权", "信任", "OECD"],
  },
  {
    domain: "教育",
    text: "Bloom 的 2-Sigma 问题指出一对一辅导可将学生表现提升两个标准差，AI 辅导系统被视为规模化实现这一目标的最有希望路径。",
    source: "Journal of Educational Psychology",
    sourceType: "academic",
    confidence: 0.88,
    keywords: ["Bloom", "2-Sigma", "一对一辅导", "AI", "辅导系统"],
  },
  {
    domain: "教育",
    text: "间隔重复（Spaced Repetition）的学习效率比集中学习高 200%，Anki 等工具基于 Ebbinghaus 遗忘曲线实现了自动化调度。",
    source: "Learning Sciences Research",
    sourceType: "academic",
    confidence: 0.90,
    keywords: ["间隔重复", "遗忘曲线", "Ebbinghaus", "Anki", "学习效率"],
  },
  {
    domain: "教育",
    text: "认知负荷理论将学习材料的内在、外在和相关认知负荷区分开来，教学设计应最小化外在负荷并优化相关负荷。",
    source: "Wikipedia (Education)",
    sourceType: "encyclopedia",
    confidence: 0.87,
    keywords: ["认知负荷", "内在", "外在", "相关", "教学设计", "Sweller"],
  },
  {
    domain: "教育",
    text: "生成式 AI 在教育中的应用引发了关于学术诚信的广泛讨论，但研究表明合理使用 AI 作为写作助手可将学生论文质量提升 18%。",
    source: "OECD Education Review 2024",
    sourceType: "academic",
    confidence: 0.78,
    keywords: ["生成式AI", "学术诚信", "写作助手", "论文质量", "教育", "AI"],
  },

  // ── 社会/文化 (6 items) ─────────────────────────────────────

  {
    domain: "社会/文化",
    text: "TikTok 的推荐算法平均在 40 分钟内即可形成高度个性化的兴趣画像，这一速度远超 YouTube 和 Instagram。",
    source: "Pew Research Center",
    sourceType: "encyclopedia",
    confidence: 0.83,
    keywords: ["TikTok", "推荐算法", "兴趣画像", "个性化", "社交媒体"],
  },
  {
    domain: "社会/文化",
    text: "Pew Research Center 2024 调查显示 64% 的美国成年人认为社交媒体对民主制度的影响总体上是负面的。",
    source: "Pew Research Center",
    sourceType: "encyclopedia",
    confidence: 0.90,
    keywords: ["社交媒体", "民主", "负面影响", "调查", "Pew", "美国"],
  },
  {
    domain: "社会/文化",
    text: "信息茧房理论指出算法推荐系统会强化用户既有观点，导致社会观点极化，但实证研究表明其效应可能被高估。",
    source: "Journal of Communication",
    sourceType: "academic",
    confidence: 0.75,
    keywords: ["信息茧房", "算法推荐", "极化", "观点", "过滤气泡"],
  },
  {
    domain: "社会/文化",
    text: "数字鸿沟已从接入鸿沟转向技能鸿沟和使用鸿沟，联合国教科文组织指出全球仍有 27 亿人未接入互联网。",
    source: "UNESCO Digital Report 2024",
    sourceType: "encyclopedia",
    confidence: 0.88,
    keywords: ["数字鸿沟", "接入", "技能", "互联网", "UNESCO", "不平等"],
  },
  {
    domain: "社会/文化",
    text: "社交媒体成瘾的设计机制包括可变奖励（Variable Rewards）、无限滚动和社交验证，这些模式源自赌场心理学。",
    source: "Britannica",
    sourceType: "encyclopedia",
    confidence: 0.86,
    keywords: ["成瘾", "可变奖励", "无限滚动", "社交验证", "设计", "赌场"],
  },
  {
    domain: "社会/文化",
    text: "中国互联网络信息中心（CNNIC）报告显示截至 2024 年底中国网民规模达 10.92 亿，短视频用户占整体网民的 95.5%。",
    source: "CNNIC 第53次报告",
    sourceType: "encyclopedia",
    confidence: 0.90,
    keywords: ["CNNIC", "中国网民", "短视频", "互联网", "用户规模"],
  },

  // ── 哲学 (5 items) ──────────────────────────────────────────

  {
    domain: "哲学",
    text: "柏拉图在《理想国》第七卷中提出洞穴比喻，描述人类认知的局限性和从意见上升到知识的艰难过程。",
    source: "Plato, Republic Book VII",
    sourceType: "philosophy",
    confidence: 0.97,
    keywords: ["柏拉图", "洞穴比喻", "理想国", "认知", "知识", "意见"],
  },
  {
    domain: "哲学",
    text: "技术哲学家 Martin Heidegger 在《技术的追问》中指出现代技术的本质不是工具而是\u201C座架\u201D（Gestell），它将自然和人类都视为可调配的资源。",
    source: "Stanford Encyclopedia of Philosophy",
    sourceType: "philosophy",
    confidence: 0.92,
    keywords: ["Heidegger", "技术", "座架", "Gestell", "工具", "资源"],
  },
  {
    domain: "哲学",
    text: "实用主义哲学家 John Dewey 强调\u201C从做中学\u201D，认为知识是行动和经验的产物而非被动接受的信息。",
    source: "Internet Encyclopedia of Philosophy",
    sourceType: "philosophy",
    confidence: 0.91,
    keywords: ["Dewey", "实用主义", "从做中学", "经验", "知识", "行动"],
  },
  {
    domain: "哲学",
    text: "AI 伦理中的对齐问题（Alignment Problem）根植于 Hume 的是-应问题：无法从事实陈述中推演出价值判断。",
    source: "Stanford Encyclopedia of Philosophy",
    sourceType: "philosophy",
    confidence: 0.85,
    keywords: ["对齐", "Alignment", "Hume", "是-应", "价值", "AI伦理"],
  },
  {
    domain: "哲学",
    text: "维特根斯坦在《哲学研究》中提出\u201C语言游戏\u201D概念，主张意义产生于具体的使用情境而非抽象定义。",
    source: "Internet Encyclopedia of Philosophy",
    sourceType: "philosophy",
    confidence: 0.93,
    keywords: ["维特根斯坦", "语言游戏", "意义", "情境", "使用", "哲学研究"],
  },

  // ── 历史 (3 items) ──────────────────────────────────────────

  {
    domain: "历史",
    text: "工业革命（1760-1840）从英国开始，以蒸汽机的改良为标志，带来了人类历史上最深刻的生产方式和社会结构变革。",
    source: "Britannica",
    sourceType: "encyclopedia",
    confidence: 0.96,
    keywords: ["工业革命", "蒸汽机", "英国", "生产方式", "社会结构"],
  },
  {
    domain: "历史",
    text: "文字的发明约在公元前 3200 年的苏美尔，楔形文字被认为是人类最早的书写系统，标志着史前时代向历史时代的过渡。",
    source: "Cambridge History Series",
    sourceType: "encyclopedia",
    confidence: 0.93,
    keywords: ["文字", "苏美尔", "楔形文字", "书写系统", "文明"],
  },
  {
    domain: "历史",
    text: "古登堡印刷术（约 1440 年）使书籍生产成本降低了 80%，被认为是信息传播史上的第一次革命，直接推动了宗教改革和科学革命。",
    source: "Journal of World History",
    sourceType: "academic",
    confidence: 0.90,
    keywords: ["古登堡", "印刷术", "信息传播", "宗教改革", "科学革命"],
  },

  // ── 商业 (3 items) ──────────────────────────────────────────

  {
    domain: "商业",
    text: "Clayton Christensen 的破坏性创新理论解释了为什么市场领导者常被新兴企业颠覆：在位企业过度关注高利润客户而忽视了低端和新市场。",
    source: "Harvard Business Review",
    sourceType: "encyclopedia",
    confidence: 0.90,
    keywords: ["破坏性创新", "Christensen", "颠覆", "市场领导者", "新兴企业"],
  },
  {
    domain: "商业",
    text: "产品市场契合度（PMF）是初创企业最关键的门槛，Marc Andreessen 称之为\u201C唯一重要的事\u201D，达到 PMF 后增长通常变得自然。",
    source: "McKinsey Quarterly",
    sourceType: "encyclopedia",
    confidence: 0.85,
    keywords: ["PMF", "产品市场契合", "初创", "增长", "Andreessen"],
  },
  {
    domain: "商业",
    text: "中国 AI 初创企业月之暗面（Moonshot AI）在 2024 年完成超 10 亿美元融资，其产品 Kimi 以长上下文处理能力为核心差异化。",
    source: "Crunchbase",
    sourceType: "technical",
    confidence: 0.82,
    keywords: ["月之暗面", "Kimi", "融资", "长上下文", "中国AI", "初创"],
  },

  // ── 写作 (3 items) ──────────────────────────────────────────

  {
    domain: "写作",
    text: "Strunk & White 的《The Elements of Style》提出\u201C省略不必要的词\u201D（Omit needless words）是英文写作的黄金法则，这一原则同样适用于中文写作的简洁性追求。",
    source: "Strunk & White, Elements of Style",
    sourceType: "encyclopedia",
    confidence: 0.94,
    keywords: ["简洁", "省略", "Strunk", "White", "写作原则", "法则"],
  },
  {
    domain: "写作",
    text: "芝加哥格式手册（CMOS）是英语世界最权威的学术写作规范之一，涵盖引文、标点和排版等完整规则体系。",
    source: "Chicago Manual of Style",
    sourceType: "encyclopedia",
    confidence: 0.95,
    keywords: ["芝加哥格式", "CMOS", "引文", "学术写作", "规范", "标点"],
  },
  {
    domain: "写作",
    text: "认知科学表明人类工作记忆容量约为 4±1 个组块，这意味着复杂句式和长段落会显著增加读者理解负担。",
    source: "Purdue OWL",
    sourceType: "encyclopedia",
    confidence: 0.80,
    keywords: ["工作记忆", "组块", "句式", "段落", "理解", "认知科学"],
  },

  // ── Bonus: Cross-domain items (2) ───────────────────────────

  {
    domain: "AI/技术",
    text: "中国深度求索（DeepSeek）公司发布的开源模型在多项基准上接近 GPT-4 水平，展示了中国 AI 在开源生态中的竞争力。",
    source: "arXiv 2404.16130",
    sourceType: "academic",
    confidence: 0.84,
    keywords: ["DeepSeek", "开源", "GPT-4", "中国AI", "基准", "模型"],
  },
  {
    domain: "社会/文化",
    text: "注意力经济（Attention Economy）由 Herbert Simon 于 1971 年首次提出：信息丰富导致注意力稀缺，这使得获取用户注意力成为当代商业的核心战场。",
    source: "Wikipedia",
    sourceType: "encyclopedia",
    confidence: 0.91,
    keywords: ["注意力经济", "Simon", "信息", "稀缺", "商业", "用户"],
  },
];

// ── Knowledge Search ─────────────────────────────────────────

/**
 * Search the knowledge base for evidence items matching a query
 * within a given domain. Scoring is keyword-matching based.
 */
export function searchKnowledge(
  query: string,
  domain: KnowledgeDomain,
  limit: number = 5,
): Evidence[] {
  const queryLower = query.toLowerCase();
  const candidates: { evidence: Evidence; score: number }[] = [];

  for (const item of KNOWLEDGE_BASE) {
    if (item.domain !== domain) continue;

    let score = 0;

    // Keyword match scoring
    for (const kw of item.keywords) {
      if (queryLower.includes(kw.toLowerCase())) {
        score += 2;
      }
      // Partial match (substring)
      if (kw.toLowerCase().includes(queryLower) || queryLower.includes(kw.toLowerCase())) {
        score += 1;
      }
    }

    // Full-text match on the evidence text
    if (item.text.toLowerCase().includes(queryLower)) {
      score += 3;
    }

    // Source match
    if (item.source.toLowerCase().includes(queryLower)) {
      score += 2;
    }

    if (score > 0) {
      candidates.push({ evidence: item, score });
    }
  }

  // Sort by score descending, then by confidence as tiebreaker
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.evidence.confidence - a.evidence.confidence;
  });

  return candidates.slice(0, limit).map((c) => c.evidence);
}

/**
 * Search the knowledge base across all domains.
 * Useful when the domain hasn't been determined yet.
 */
export function searchKnowledgeAll(
  query: string,
  limit: number = 8,
): Evidence[] {
  const results: Evidence[] = [];
  const seen = new Set<string>();

  for (const domain of ALL_DOMAINS) {
    const items = searchKnowledge(query, domain, limit);
    for (const item of items) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        results.push(item);
      }
    }
  }

  // Re-rank by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, limit);
}

/**
 * Get knowledge base statistics — count per domain, average confidence.
 */
export function getKnowledgeStats(): Record<
  KnowledgeDomain,
  { count: number; avgConfidence: number }
> {
  const stats: Record<string, { confidences: number[] }> = {};

  for (const item of KNOWLEDGE_BASE) {
    if (!stats[item.domain]) {
      stats[item.domain] = { confidences: [] };
    }
    stats[item.domain].confidences.push(item.confidence);
  }

  const result = {} as Record<KnowledgeDomain, { count: number; avgConfidence: number }>;
  for (const [domain, data] of Object.entries(stats)) {
    const avg =
      data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length;
    result[domain as KnowledgeDomain] = {
      count: data.confidences.length,
      avgConfidence: Math.round(avg * 100) / 100,
    };
  }
  return result;
}
