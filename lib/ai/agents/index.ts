// ============================================================
// Sculptor 七代理系统 — 代理实现
// ============================================================
// 每个代理都是纯函数 / 无状态类，mock 实现。
// 设计为可独立替换——将规则逻辑替换为 LLM 调用即可。
//
// 代理协调顺序：
//   Planner → Retriever → Verifier → Critic → Professor
//   Outline / Memory 在侧路运行
// ============================================================

import type {
  AgentRole,
  AgentMessage,
  KnowledgePlan,
  SourceType,
  Evidence,
  RetrievalResult,
  ProfessorResponse,
  AgentContext,
} from "./types";
import type { ThinkingStage } from "../cognitive-diagnoser";
import { ThinkingStage as TS } from "../cognitive-diagnoser";
import {
  verifyStatements,
  classifyStatement,
  splitStatements,
} from "../verifier";
import { readRecentMemories, writeMemory } from "../context-memory";
import {
  searchKnowledge,
  searchKnowledgeAll,
  detectDomain,
  getSourceCitation,
} from "../knowledge-hub";
import type { KnowledgeDomain } from "../knowledge-hub";
import { pythonSearch } from "../retrieval-bridge";

// ── Agent domain → Knowledge Hub domain mapping ──
const AGENT_TO_HUB_DOMAIN: Record<string, KnowledgeDomain | null> = {
  design: "HCI/产品设计",
  technology: "AI/技术",
  education: "教育",
  psychology: "社会/文化",
  sociology: "社会/文化",
  culture: "社会/文化",
  philosophy: "哲学",
  history: "历史",
  writing: "写作",
  literature: "写作",
  encyclopedia: null, // no hub coverage → mock fallback
  general: null,       // no hub coverage → mock fallback
};

/** Convert a Knowledge Hub evidence item to an agent Evidence item */
function hubEvidenceToAgent(
  hubEv: import("../knowledge-hub").Evidence,
): import("./types").Evidence {
  return {
    statement: hubEv.text,
    source: getSourceCitation(hubEv.source, hubEv.sourceType),
    sourceType: hubEv.sourceType as import("./types").SourceType,
    confidence: hubEv.confidence,
    isFact: hubEv.confidence >= 0.75,
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. PlannerAgent — 拆解问题，制定知识计划
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 分析 anchor（用户当前主题）
//   - 根据 ThinkingStage 判断需要哪些知识
//   - 输出结构化的 KnowledgePlan

export interface PlannerAgent {
  role: "planner";
  createKnowledgePlan(anchor: string, thinking: string[], stage: ThinkingStage): KnowledgePlan;
}

/**
 * 根据 anchor 和思维阶段推断需要的知识领域。
 * mock 实现——未来可替换为 LLM 调用。
 */
export function createPlannerAgent(): PlannerAgent {
  return {
    role: "planner",

    createKnowledgePlan(anchor, thinking, stage) {
      // ── 领域推断（规则）────
      // 基于 anchor 中的关键词匹配领域
      const domains = inferDomains(anchor, thinking);

      // ── 来源推断 ────
      // 基于思维阶段决定来源优先级
      const sources = inferSources(stage, domains);

      // ── 问题生成 ────
      // 基于阶段和 anchor 生成核心问题
      const questions = generateQuestions(anchor, stage, domains);

      return { domains, sources, questions };
    },
  };
}

/** 基于关键词推断需要检索的领域 */
function inferDomains(anchor: string, thinking: string[]): string[] {
  const combined = [anchor, ...thinking].join(" ");
  const domains: Set<string> = new Set();

  // 关键词 → 领域映射
  const domainMap: Record<string, string> = {
    // 设计 / UX
    "设计": "design", "UX": "design", "UI": "design",
    "交互": "design", "界面": "design", "用户体验": "design",
    // 历史
    "历史": "history", "起源": "history", "发展": "history",
    "演变": "history", "年代": "history",
    // 哲学
    "哲学": "philosophy", "意义": "philosophy", "本质": "philosophy",
    "本体": "philosophy", "认识": "philosophy",
    // 技术
    "技术": "technology", "算法": "technology", "编程": "technology",
    "代码": "technology", "系统": "technology", "架构": "technology",
    // 社会科学
    "心理": "psychology", "认知": "psychology", "行为": "psychology",
    "社会": "sociology", "文化": "culture", "教育": "education",
    // 文学
    "写作": "writing", "文学": "literature", "修辞": "writing",
    "叙事": "writing", "风格": "writing",
  };

  for (const [keyword, domain] of Object.entries(domainMap)) {
    if (combined.includes(keyword)) domains.add(domain);
  }

  // 兜底：如果无法匹配，使用 general
  if (domains.size === 0) domains.add("general");

  // 总是包含 encyclopedia 作为基础
  domains.add("encyclopedia");

  return Array.from(domains);
}

/** 基于思维阶段推断来源类型优先级 */
function inferSources(stage: ThinkingStage, domains: string[]): SourceType[] {
  // 早期阶段（念头/主题）→ 百科全书式概述
  // 中期阶段（问题/观点）→ 学术 + 技术
  // 后期阶段（证据/结构/写作）→ 设计 + 技术 + 哲学

  const sources: SourceType[] = [];

  if (stage <= TS.Topic) {
    // 需要广泛概述
    sources.push("encyclopedia", "general");
  } else if (stage <= TS.Position) {
    // 需要权威分析
    sources.push("encyclopedia", "academic", "philosophy");
  } else {
    // 需要具体细节
    sources.push("academic", "design", "technical");
  }

  return sources;
}

/** 基于 anchor 和思维阶段生成核心问题 */
function generateQuestions(
  anchor: string,
  stage: ThinkingStage,
  domains: string[]
): string[] {
  const questions: string[] = [];

  // 按阶段生成问题模板
  switch (stage) {
    case TS.Spark:
      questions.push(`${anchor} 是什么？`);
      questions.push(`为什么 ${anchor} 值得关注？`);
      break;
    case TS.Topic:
      questions.push(`${anchor} 的核心概念是什么？`);
      questions.push(`${anchor} 的主要研究领域有哪些？`);
      break;
    case TS.Question:
      questions.push(`${anchor} 的关键问题是什么？`);
      questions.push(`关于 ${anchor} 有哪些不同的观点？`);
      break;
    case TS.Position:
      questions.push(`支持 ${anchor} 的证据有哪些？`);
      questions.push(`反对 ${anchor} 的论据有哪些？`);
      break;
    case TS.Evidence:
      questions.push(`${anchor} 的具体数据和案例？`);
      questions.push(`${anchor} 的权威来源有哪些？`);
      break;
    case TS.Structure:
      questions.push(`${anchor} 的最佳组织方式是什么？`);
      questions.push(`${anchor} 与相关概念的关系是什么？`);
      break;
    case TS.Writing:
      questions.push(`${anchor} 的表述方式有哪些参考？`);
      questions.push(`${anchor} 的优秀实例是什么？`);
      break;
    default:
      questions.push(`${anchor} 是什么？`);
  }

  return questions;
}

// ═══════════════════════════════════════════════════════════════
// 2. RetrieverAgent — 检索知识，获取证据
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 按 KnowledgePlan 检索各领域
//   - 返回结构化的 RetrievalResult
//
// mock 实现——未来可替换为真实检索（向量搜索、web search 等）。

export interface RetrieverAgent {
  role: "retriever";
  retrieve(plan: KnowledgePlan, context: AgentContext): RetrievalResult;
}

/**
 * Mock 检索代理——基于领域返回预设的证据。
 */
export function createRetrieverAgent(): RetrieverAgent {
  return {
    role: "retriever",

    retrieve(plan, context) {
      const allEvidence: Evidence[] = [];
      const hubUsedDomains = new Set<string>();

      // ── Step 0: Try Python vector store (FAISS) first ──
      try {
        const pyResult = pythonSearch(context.anchor, 5);
        if (pyResult.results && pyResult.results.length > 0) {
          for (const r of pyResult.results) {
            allEvidence.push({
              statement: r.text,
              source: r.source,
              sourceType: (r.domain.includes("AI") || r.domain.includes("技术")) ? "academic" as any :
                          (r.domain.includes("HCI") || r.domain.includes("设计")) ? "design" as any :
                          (r.domain.includes("哲学")) ? "philosophy" as any : "encyclopedia" as any,
              confidence: r.confidence,
              isFact: r.confidence >= 0.75,
            });
          }
        }
      } catch {
        // Python vector store not available — fall through to static KB
      }

      // ── Step 1: Detect domain from anchor using knowledge hub ──
      const detectedHubDomain = detectDomain(context.anchor, context.thinking || []);

      // ── Step 2: Try knowledge hub first for each plan domain ──
      for (const domain of plan.domains) {
        const hubDomain = AGENT_TO_HUB_DOMAIN[domain];

        if (hubDomain) {
          // Search the knowledge hub for this domain
          const hubResults = searchKnowledge(context.anchor, hubDomain, 3);
          if (hubResults.length > 0) {
            allEvidence.push(...hubResults.map(hubEvidenceToAgent));
            hubUsedDomains.add(domain);
            continue;
          }
        }

        // ── Step 3: Fallback to mock evidence ──
        const mockEvidence = getMockEvidence(domain, context.anchor);
        allEvidence.push(...mockEvidence);
      }

      // ── Step 4: Also search the detected domain if not already covered ──
      // (This catches cases where the anchor's domain isn't in plan.domains)
      const alreadyQueried = plan.domains.some((d) => AGENT_TO_HUB_DOMAIN[d] === detectedHubDomain);
      if (!alreadyQueried) {
        const hubResults = searchKnowledge(context.anchor, detectedHubDomain, 3);
        if (hubResults.length > 0) {
          allEvidence.push(...hubResults.map(hubEvidenceToAgent));
        }
      }

      // Calculate coverage
      const coverage =
        plan.domains.length > 0
          ? Math.min(
              1.0,
              allEvidence.length / (plan.domains.length * 3)
            )
          : 0;

      return {
        evidence: allEvidence,
        sourceCount: new Set(allEvidence.map((e) => e.source)).size,
        coverage,
      };
    },
  };
}

/** Mock 证据库——每个领域映射到一组预设证据 */
function getMockEvidence(domain: string, anchor: string): Evidence[] {
  const evidenceByDomain: Record<string, Evidence[]> = {
    design: [
      {
        statement: `在交互设计领域，${anchor} 强调以用户为中心的方法论`,
        source: "Apple Human Interface Guidelines",
        sourceType: "design",
        confidence: 0.85,
        isFact: true,
      },
      {
        statement: `${anchor} 的设计原则已被多个主流平台采纳`,
        source: "Material Design 3 Documentation",
        sourceType: "design",
        confidence: 0.80,
        isFact: true,
      },
      {
        statement: `${anchor} 可能代表了下一代交互范式的发展方向`,
        source: "设计趋势分析报告",
        sourceType: "design",
        confidence: 0.60,
        isFact: false,
      },
    ],
    history: [
      {
        statement: `${anchor} 的发展可以追溯到20世纪90年代`,
        source: "Wikipedia",
        sourceType: "encyclopedia",
        confidence: 0.90,
        isFact: true,
      },
      {
        statement: `${anchor} 经历了三个主要发展阶段`,
        source: "ACM Digital Library",
        sourceType: "academic",
        confidence: 0.85,
        isFact: true,
      },
    ],
    philosophy: [
      {
        statement: `从哲学角度看，${anchor} 涉及到本体论的基本问题`,
        source: "Stanford Encyclopedia of Philosophy",
        sourceType: "philosophy",
        confidence: 0.75,
        isFact: true,
      },
      {
        statement: `${anchor} 的哲学基础可以追溯到现象学传统`,
        source: "学术论文集",
        sourceType: "academic",
        confidence: 0.70,
        isFact: false,
      },
    ],
    technology: [
      {
        statement: `${anchor} 的技术实现依赖于现代计算架构`,
        source: "IEEE Xplore",
        sourceType: "academic",
        confidence: 0.85,
        isFact: true,
      },
      {
        statement: `${anchor} 的关键技术指标在过去五年提升了300%`,
        source: "技术白皮书",
        sourceType: "technical",
        confidence: 0.75,
        isFact: true,
      },
    ],
    psychology: [
      {
        statement: `认知心理学研究表明，${anchor} 可以显著影响用户行为`,
        source: "Journal of Cognitive Psychology",
        sourceType: "academic",
        confidence: 0.85,
        isFact: true,
      },
    ],
    sociology: [
      {
        statement: `${anchor} 的社会影响已经引起了广泛讨论`,
        source: "社会学研究",
        sourceType: "academic",
        confidence: 0.70,
        isFact: true,
      },
    ],
    culture: [
      {
        statement: `${anchor} 在不同文化背景下有不同的表现方式`,
        source: "跨文化研究",
        sourceType: "academic",
        confidence: 0.75,
        isFact: true,
      },
    ],
    education: [
      {
        statement: `${anchor} 正在改变传统的教育模式`,
        source: "教育技术评论",
        sourceType: "technical",
        confidence: 0.70,
        isFact: false,
      },
    ],
    writing: [
      {
        statement: `关于${anchor}的写作应当注重清晰性和逻辑连贯性`,
        source: "写作指南",
        sourceType: "general",
        confidence: 0.65,
        isFact: false,
      },
    ],
    literature: [
      {
        statement: `${anchor} 作为一个文学主题，在当代作品中频繁出现`,
        source: "文学评论",
        sourceType: "general",
        confidence: 0.65,
        isFact: false,
      },
    ],
    encyclopedia: [
      {
        statement: `${anchor} 是一个重要的概念，拥有丰富的学术研究背景`,
        source: "Wikipedia",
        sourceType: "encyclopedia",
        confidence: 0.85,
        isFact: true,
      },
      {
        statement: `关于${anchor}的研究已成为独立学科分支`,
        source: "Britannica",
        sourceType: "encyclopedia",
        confidence: 0.80,
        isFact: true,
      },
    ],
    general: [
      {
        statement: `${anchor} 正在受到越来越多的关注`,
        source: "综合媒体报道",
        sourceType: "general",
        confidence: 0.50,
        isFact: true,
      },
      {
        statement: `${anchor} 代表了该领域的一个重要趋势`,
        source: "行业观察",
        sourceType: "general",
        confidence: 0.45,
        isFact: false,
      },
    ],
  };

  return evidenceByDomain[domain] || evidenceByDomain["general"] || [];
}

// ═══════════════════════════════════════════════════════════════
// 3. VerifierAgent — 检查来源和事实
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 包装 verifier.ts 引擎
//   - 对每条证据标记置信度
//   - 分类：事实 / 推理 / 不确定

export interface VerifierAgent {
  role: "verifier";
  verify(result: RetrievalResult): RetrievalResult;
}

/**
 * Verifier 代理——使用现有的 verifier.ts 引擎验证证据。
 */
export function createVerifierAgent(): VerifierAgent {
  return {
    role: "verifier",

    verify(result) {
      const verified = result.evidence.map((ev) => {
        // 使用现有 verifier.ts 的 classifyStatement 引擎
        const classification = classifyStatement(ev.statement);

        // 综合来源置信度基线和语句分类置信度
        const { SOURCE_CONFIDENCE_BASELINE } =
          require("./types") as typeof import("./types");
        const sourceBaseline =
          SOURCE_CONFIDENCE_BASELINE[ev.sourceType] || 0.5;

        // 最终置信度 = 来源基线 × 语句信号置信度
        const finalConfidence = Math.min(
          1.0,
          Math.round(sourceBaseline * classification.confidence * 100) / 100
        );

        return {
          ...ev,
          confidence: finalConfidence,
          isFact: classification.type === "fact",
        };
      });

      return {
        ...result,
        evidence: verified,
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. CriticAgent — 挑战观点，提出反方论点
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 对每条证据提出反方观点
//   - 指出可能的偏见和盲点
//   - 输出批评意见列表

export interface CriticAgent {
  role: "critic";
  challenge(evidence: Evidence[], anchor: string): string[];
}

/**
 * Critic 代理——对每条证据生成反方论点。
 */
export function createCriticAgent(): CriticAgent {
  return {
    role: "critic",

    challenge(evidence, anchor) {
      const criticisms: string[] = [];

      // 按证据类型生成批评
      for (const ev of evidence) {
        const criticism = generateCriticism(ev, anchor);
        if (criticism) criticisms.push(criticism);
      }

      // 如果证据太少，加上全局批评
      if (evidence.length < 3) {
        criticisms.push(
          `⚠ 关于「${anchor}」的证据数量偏少，可能存在信息不完整的问题。`
        );
      }

      // 如果所有证据都来自同一类型来源，指出偏见
      const sourceTypes = new Set(evidence.map((e) => e.sourceType));
      if (sourceTypes.size === 1) {
        criticisms.push(
          `⚠ 所有证据都来自同一类型的来源（${Array.from(sourceTypes).join(", ")}），建议增加多角度信息。`
        );
      }

      return criticisms;
    },
  };
}

/** 根据证据类型生成批评意见 */
function generateCriticism(
  ev: Evidence,
  anchor: string
): string | null {
  switch (ev.sourceType) {
    case "encyclopedia":
      return `但是百科类来源通常提供概述而非深度分析，关于「${anchor}」的细节可能不够充分。`;
    case "general":
      return `但是这个观点来自于通用来源（${ev.source}），权威性可能不足——建议寻找更权威的学术或技术来源。`;
    case "design":
      return `但这主要从设计实践的角度出发，没有考虑「${anchor}」的理论基础和学术研究。`;
    case "technical":
      return `但技术视角可能忽视了「${anchor}」的社会和文化影响，建议补充人文角度的分析。`;
    case "academic":
      return `但学术研究可能存在发表偏倚——已发表的研究倾向于支持而非挑战主流观点。`;
    case "philosophy":
      return `但哲学分析通常缺乏实证数据，关于「${anchor}」的结论需要更多具体证据支撑。`;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. OutlineAgent — 组织结构，生成知识大纲
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 基于证据生成结构化的知识大纲
//   - 为 Professor 提供回答框架

export interface OutlineAgent {
  role: "outline";
  generateOutline(
    anchor: string,
    evidence: Evidence[],
    plan: KnowledgePlan
  ): OutlineSection[];
}

export interface OutlineSection {
  title: string;
  keyPoints: string[];
  relatedEvidence: number[]; // evidence 数组的索引
}

/**
 * Outline 代理——基于证据和计划生成大纲。
 */
export function createOutlineAgent(): OutlineAgent {
  return {
    role: "outline",

    generateOutline(anchor, evidence, plan) {
      const sections: OutlineSection[] = [];

      // 为每个领域生成一个 section
      for (const domain of plan.domains) {
        const domainEvidence = evidence.filter(
          (e) =>
            e.sourceType === domain ||
            e.source.toLowerCase().includes(domain)
        );

        if (domainEvidence.length === 0) continue;

        const keyPoints = domainEvidence.map((e) => e.statement);
        const indices = domainEvidence.map((_, i) =>
          evidence.indexOf(domainEvidence[i])
        );

        sections.push({
          title: formatSectionTitle(domain, anchor),
          keyPoints,
          relatedEvidence: indices,
        });
      }

      return sections;
    },
  };
}

/** 格式化章节标题 */
function formatSectionTitle(domain: string, anchor: string): string {
  const titleMap: Record<string, string> = {
    design: `${anchor}：设计理论与实践`,
    history: `${anchor}：历史发展脉络`,
    philosophy: `${anchor}：哲学基础与辨析`,
    technology: `${anchor}：技术实现与架构`,
    psychology: `${anchor}：认知与心理维度`,
    sociology: `${anchor}：社会影响与讨论`,
    culture: `${anchor}：文化背景与多样性`,
    education: `${anchor}：教育应用与启示`,
    writing: `${anchor}：写作方法与参考`,
    literature: `${anchor}：文学表达与主题`,
    encyclopedia: `${anchor}：概念概述`,
    general: `${anchor}：综合视角`,
  };

  return titleMap[domain] || `${anchor}：${domain} 领域分析`;
}

// ═══════════════════════════════════════════════════════════════
// 6. MemoryAgent — 记录思维轨迹
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 包装现有 context-memory.ts
//   - 记录教授对话的思维轨迹
//   - 为未来对话提供上下文

export interface MemoryAgent {
  role: "memory";
  /** 记录一条思考 */
  recordThought(
    userId: string,
    documentId: string | null,
    thought: string,
    stage: ThinkingStage,
    importance?: number
  ): Promise<void>;
  /** 读取最近的思考记录 */
  recallRecent(
    userId: string,
    documentId?: string | null,
    limit?: number
  ): Promise<string[]>;
}

/**
 * Memory 代理——使用现有 context-memory.ts。
 */
export function createMemoryAgent(): MemoryAgent {
  return {
    role: "memory",

    async recordThought(userId, documentId, thought, stage, importance) {
      await writeMemory(userId, documentId, {
        memoryType: "thinking_trajectory",
        memoryData: {
          thought,
          stage,
          timestamp: new Date().toISOString(),
        },
        importance: importance ?? 0.5,
      });
    },

    async recallRecent(userId, documentId, limit = 20) {
      const memories = await readRecentMemories(userId, documentId, limit);
      return memories
        .filter((m) => m.memoryType === "thinking_trajectory")
        .map((m) => (m.memoryData as Record<string, unknown>).thought as string)
        .filter(Boolean);
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 7. ProfessorAgent — 综合证据，产出回答
// ═══════════════════════════════════════════════════════════════
//
// 职责：
//   - 综合 Planner、Retriever、Verifier、Critic 的输出
//   - 产出结构化的 ProfessorResponse
//   - 标记事实 vs 推理
//   - 计算整体置信度

export interface ProfessorAgent {
  role: "professor";
  synthesize(
    plan: KnowledgePlan,
    evidence: Evidence[],
    criticisms: string[],
    stage: ThinkingStage,
    coverage?: number
  ): ProfessorResponse;
}

/**
 * Professor 代理——最终的合成器。
 */
export function createProfessorAgent(): ProfessorAgent {
  return {
    role: "professor",

    synthesize(plan, evidence, criticisms, stage, coverage = 0) {
      // ── 证据分类 ────
      const facts = evidence.filter((e) => e.isFact);
      const inferences = evidence.filter((e) => !e.isFact);

      // ── 构建回答 ────
      const answer = buildAnswer(
        plan,
        evidence,
        criticisms,
        stage
      );

      // ── 计算置信度 ────
      const confidence = calculateProfessorConfidence(evidence);

      // ── 计算计数 ────
      const factCount = facts.length;
      const inferenceCount = inferences.length;
      const uncertainCount = evidence.filter(
        (e) => e.confidence < 0.6
      ).length;

      // ── 判断是否需要更多研究 ────
      const needsMoreResearch =
        confidence < 0.5 || factCount < 2 || coverage < 0.4;

      return {
        answer,
        evidence,
        confidence,
        factCount,
        inferenceCount,
        uncertainCount,
        needsMoreResearch,
      };
    },
  };
}

/** 构建最终回答文本 */
function buildAnswer(
  plan: KnowledgePlan,
  evidence: Evidence[],
  criticisms: string[],
  stage: ThinkingStage
): string {
  // 按可信度排序
  const sorted = [...evidence].sort(
    (a, b) => b.confidence - a.confidence
  );

  // 构建段落
  const parts: string[] = [];

  // 开场——基于思维阶段
  parts.push(getOpeningPhrase(stage));

  // 主体——高置信度事实
  const highConfidence = sorted.filter((e) => e.confidence >= 0.7);
  if (highConfidence.length > 0) {
    parts.push("\n【已验证的信息】");
    for (const ev of highConfidence) {
      const marker = ev.isFact ? "✓" : "→";
      parts.push(`${marker} ${ev.statement}（来源：${ev.source}，置信度：${Math.round(ev.confidence * 100)}%）`);
    }
  }

  // 推理部分
  const inferences = sorted.filter(
    (e) => !e.isFact && e.confidence >= 0.5
  );
  if (inferences.length > 0) {
    parts.push("\n【基于证据的推理】");
    for (const ev of inferences) {
      parts.push(`→ ${ev.statement}`);
    }
  }

  // 批评意见
  if (criticisms.length > 0) {
    parts.push("\n【需要注意的局限】");
    for (const c of criticisms) {
      parts.push(`• ${c}`);
    }
  }

  // 低置信度声明
  const lowConfidence = sorted.filter((e) => e.confidence < 0.5);
  if (lowConfidence.length > 0) {
    parts.push("\n【以下信息置信度较低，建议进一步验证】");
    for (const ev of lowConfidence) {
      parts.push(`⚠ ${ev.statement}（置信度：${Math.round(ev.confidence * 100)}%）`);
    }
  }

  return parts.join("\n");
}

/** 基于思维阶段生成开场白 */
function getOpeningPhrase(stage: ThinkingStage): string {
  switch (stage) {
    case TS.Spark:
      return "你目前处于「念头」阶段，这里是一些基础信息帮助你厘清思路：";
    case TS.Topic:
      return "关于这个主题，我找到以下关键信息：";
    case TS.Question:
      return "针对你的问题，以下是有可靠来源的信息和不同观点：";
    case TS.Position:
      return "以下信息可以帮助你支撑和挑战你的观点：";
    case TS.Evidence:
      return "以下是具体的证据和案例：";
    case TS.Structure:
      return "以下是结构化的知识框架：";
    case TS.Writing:
      return "以下是可供参考的表述和实例：";
    default:
      return "以下是与你的问题相关的信息：";
  }
}

/** 计算 Professor 的整体置信度 */
function calculateProfessorConfidence(evidence: Evidence[]): number {
  if (evidence.length === 0) return 0;

  // 加权平均：isFact 的证据权重更高
  const totalWeight = evidence.reduce(
    (sum, ev) => sum + (ev.isFact ? 1.0 : 0.5),
    0
  );
  const weightedSum = evidence.reduce(
    (sum, ev) =>
      sum + ev.confidence * (ev.isFact ? 1.0 : 0.5),
    0
  );

  return totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 100) / 100
    : 0;
}

// ═══════════════════════════════════════════════════════════════
// 导出 — 工厂函数
// ═══════════════════════════════════════════════════════════════

export { ThinkingStage } from "../cognitive-diagnoser";
