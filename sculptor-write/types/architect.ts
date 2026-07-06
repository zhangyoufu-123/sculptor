// types/architect.ts

export type BubbleType =
  | "thesis" | "argument" | "evidence" | "counterargument"
  | "transition" | "background" | "imagery" | "custom";

export type EdgeRelation =
  | "supports" | "contradicts" | "precedes"
  | "elaborates" | "exemplifies" | "concludes";

export interface ArchitectNode {
  id: string;
  label: string;
  type: BubbleType;
  position: { x: number; y: number };
  children: string[];
  notes?: string;          // 备注/摘要
  targetWords?: number;    // 目标字数
  priority?: "high" | "medium" | "low";
  colorTags?: string[];    // 颜色标签
  expanded?: boolean;
  reviewStatus?: "red" | "yellow" | "green";
}

export interface ArchitectEdge {
  id: string;
  from: string;
  to: string;
  relation: EdgeRelation;
}

export interface ArchitectScheme {
  id: string;
  name: string;
  nodes: ArchitectNode[];
  edges: ArchitectEdge[];
  isActive: boolean;
}

export interface ReviewIssue {
  nodeId: string;
  severity: "red" | "yellow" | "green";
  message: string;
  suggestion: string;
}

export interface ReviewResult {
  issues: ReviewIssue[];
  overallScore: number;
}

export interface AlignMessage {
  role: "ai" | "user";
  content: string;
}

export interface TemplateDef {
  name: string;
  description?: string;
  type: string;
  nodes: ArchitectNode[];
  edges: ArchitectEdge[];
}

export const BUBBLE_COLORS: Record<BubbleType, string> = {
  thesis: "#D4A853",
  argument: "#5B8DEF",
  evidence: "#4CAF50",
  counterargument: "#E74C3C",
  transition: "#888888",
  background: "#9B59B6",
  imagery: "#E67E22",
  custom: "#607D8B",
};

export const BUBBLE_LABELS: Record<BubbleType, string> = {
  thesis: "核心论点",
  argument: "分论点",
  evidence: "论据",
  counterargument: "反方观点",
  transition: "过渡",
  background: "背景",
  imagery: "意象",
  custom: "自定义",
};

export const EDGE_LABELS: Record<EdgeRelation, string> = {
  supports: "支持",
  contradicts: "反驳",
  precedes: "先于",
  elaborates: "阐述",
  exemplifies: "例证",
  concludes: "结论",
};

export const PRIORITY_COLORS = { high: "#E74C3C", medium: "#E6A817", low: "#888" };
export const PRIORITY_LABELS = { high: "高", medium: "中", low: "低" };
