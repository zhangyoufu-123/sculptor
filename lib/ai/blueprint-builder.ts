/**
 * Blueprint Builder — constructs ArticleBlueprint through goal-driven conversation.
 */

import type {
  ArticleBlueprint,
  BlueprintNode,
  ReviewerPerspective,
  QualityCheckpoint,
  StructureType,
} from "./blueprint-types";
import {
  GENRE_STRUCTURES,
  DEFAULT_REVIEWERS,
  createEmptyBlueprint,
  calculateCompleteness,
} from "./blueprint-types";
import { generatePeerReview } from "./reviewer";
import { handleColdStart } from "./goal-builder";

// ═══════════════════════════════════════════════════════════════
// Blueprint Accumulation
// ═══════════════════════════════════════════════════════════════

export function accumulateBlueprint(
  bp: ArticleBlueprint,
  update: Partial<ArticleBlueprint>
): ArticleBlueprint {
  const merged = {
    ...bp,
    ...update,
    keyArguments: [
      ...bp.keyArguments,
      ...(update.keyArguments || []),
    ],
    audienceExpectations: Array.from(
      new Set([...bp.audienceExpectations, ...(update.audienceExpectations || [])])
    ),
    requiredEvidence: Array.from(
      new Set([...bp.requiredEvidence, ...(update.requiredEvidence || [])])
    ),
    stylisticConstraints: Array.from(
      new Set([...bp.stylisticConstraints, ...(update.stylisticConstraints || [])])
    ),
    updatedAt: Date.now(),
  };

  merged.completeness = calculateCompleteness(merged);

  // Auto-detect structure type from genre
  if (!merged.structureType || merged.structureType === "classical") {
    merged.structureType = GENRE_STRUCTURES[merged.genre] || "classical";
  }

  // Auto-assign reviewers based on genre
  if (merged.reviewerPerspectives.length === 0 && merged.genre) {
    merged.reviewerPerspectives = DEFAULT_REVIEWERS[merged.genre] || [];
  }

  return merged;
}

// ═══════════════════════════════════════════════════════════════
// Blueprint → Outline Generator
// ═══════════════════════════════════════════════════════════════

export function blueprintToOutline(bp: ArticleBlueprint): BlueprintNode[] {
  const structure = GENRE_STRUCTURES[bp.genre] || "classical";

  const templates: Record<StructureType, BlueprintNode[]> = {
    classical: [
      {
        id: "intro", level: 1, title: "引言",
        purpose: "建立背景 + 提出核心论点",
        targetLength: "short",
        keyInsight: bp.coreThesis,
        connections: ["body"],
      },
      {
        id: "body", level: 1, title: "正文论述",
        purpose: "展开论证",
        targetLength: "long",
        keyInsight: bp.keyArguments[0]?.claim || "核心论证",
        connections: ["conclusion"],
      },
      {
        id: "conclusion", level: 1, title: "结论",
        purpose: "总结 + 升华",
        targetLength: "short",
        keyInsight: "回到开头的问题，给出回答",
        connections: [],
      },
    ],
    problem_solution: [
      {
        id: "p1", level: 1, title: "问题的提出",
        purpose: "定义问题 + 说明重要性",
        targetLength: "medium",
        keyInsight: "为什么这个问题值得关注",
        connections: ["p2"],
      },
      {
        id: "p2", level: 1, title: "分析与诊断",
        purpose: "分析问题的根源",
        targetLength: "medium",
        keyInsight: "问题的深层原因",
        connections: ["p3"],
      },
      {
        id: "p3", level: 1, title: "解决方案",
        purpose: "提出具体方案",
        targetLength: "medium",
        keyInsight: "可行的解决路径",
        connections: ["p4"],
      },
      {
        id: "p4", level: 1, title: "总结与展望",
        purpose: "回顾 + 下一步",
        targetLength: "short",
        keyInsight: "方案的价值和未来方向",
        connections: [],
      },
    ],
    compare_contrast: [
      {
        id: "cc1", level: 1, title: "引入：为什么需要对比",
        purpose: "建立对比框架",
        targetLength: "short",
        keyInsight: "对比的意义",
        connections: ["cc2", "cc3"],
      },
      {
        id: "cc2", level: 1, title: "A 面分析",
        purpose: "详细分析第一个视角",
        targetLength: "medium",
        keyInsight: "A 方的核心论点",
        connections: ["cc3"],
      },
      {
        id: "cc3", level: 1, title: "B 面分析",
        purpose: "详细分析第二个视角",
        targetLength: "medium",
        keyInsight: "B 方的核心论点",
        connections: ["cc4"],
      },
      {
        id: "cc4", level: 1, title: "综合与结论",
        purpose: "找出共同点和差异",
        targetLength: "short",
        keyInsight: "对比的核心发现",
        connections: [],
      },
    ],
    narrative_arc: [
      {
        id: "n1", level: 1, title: "起 — 开场",
        purpose: "设立场景与基调",
        targetLength: "short",
        keyInsight: "抓住读者的第一个瞬间",
        connections: ["n2"],
      },
      {
        id: "n2", level: 1, title: "承 — 展开",
        purpose: "事件/感受的推进",
        targetLength: "medium",
        keyInsight: "核心叙事的发展",
        connections: ["n3"],
      },
      {
        id: "n3", level: 1, title: "转 — 转折",
        purpose: "意外的变化或深化",
        targetLength: "medium",
        keyInsight: "故事的关键转折",
        connections: ["n4"],
      },
      {
        id: "n4", level: 1, title: "合 — 收束",
        purpose: "回到原点，带有新的理解",
        targetLength: "short",
        keyInsight: "读者最后的感受",
        connections: [],
      },
    ],
    pyramid: [
      {
        id: "py1", level: 1, title: "核心结论",
        purpose: "直接给出最重要的发现",
        targetLength: "short",
        keyInsight: bp.coreThesis,
        connections: ["py2"],
      },
      {
        id: "py2", level: 1, title: "支撑论据一",
        purpose: "第一个核心支撑",
        targetLength: "medium",
        keyInsight: bp.keyArguments[0]?.claim || "",
        connections: ["py3"],
      },
      {
        id: "py3", level: 1, title: "支撑论据二",
        purpose: "第二个核心支撑",
        targetLength: "medium",
        keyInsight: bp.keyArguments[1]?.claim || "",
        connections: ["py4"],
      },
      {
        id: "py4", level: 1, title: "方法论与展望",
        purpose: "说明研究局限与未来方向",
        targetLength: "short",
        keyInsight: "诚实面对局限",
        connections: [],
      },
    ],
    layer_cake: [
      {
        id: "lc1", level: 1, title: "表层现象",
        purpose: "从最可见的现象入手",
        targetLength: "short",
        keyInsight: "大多数人看到的东西",
        connections: ["lc2"],
      },
      {
        id: "lc2", level: 1, title: "中层机制",
        purpose: "揭示背后的运作方式",
        targetLength: "medium",
        keyInsight: "为什么会这样",
        connections: ["lc3"],
      },
      {
        id: "lc3", level: 1, title: "深层结构",
        purpose: "根本性的原因",
        targetLength: "medium",
        keyInsight: "底层的驱动力",
        connections: ["lc4"],
      },
      {
        id: "lc4", level: 1, title: "回到表层",
        purpose: "用深层理解重新审视表层",
        targetLength: "short",
        keyInsight: "现在你看这个现象会有什么不同",
        connections: [],
      },
    ],
    spoke_wheel: [
      {
        id: "sw1", level: 1, title: "中心论点",
        purpose: "确立核心命题",
        targetLength: "short",
        keyInsight: bp.coreThesis,
        connections: ["sw2", "sw3", "sw4"],
      },
      {
        id: "sw2", level: 1, title: "角度一",
        purpose: "从第一个维度展开",
        targetLength: "short",
        keyInsight: bp.keyArguments[0]?.claim || "",
        connections: ["sw1"],
      },
      {
        id: "sw3", level: 1, title: "角度二",
        purpose: "从第二个维度展开",
        targetLength: "short",
        keyInsight: bp.keyArguments[1]?.claim || "",
        connections: ["sw1"],
      },
      {
        id: "sw4", level: 1, title: "角度三 / 收束",
        purpose: "第三个维度或总结",
        targetLength: "short",
        keyInsight: "汇聚到中心",
        connections: ["sw1"],
      },
    ],
    timeline: [
      {
        id: "t1", level: 1, title: "起点",
        purpose: "时间线的开端",
        targetLength: "short",
        keyInsight: "开始的时刻",
        connections: ["t2"],
      },
      {
        id: "t2", level: 1, title: "发展",
        purpose: "事件的展开",
        targetLength: "medium",
        keyInsight: "关键转折",
        connections: ["t3"],
      },
      {
        id: "t3", level: 1, title: "终点 / 现在",
        purpose: "时间线的终点",
        targetLength: "short",
        keyInsight: "当下的状态或感悟",
        connections: [],
      },
    ],
  };

  return templates[structure];
}

// ═══════════════════════════════════════════════════════════════
// Blueprint → Writing Paths
// ═══════════════════════════════════════════════════════════════

export type WritingPath = "ai_generate" | "user_write";

export interface BlueprintResult {
  blueprint: ArticleBlueprint;
  outline: BlueprintNode[];
  reviewers: ReviewerPerspective[];
  completeness: number;
  recommendedPath: WritingPath;
  summary: string;
}

export function finalizeBlueprint(bp: ArticleBlueprint, fullText?: string): BlueprintResult {
  const outline = bp.outline.length > 0 ? bp.outline : blueprintToOutline(bp);
  const reviewers = fullText
    ? generatePeerReview(bp, fullText)
    : bp.reviewerPerspectives;
  const completeness = calculateCompleteness(bp);

  // Recommend path based on user behavior
  const recommendedPath: WritingPath =
    bp.keyArguments.length >= 3 && bp.primaryAudience ? "ai_generate" : "user_write";

  // Generate summary
  const summary = `写作蓝图 — ${bp.genre}
目标读者：${bp.primaryAudience || "未指定"}
核心论点：${bp.coreThesis}
结构类型：${bp.structureType}
完整度：${completeness}%
${outline.length} 个章节 | ${reviewers.length} 位评审`;

  return {
    blueprint: { ...bp, outline, reviewerPerspectives: reviewers, completeness },
    outline,
    reviewers,
    completeness,
    recommendedPath,
    summary,
  };
}
