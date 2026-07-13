/**
 * Semantic Grounding Engine — ensures AI responds to what the user ACTUALLY asked.
 *
 * Constitution v2: any reply must first go through Understand → Reason → Dialogue.
 * This engine handles the "Understand" phase: extracting what the user means,
 * identifying domains, and explicitly FORBIDDING irrelevant context.
 *
 * Position: between User Input and Mental Model.
 */

import type { KnowledgeDomain } from "./knowledge-hub";

// ═══════════════════════════════════════════════════════════════
// Grounded Meaning — the result of semantic grounding
// ═══════════════════════════════════════════════════════════════

export interface GroundedMeaning {
  /** What the user literally asked */
  rawInput: string;

  /** Extracted subject-predicate-object */
  subject: string;       // 中国年轻人
  predicate: string;     // 失掉
  object: string;        // 注意力
  fullProposition: string; // 中国年轻人是否失掉了注意力？

  /** What this is really about */
  realQuestion: string;  // 这不是注意力问题，而是信息环境改变问题

  /** Domains this belongs to */
  domains: KnowledgeDomain[];

  /** Contestable concepts — words that need definition before discussion */
  contestableConcepts: string[];  // ["年轻人", "注意力", "失掉"]

  /** Forbidden context — topics that MUST NOT leak in */
  forbiddenContext: string[];

  /** Understanding confidence */
  understandingScore: number; // 0-100

  /** What we still don't understand */
  openClarifications: string[];
}

// ═══════════════════════════════════════════════════════════════
// Grounding Engine
// ═══════════════════════════════════════════════════════════════

/**
 * Ground a user's input — extract what they REALLY mean.
 * This runs BEFORE any AI response generation.
 */
export function ground(input: string, previousTopics: string[] = []): GroundedMeaning {
  const clean = input.trim();

  // Step 1: Extract subject-predicate-object
  const { subject, predicate, object } = extractSPO(clean);

  // Step 2: Identify the real question behind the literal one
  const realQuestion = inferRealQuestion(clean, subject, predicate, object);

  // Step 3: Map to knowledge domains
  const domains = detectDomains(clean, subject, predicate, object);

  // Step 4: Identify contestable concepts
  const contestableConcepts = findContestableConcepts(clean, subject, predicate, object);

  // Step 5: Forbidden context — everything NOT in the current topic
  const forbiddenContext = previousTopics.filter(t =>
    !clean.includes(t.slice(0, 10)) && t !== clean
  );

  // Step 6: What we still need to clarify
  const openClarifications = findClarifications(clean, subject, predicate, object, contestableConcepts);

  // Step 7: Calculate understanding score
  const understandingScore = calculateUnderstandingScore(clean, contestableConcepts, openClarifications);

  return {
    rawInput: clean,
    subject,
    predicate,
    object,
    fullProposition: `${subject}${predicate}${object}`,
    realQuestion,
    domains,
    contestableConcepts,
    forbiddenContext,
    understandingScore,
    openClarifications,
  };
}

// ═══════════════════════════════════════════════════════════════
// Step 1: Extract Subject-Predicate-Object
// ═══════════════════════════════════════════════════════════════

function extractSPO(text: string): { subject: string; predicate: string; object: string } {
  // Pattern: subject + predicate + object
  // "中国年轻人失掉注意力了吗？" → subject="中国年轻人", predicate="失掉", object="注意力"

  const patterns = [
    /(.{2,8}?)(为什么|怎么|如何|是否|是不是|有没有|会|能|可以|应该)(.{2,10}?)(?:[了]?[吗呢吧啊]?[？?]?)$/,
    /(.{2,10}?)(.{1,4}?)(.{2,10}?)(?:[了]?[吗呢吧啊]?[？?]?)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        subject: match[1].trim(),
        predicate: match[2].trim(),
        object: (match[3] || "").trim(),
      };
    }
  }

  // Fallback: treat the whole text as the subject
  return {
    subject: text.replace(/[？?！!。，,、\s]+/g, "").slice(0, 15),
    predicate: "",
    object: "",
  };
}

// ═══════════════════════════════════════════════════════════════
// Step 2: Infer the real question
// ═══════════════════════════════════════════════════════════════

function inferRealQuestion(
  text: string,
  subject: string,
  predicate: string,
  object: string
): string {
  // "为什么AI产品越来越像聊天机器人" →
  // "这不是关于'像不像'，而是关于交互范式是否已经收敛"

  const questionMap: Array<{ pattern: RegExp; reformulation: string }> = [
    {
      pattern: /为什么(.+)越来越/,
      reformulation: "这不是关于{0}的表面现象，而是关于{0}背后的驱动力是什么",
    },
    {
      pattern: /(.+)失掉(.+)了吗/,
      reformulation: "这不仅是在问{0}是否{1}了{2}，更是在问：'失掉'这个说法本身是否成立——也许{2}只是被重新分配了",
    },
    {
      pattern: /为什么(.+)/,
      reformulation: "追问{0}的深层原因——什么力量在推动这个现象",
    },
    {
      pattern: /(.+)是否(.+)/,
      reformulation: "检验'{0}{1}'这个命题是否成立",
    },
    {
      pattern: /什么是(.+)/,
      reformulation: "界定{0}的本质和边界",
    },
  ];

  for (const { pattern, reformulation } of questionMap) {
    const match = text.match(pattern);
    if (match) {
      return reformulation
        .replace("{0}", match[1] || subject)
        .replace("{1}", predicate)
        .replace("{2}", object);
    }
  }

  return `深入理解「${subject}${predicate}${object}」的含义、背景和争议`;
}

// ═══════════════════════════════════════════════════════════════
// Step 3: Detect knowledge domains
// ═══════════════════════════════════════════════════════════════

function detectDomains(
  _text: string,
  subject: string,
  predicate: string,
  object: string
): KnowledgeDomain[] {
  const combined = `${subject}${predicate}${object}`;
  const domains: KnowledgeDomain[] = [];

  const signals: Array<{ domain: KnowledgeDomain; keywords: string[] }> = [
    { domain: "教育", keywords: ["教育", "学习", "学校", "学生", "老师", "考试", "课程", "大学", "知识"] },
    { domain: "AI/技术", keywords: ["AI", "人工智能", "算法", "模型", "LLM", "GPT", "技术", "代码", "编程", "软件", "系统", "架构"] },
    { domain: "HCI/产品设计", keywords: ["设计", "交互", "界面", "UI", "UX", "产品", "用户体验", "聊天", "机器人"] },
    { domain: "社会/文化", keywords: ["社会", "文化", "年轻人", "群体", "阶级", "公平", "不平等", "歧视", "性别", "代际"] },
    { domain: "哲学", keywords: ["哲学", "意义", "本质", "存在", "价值", "伦理", "道德", "意识", "真理", "自由"] },
    { domain: "商业", keywords: ["商业", "市场", "公司", "企业", "增长", "盈利", "竞争", "战略", "品牌", "融资"] },
    { domain: "写作", keywords: ["写作", "文章", "论文", "表达", "修辞", "叙述", "结构"] },
    { domain: "历史", keywords: ["历史", "古代", "近代", "演变", "发展", "传统", "工业革命"] },
  ];

  for (const { domain, keywords } of signals) {
    if (keywords.some(k => combined.includes(k))) {
      domains.push(domain);
    }
  }

  // Default: at least general reasoning domains
  if (domains.length === 0) {
    if (combined.includes("为什么")) domains.push("哲学");
    if (combined.includes("怎么") || combined.includes("如何")) domains.push("AI/技术");
    domains.push("社会/文化");
  }

  return domains;
}

// ═══════════════════════════════════════════════════════════════
// Step 4: Find contestable concepts
// ═══════════════════════════════════════════════════════════════

function findContestableConcepts(
  _text: string,
  subject: string,
  predicate: string,
  object: string
): string[] {
  const concepts: string[] = [];

  // Abstract/ambiguous nouns are contestable
  const ambiguousNouns = [
    "注意力", "创造力", "生产力", "幸福感", "成功", "失败",
    "自由", "公平", "效率", "质量", "影响力", "创新",
    "年轻人", "中年人", "老年人", "精英", "大众",
  ];

  for (const word of [subject, predicate, object]) {
    if (ambiguousNouns.some(n => word.includes(n))) {
      concepts.push(word);
    }
  }

  // Verbs that imply change or loss are contestable
  const changeVerbs = ["失掉", "失去", "下降", "减少", "增加", "提高", "改善", "恶化", "改变"];
  if (changeVerbs.some(v => predicate.includes(v))) {
    concepts.push(predicate);
  }

  return concepts;
}

// ═══════════════════════════════════════════════════════════════
// Step 5 already done above (forbiddenContext)
// Step 6: What needs clarification
// ═══════════════════════════════════════════════════════════════

function findClarifications(
  _text: string,
  subject: string,
  _predicate: string,
  _object: string,
  contestable: string[]
): string[] {
  const clarifications: string[] = [];

  if (contestable.length > 0) {
    clarifications.push(`「${contestable[0]}」需要定义——用户指的是什么范围？`);
  }

  if (subject.length > 4 && !subject.includes("我")) {
    clarifications.push(`「${subject}」是一个泛指——具体的群体或对象是什么？`);
  }

  return clarifications;
}

// ═══════════════════════════════════════════════════════════════
// Step 7: Understanding score
// ═══════════════════════════════════════════════════════════════

function calculateUnderstandingScore(
  text: string,
  contestable: string[],
  clarifications: string[]
): number {
  let score = 30; // Base: we have the raw text

  // Has clear proposition → +20
  if (text.length > 10) score += 20;

  // Few contestable concepts → +20 (already clear)
  if (contestable.length <= 1) score += 20;
  else if (contestable.length <= 2) score += 10;

  // Few clarifications needed → +20
  if (clarifications.length === 0) score += 20;
  else if (clarifications.length === 1) score += 10;

  // Has a question mark → it's a clear question → +10
  if (text.includes("？") || text.includes("?")) score += 10;

  return Math.min(100, score);
}
