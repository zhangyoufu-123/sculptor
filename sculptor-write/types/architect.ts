// types/architect.ts

export type BubbleType =
  | "thesis"
  | "argument"
  | "evidence"
  | "counterargument"
  | "transition"
  | "background"
  | "imagery";

export type EdgeRelation =
  | "supports"
  | "contradicts"
  | "precedes"
  | "elaborates"
  | "exemplifies"
  | "concludes";

export interface ArchitectNode {
  id: string;
  label: string;
  type: BubbleType;
  position: { x: number; y: number };
  children: string[]; // child node IDs
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
  overallScore: number; // 0-100
}

export interface AlignMessage {
  role: "ai" | "user";
  content: string;
}

export interface AlignResponse {
  type: "question" | "template" | "done";
  content: string;
  templateType?: string;
}

export const BUBBLE_COLORS: Record<BubbleType, string> = {
  thesis: "#c4a565",
  argument: "#5b8def",
  evidence: "#4caf50",
  counterargument: "#e74c3c",
  transition: "#888888",
  background: "#9b59b6",
  imagery: "#e67e22",
};

export const BUBBLE_LABELS: Record<BubbleType, string> = {
  thesis: "核心论点",
  argument: "分论点",
  evidence: "论据",
  counterargument: "反方观点",
  transition: "过渡",
  background: "背景",
  imagery: "意象",
};

export const EDGE_LABELS: Record<EdgeRelation, string> = {
  supports: "支持",
  contradicts: "反驳",
  precedes: "先于",
  elaborates: "阐述",
  exemplifies: "例证",
  concludes: "结论",
};
