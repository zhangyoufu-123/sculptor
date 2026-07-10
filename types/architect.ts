// types/architect.ts — v5.0 TreeLogic
// Simplified tree structure: nodes reference parent/children, no separate edges

export type NodeType =
  | "thesis" | "argument" | "evidence" | "counterargument"
  | "transition" | "background" | "imagery" | "custom"
  | "hook" | "rebuttal" | "conclusion";

export interface ArchNode {
  id: string;
  type: NodeType;
  title: string;
  summary?: string;
  writingTip?: string;   // v5.1: AI-generated writing prompt (≤30 chars)
  targetWords?: number;
  priority?: "high" | "medium" | "low";
  parent: string | null;
  children: string[];
  order: number;
  isExpanded: boolean;
}

export const NODE_TYPE_ICON: Record<NodeType, string> = {
  thesis: "💡", argument: "📍", evidence: "📖",
  counterargument: "⚔️", transition: "➡️", background: "🏞️",
  imagery: "🖼️", custom: "📌", hook: "🪝",
  rebuttal: "🛡️", conclusion: "🏁",
};

export const NODE_TYPE_COLOR: Record<NodeType, string> = {
  thesis: "#c9a95c", argument: "#5B8DEF", evidence: "#4CAF50",
  counterargument: "#E74C3C", transition: "#888888", background: "#9B59B6",
  imagery: "#E67E22", custom: "#607D8B", hook: "#E91E90",
  rebuttal: "#FF5722", conclusion: "#00BCD4",
};

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  thesis: "核心论点", argument: "分论点", evidence: "论据",
  counterargument: "反方观点", transition: "过渡", background: "背景",
  imagery: "意象", custom: "自定义", hook: "开篇钩子",
  rebuttal: "驳斥", conclusion: "结论",
};

export const PRIORITY_COLORS = { high: "#E74C3C", medium: "#E6A817", low: "#888" } as const;
export const PRIORITY_LABELS = { high: "高", medium: "中", low: "低" } as const;

// Backward compat: keep BubbleType etc. for StructureMap and other consumers
export type BubbleType = NodeType;
export const BUBBLE_COLORS = NODE_TYPE_COLOR;
export const BUBBLE_LABELS = NODE_TYPE_LABEL;

export type EdgeRelation = "supports" | "contradicts" | "precedes" | "elaborates" | "exemplifies" | "concludes";
export const EDGE_LABELS: Record<EdgeRelation, string> = {
  supports: "支持", contradicts: "反驳", precedes: "先于",
  elaborates: "阐述", exemplifies: "例证", concludes: "结论",
};

// Legacy types kept for backward compat during migration
export interface ArchitectNode {
  id: string; label: string; type: BubbleType;
  position: { x: number; y: number }; children: string[];
  notes?: string; targetWords?: number; priority?: "high" | "medium" | "low";
  expanded?: boolean; reviewStatus?: "red" | "yellow" | "green";
  writingTip?: string; // v5.1
}
export interface ArchitectEdge {
  id: string; from: string; to: string; relation: EdgeRelation;
}
export interface ReviewIssue { nodeId: string; severity: "red" | "yellow" | "green"; message: string; suggestion: string; }
export interface ArchitectScheme { id: string; name: string; description?: string; type: string; nodes: ArchitectNode[]; edges: ArchitectEdge[]; }

// Backward compat: AlignMessage
export interface AlignMessage { role: "user" | "ai"; content: string; }

// Backward compat: ReviewResult
export interface ReviewResult { issues: ReviewIssue[]; overallScore: number; }
