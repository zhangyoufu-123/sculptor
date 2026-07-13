// ============================================================
// Sculptor 七代理系统 — Professor Pipeline
// ============================================================
// 编排所有代理，实现完整的知识生产流水线：
//
//   输入（anchor + 思维）→
//     Planner → Retriever → Verifier → Critic → Professor
//     Outline / Memory 在侧路运行
//   → 输出（有来源、经过验证的回答）
//
// 核心原则：
//   "宁可回答'我无法确定'，也不要编造一个流畅的答案。"
// ============================================================

import type {
  KnowledgePlan,
  Evidence,
  RetrievalResult,
  ProfessorResponse,
  AgentContext,
} from "./types";
import type { ThinkingStage } from "../cognitive-diagnoser";
import {
  createPlannerAgent,
  createRetrieverAgent,
  createVerifierAgent,
  createCriticAgent,
  createProfessorAgent,
  createOutlineAgent,
  createMemoryAgent,
} from "./index";
import type {
  PlannerAgent,
  RetrieverAgent,
  VerifierAgent,
  CriticAgent,
  ProfessorAgent,
  OutlineAgent,
  MemoryAgent,
} from "./index";

// ═══════════════════════════════════════════════════════════════
// Pipeline 输入
// ═══════════════════════════════════════════════════════════════

export interface PipelineInput {
  /** 用户锚点——当前正在思考/写作的主题 */
  anchor: string;
  /** Thinking Memory 中记录的思考路径 */
  thinking: string[];
  /** 用户已有的想法碎片 */
  ideas: string[];
  /** 当前思维阶段 */
  stage: ThinkingStage;
  /** 用户 ID（用于 MemoryAgent 记录） */
  userId: string;
  /** 文档 ID（可选，用于 MemoryAgent 关联） */
  documentId?: string | null;
}

/**
 * Pipeline 步骤——用于追踪执行进度。
 */
export type PipelineStep =
  | "idle"
  | "planning"
  | "retrieving"
  | "verifying"
  | "critiquing"
  | "outlining"
  | "synthesizing"
  | "recording"
  | "done"
  | "error";

export interface PipelineState {
  step: PipelineStep;
  /** 可选的进度信息 */
  message?: string;
  /** 中间产物——每步的输出 */
  plan?: KnowledgePlan;
  retrievalResult?: RetrievalResult;
  verifiedResult?: RetrievalResult;
  criticisms?: string[];
  response?: ProfessorResponse;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// 主 Pipeline
// ═══════════════════════════════════════════════════════════════

/**
 * Professor Pipeline —— 编排所有七个代理，产出经过验证的回答。
 *
 * 流程：
 *   1. Planner: 分析 anchor，生成知识计划
 *   2. Retriever: 按计划检索证据
 *   3. Verifier: 验证每条证据的置信度
 *   4. Critic: 挑战证据，提出反方观点
 *   5. Professor: 综合所有信息，产出最终回答
 *   6. Outline: 生成知识大纲（侧路）
 *   7. Memory: 记录思维轨迹（侧路）
 *
 * 返回值是 ProfessorResponse，包含：
 *   - answer: 最终回答文本
 *   - evidence: 支撑回答的证据列表
 *   - confidence: 整体置信度
 *   - factCount / inferenceCount / uncertainCount: 分类计数
 *   - needsMoreResearch: 是否需要进一步研究
 */
export async function professorPipeline(
  anchor: string,
  thinking: string[],
  ideas: string[],
  stage: ThinkingStage,
  userId: string,
  documentId?: string | null
): Promise<ProfessorResponse> {
  // ── 初始化代理 ────
  const planner = createPlannerAgent();
  const retriever = createRetrieverAgent();
  const verifier = createVerifierAgent();
  const critic = createCriticAgent();
  const professor = createProfessorAgent();
  const outline = createOutlineAgent();
  const memory = createMemoryAgent();

  const context: AgentContext = { anchor, thinking, ideas, stage };

  try {
    // ── Step 1: Planner — 制定知识获取计划 ────
    const plan = planner.createKnowledgePlan(anchor, thinking, stage);

    // ── Step 2: Retriever — 检索证据 ────
    const retrievalResult = retriever.retrieve(plan, context);

    // ── Step 3: Verifier — 验证证据 ────
    const verifiedResult = verifier.verify(retrievalResult);

    // ── Step 4: Critic — 挑战观点 ────
    const criticisms = critic.challenge(verifiedResult.evidence, anchor);

    // ── Step 5: Professor — 综合回答 ────
    const response = professor.synthesize(
      plan,
      verifiedResult.evidence,
      criticisms,
      stage,
      verifiedResult.coverage
    );

    // ── Step 6: Outline — 生成知识大纲（侧路，不影响回答）──
    // 在后台运行，结果可缓存以供后续使用
    const outlineResult = outline.generateOutline(
      anchor,
      verifiedResult.evidence,
      plan
    );
    // outlineResult 可以附着到 response 或缓存起来
    // 当前版本：仅生成，不阻塞返回

    // ── Step 7: Memory — 记录思维轨迹（侧路，异步）──
    // 在后台记录，不阻塞返回
    memory.recordThought(
      userId,
      documentId || null,
      `anchor="${anchor}" domains=[${plan.domains.join(",")}] confidence=${response.confidence} facts=${response.factCount} inferences=${response.inferenceCount}`,
      stage,
      Math.max(0.3, response.confidence)
    ).catch((err) => {
      // Memory 记录失败不应影响主流程
      console.warn("[Professor Pipeline] Memory 记录失败:", err);
    });

    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Professor Pipeline] 流水线执行失败:", errorMessage);

    // ── 降级：返回低置信度的错误回答 ────
    return {
      answer: `抱歉，在处理「${anchor}」时遇到了问题：${errorMessage}。请稍后重试或换一个表述方式。`,
      evidence: [],
      confidence: 0,
      factCount: 0,
      inferenceCount: 0,
      uncertainCount: 0,
      needsMoreResearch: true,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 带进度追踪的 Pipeline（Generator 版本）
// ═══════════════════════════════════════════════════════════════

/**
 * Professor Pipeline —— Generator 版本。
 * 每一步都 yield PipelineState，让调用方可以追踪进度。
 */
export async function* professorPipelineWithProgress(
  input: PipelineInput
): AsyncGenerator<PipelineState> {
  yield { step: "idle", message: "Pipeline 初始化..." };

  const planner = createPlannerAgent();
  const retriever = createRetrieverAgent();
  const verifier = createVerifierAgent();
  const critic = createCriticAgent();
  const professor = createProfessorAgent();
  const outline = createOutlineAgent();
  const memory = createMemoryAgent();

  const context: AgentContext = {
    anchor: input.anchor,
    thinking: input.thinking,
    ideas: input.ideas,
    stage: input.stage,
  };

  try {
    // Step 1: Planner
    yield { step: "planning", message: "正在分析问题，制定知识获取计划..." };
    const plan = planner.createKnowledgePlan(input.anchor, input.thinking, input.stage);
    yield { step: "planning", message: `计划完成——需要检索 ${plan.domains.length} 个领域`, plan };

    // Step 2: Retriever
    yield { step: "retrieving", message: "正在检索知识..." };
    const retrievalResult = retriever.retrieve(plan, context);
    yield {
      step: "retrieving",
      message: `检索完成——收集到 ${retrievalResult.evidence.length} 条证据，覆盖 ${retrievalResult.sourceCount} 个来源`,
      plan,
      retrievalResult,
    };

    // Step 3: Verifier
    yield { step: "verifying", message: "正在验证证据..." };
    const verifiedResult = verifier.verify(retrievalResult);
    const avgConfidence =
      verifiedResult.evidence.length > 0
        ? Math.round(
            (verifiedResult.evidence.reduce((s, e) => s + e.confidence, 0) /
              verifiedResult.evidence.length) *
              100
          )
        : 0;
    yield {
      step: "verifying",
      message: `验证完成——平均置信度 ${avgConfidence}%`,
      plan,
      retrievalResult: verifiedResult,
    };

    // Step 4: Critic
    yield { step: "critiquing", message: "正在从多个角度审查证据..." };
    const criticisms = critic.challenge(verifiedResult.evidence, input.anchor);
    yield {
      step: "critiquing",
      message: `审查完成——发现 ${criticisms.length} 个需要注意的问题`,
      plan,
      retrievalResult: verifiedResult,
      criticisms,
    };

    // Step 5: Professor
    yield { step: "synthesizing", message: "正在综合所有信息，生成回答..." };
    const response = professor.synthesize(
      plan,
      verifiedResult.evidence,
      criticisms,
      input.stage,
      verifiedResult.coverage
    );

    // Step 6: Outline（侧路）
    yield { step: "outlining", message: "正在生成知识大纲..." };
    outline.generateOutline(input.anchor, verifiedResult.evidence, plan);

    // Step 7: Memory（侧路，异步）
    yield { step: "recording", message: "正在记录思维轨迹..." };
    memory
      .recordThought(
        input.userId,
        input.documentId || null,
        `anchor="${input.anchor}" domains=[${plan.domains.join(",")}] confidence=${response.confidence}`,
        input.stage,
        Math.max(0.3, response.confidence)
      )
      .catch((err) => console.warn("[Pipeline] Memory 记录失败:", err));

    yield {
      step: "done",
      message: response.needsMoreResearch
        ? "回答已生成，但建议进一步研究。"
        : "回答已生成。",
      plan,
      retrievalResult: verifiedResult,
      criticisms,
      response,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    yield {
      step: "error",
      message: `流水线执行失败：${errorMessage}`,
      error: errorMessage,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 便捷函数 — 单步运行
// ═══════════════════════════════════════════════════════════════

/**
 * 快速运行单个步骤，用于调试和测试。
 */
export async function runStep(
  step: "plan" | "retrieve" | "verify" | "critique" | "synthesize",
  anchor: string,
  thinking: string[],
  ideas: string[],
  stage: ThinkingStage
): Promise<unknown> {
  const context: AgentContext = { anchor, thinking, ideas, stage };

  switch (step) {
    case "plan":
      return createPlannerAgent().createKnowledgePlan(anchor, thinking, stage);

    case "retrieve": {
      const plan = createPlannerAgent().createKnowledgePlan(anchor, thinking, stage);
      return createRetrieverAgent().retrieve(plan, context);
    }

    case "verify": {
      const plan = createPlannerAgent().createKnowledgePlan(anchor, thinking, stage);
      const result = createRetrieverAgent().retrieve(plan, context);
      return createVerifierAgent().verify(result);
    }

    case "critique": {
      const plan = createPlannerAgent().createKnowledgePlan(anchor, thinking, stage);
      const result = createRetrieverAgent().retrieve(plan, context);
      const verified = createVerifierAgent().verify(result);
      return createCriticAgent().challenge(verified.evidence, anchor);
    }

    case "synthesize": {
      const plan = createPlannerAgent().createKnowledgePlan(anchor, thinking, stage);
      const result = createRetrieverAgent().retrieve(plan, context);
      const verified = createVerifierAgent().verify(result);
      const criticisms = createCriticAgent().challenge(verified.evidence, anchor);
      return createProfessorAgent().synthesize(
        plan,
        verified.evidence,
        criticisms,
        stage,
        verified.coverage
      );
    }

    default:
      throw new Error(`Unknown step: ${step}`);
  }
}
