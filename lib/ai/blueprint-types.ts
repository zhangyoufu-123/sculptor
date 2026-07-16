/**
 * Article Blueprint — structured article plan.
 *
 * Built through goal-driven conversation, not template fill.
 * Accumulated across rounds, visible in real-time on Blueprint Canvas.
 */

// ═══════════════════════════════════════════════════════════════
// Core Blueprint
// ═══════════════════════════════════════════════════════════════

export interface ArticleBlueprint {
  /** Core identification */
  genre: string;
  subGenre: string;

  /** Audience layer */
  primaryAudience: string;
  secondaryAudience: string;
  audienceExpectations: string[];
  audiencePriorKnowledge: "none" | "basic" | "intermediate" | "expert";

  /** Content core */
  coreThesis: string;
  alternativeTheses: string[];
  keyArguments: Array<{ claim: string; support: string }>;

  /** Structural layer */
  structureType: StructureType;
  outline: BlueprintNode[];
  estimatedWordCount: number;

  /** Style layer */
  tone: "formal" | "conversational" | "academic" | "persuasive" | "narrative" | "analytical";
  voiceNotes: string;
  stylisticConstraints: string[];

  /** Research/evidence layer */
  requiredEvidence: string[];
  keyReferences: string[];
  counterArguments: string[];

  /** Editorial layer */
  reviewerPerspectives: ReviewerPerspective[];
  qualityCheckpoints: QualityCheckpoint[];

  /** Metadata */
  completeness: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface BlueprintNode {
  id: string;
  level: number;
  title: string;
  purpose: string;       // what this section does
  targetLength: string;  // "short (~100字)" | "medium (~300字)" | "long (~500字)"
  keyInsight: string;    // one thing reader must get
  connections: string[]; // links to other nodes
}

export type StructureType =
  | "classical"          // 引言-正文-结论
  | "problem_solution"   // 问题-分析-方案
  | "compare_contrast"   // A vs B
  | "narrative_arc"      // 起承转合
  | "pyramid"            // 结论先行
  | "layer_cake"         // 层层深入
  | "spoke_wheel"        // 中心论点 + 辐条
  | "timeline";          // 时间线

// ═══════════════════════════════════════════════════════════════
// AI Review Dimensions
// ═══════════════════════════════════════════════════════════════

export type ReviewDimension =
  | "logic"         // 逻辑严密性
  | "evidence"      // 证据充分性
  | "style"         // 风格一致性
  | "engagement"    // 吸引力/可读性
  | "structure"     // 结构合理性
  | "originality";  // 原创性

export interface AIComment {
  dimension: ReviewDimension;
  severity: "critical" | "suggestion" | "praise";
  location: string;        // which paragraph/section
  comment: string;
  suggestion?: string;
  rewrite?: string;        // AI-proposed rewrite
}

// ═══════════════════════════════════════════════════════════════
// Peer Review (multi-perspective)
// ═══════════════════════════════════════════════════════════════

export interface ReviewerPerspective {
  role: string;            // e.g. "领域专家", "普通读者", "编辑", "反对者"
  name: string;
  focus: ReviewDimension[];
  critique: string;        // what this reviewer would say
  score: number;           // 1-10
}

// ═══════════════════════════════════════════════════════════════
// Quality Checkpoints
// ═══════════════════════════════════════════════════════════════

export interface QualityCheckpoint {
  id: string;
  label: string;
  passed: boolean;
  details: string;
}

// ═══════════════════════════════════════════════════════════════
// Structure Templates by Genre
// ═══════════════════════════════════════════════════════════════

export const GENRE_STRUCTURES: Record<string, StructureType> = {
  "议论文": "classical",
  "散文": "narrative_arc",
  "游记": "timeline",
  "应试作文": "classical",
  "论文": "pyramid",
  "视频文案": "spoke_wheel",
  "公众号": "layer_cake",
  "博客": "problem_solution",
  "报告": "pyramid",
  "邮件": "problem_solution",
  "演讲": "classical",
  "日记": "narrative_arc",
  "小说": "narrative_arc",
  "诗歌": "spoke_wheel",
  "评论": "compare_contrast",
  "产品文案": "problem_solution",
  "教程": "layer_cake",
  "求职": "pyramid",
  "新媒体策划": "spoke_wheel",
  "致辞": "classical",
  "故事": "narrative_arc",
  "哲学随笔": "layer_cake",
};

// ═══════════════════════════════════════════════════════════════
// Reviewer templates by genre
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_REVIEWERS: Record<string, ReviewerPerspective[]> = {
  "议论文": [
    { role: "逻辑审查员", name: "逻辑审查员", focus: ["logic"], critique: "", score: 0 },
    { role: "反方辩手", name: "反方辩手", focus: ["evidence"], critique: "", score: 0 },
    { role: "普通读者", name: "普通读者", focus: ["engagement"], critique: "", score: 0 },
  ],
  "散文": [
    { role: "文学编辑", name: "文学编辑", focus: ["style", "originality"], critique: "", score: 0 },
    { role: "共情读者", name: "共情读者", focus: ["engagement"], critique: "", score: 0 },
  ],
  "论文": [
    { role: "领域专家", name: "领域专家", focus: ["logic", "evidence"], critique: "", score: 0 },
    { role: "方法论审查员", name: "方法论审查员", focus: ["structure"], critique: "", score: 0 },
    { role: "期刊编辑", name: "期刊编辑", focus: ["style", "originality"], critique: "", score: 0 },
  ],
  "视频文案": [
    { role: "导演", name: "导演", focus: ["structure", "engagement"], critique: "", score: 0 },
    { role: "观众代表", name: "观众代表", focus: ["engagement"], critique: "", score: 0 },
  ],
  "公众号": [
    { role: "主编", name: "主编", focus: ["engagement", "structure"], critique: "", score: 0 },
    { role: "数据核查员", name: "数据核查员", focus: ["evidence"], critique: "", score: 0 },
    { role: "标题党", name: "标题党", focus: ["engagement"], critique: "", score: 0 },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════

export function createEmptyBlueprint(anchor: string = ""): ArticleBlueprint {
  return {
    genre: "",
    subGenre: "",
    primaryAudience: "",
    secondaryAudience: "",
    audienceExpectations: [],
    audiencePriorKnowledge: "basic",
    coreThesis: anchor,
    alternativeTheses: [],
    keyArguments: [],
    structureType: "classical",
    outline: [],
    estimatedWordCount: 1000,
    tone: "conversational",
    voiceNotes: "",
    stylisticConstraints: [],
    requiredEvidence: [],
    keyReferences: [],
    counterArguments: [],
    reviewerPerspectives: [],
    qualityCheckpoints: [],
    completeness: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function calculateCompleteness(bp: ArticleBlueprint): number {
  let score = 0;
  if (bp.genre) score += 15;
  if (bp.primaryAudience) score += 10;
  if (bp.coreThesis && bp.coreThesis.length > 10) score += 20;
  if (bp.keyArguments.length >= 2) score += 15;
  if (bp.outline.length >= 3) score += 15;
  if (bp.tone) score += 5;
  if (bp.requiredEvidence.length >= 1) score += 5;
  if (bp.stylisticConstraints.length >= 1) score += 5;
  if (bp.reviewerPerspectives.length >= 1) score += 5;
  if (bp.qualityCheckpoints.length >= 1) score += 5;
  return Math.min(100, score);
}
