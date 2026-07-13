// ============================================================
// Sculptor 七代理系统 — 类型定义
// ============================================================
// Professor-grade 架构：
//   输入（anchor / 思维）→ Planner → Retriever → Verifier
//   → Critic → Professor → 输出（有来源的、经过验证的回答）
//
// 核心原则：
//   "宁可回答'我无法确定'，也不要编造一个流畅的答案。"
// ============================================================

import type { ThinkingStage } from "../cognitive-diagnoser";

// ── Agent Roles ────────────────────────────────────────────

/**
 * 七个代理角色，每个负责知识生产的一个环节。
 * 设计为可独立替换——将 mock 替换为真实 LLM 调用时，
 * 只需要修改对应 Agent 的实现，不影响 pipeline。
 */
export type AgentRole =
  | "professor"   // 最终对话 — 综合所有证据，产出回答
  | "planner"     // 拆解问题 — 制定知识获取计划
  | "retriever"   // 检索知识 — 按计划获取证据
  | "verifier"    // 检查来源 — 验证事实、标记推理
  | "outline"     // 组织结构 — 生成知识大纲
  | "memory"      // Thinking Memory — 记录思维轨迹
  | "critic";     // 挑战观点 — 提出反方论点

/** 代理之间的消息 */
export interface AgentMessage {
  from: AgentRole;
  to: AgentRole;
  content: string;
  metadata?: Record<string, unknown>;
}

// ── Knowledge Plan（知识获取计划）─────────────────────────

/**
 * Planner 的输出——一份结构化的知识获取计划。
 * 这告诉 Retriever "去找哪些领域、什么类型的来源、回答哪些问题"。
 */
export interface KnowledgePlan {
  /** 需要检索的领域，例如 ["HCI", "产品设计", "GUI历史"] */
  domains: string[];
  /** 优先使用的来源类型 */
  sources: SourceType[];
  /** 需要回答的具体问题清单 */
  questions: string[];
}

/**
 * 来源类型——按可信度从高到低排列。
 * Professor 会优先使用高可信度来源。
 */
export type SourceType =
  | "encyclopedia"   // Wikipedia, Britannica — 概述
  | "academic"       // arXiv, Semantic Scholar — 学术论文
  | "design"         // Apple HIG, Material Design — 设计规范
  | "technical"      // docs, API references — 技术文档
  | "philosophy"     // Stanford Encyclopedia — 哲学辨析
  | "general";       // 兜底 — 通用搜索

// ── Evidence（证据）────────────────────────────────────────

/**
 * 一条证据——可能来自真实检索，也可能是推理。
 * Verifier 会对每条证据标记置信度。
 */
export interface Evidence {
  /** 陈述内容 */
  statement: string;
  /** 来源标识（URL、书名、论文标题等） */
  source: string;
  /** 来源类型 */
  sourceType: SourceType;
  /** 置信度 0-1，由 Verifier 计算 */
  confidence: number;
  /** true=可验证的事实, false=推理或观点 */
  isFact: boolean;
}

// ── Retrieval Result（检索结果）────────────────────────────

/**
 * Retriever 的输出——从多个来源收集的证据集合。
 * 附带覆盖率评估，Professor 可以据此判断是否需要更多检索。
 */
export interface RetrievalResult {
  /** 收集到的证据列表 */
  evidence: Evidence[];
  /** 检索的来源数量 */
  sourceCount: number;
  /** 覆盖率 0-1——知识计划的每个领域被覆盖的程度 */
  coverage: number;
}

// ── Professor Response（最终回答）─────────────────────────

/**
 * Professor 的最终输出——这是返回给用户的回答。
 * 包含完整的证据链和置信度评估。
 */
export interface ProfessorResponse {
  /** 最终回答文本 */
  answer: string;
  /** 支撑回答的证据列表 */
  evidence: Evidence[];
  /** 整体置信度 0-1 */
  confidence: number;
  /** 事实数量 */
  factCount: number;
  /** 推理数量 */
  inferenceCount: number;
  /** 不确定陈述数量 */
  uncertainCount: number;
  /** 是否需要进一步研究——当置信度低于阈值时为 true */
  needsMoreResearch: boolean;
}

// ── Agent Context（代理上下文）─────────────────────────────

/**
 * Pipeline 启动时需要的外部上下文。
 */
export interface AgentContext {
  /** 用户锚点——当前正在思考/写作的主题 */
  anchor: string;
  /** Thinking Memory 中记录的思考路径 */
  thinking: string[];
  /** 用户已有的想法碎片 */
  ideas: string[];
  /** 当前思维阶段 */
  stage: ThinkingStage;
}

// ── Source Confidence Mapping ──────────────────────────────

/**
 * 每个来源类型的默认置信度基线。
 * 例如 encyclopedia 默认 0.85，technical 默认 0.75。
 * 这些值会被 Verifier 根据内容信号进一步调整。
 */
export const SOURCE_CONFIDENCE_BASELINE: Record<SourceType, number> = {
  encyclopedia: 0.85,
  academic: 0.90,
  design: 0.80,
  technical: 0.75,
  philosophy: 0.70,
  general: 0.50,
};
