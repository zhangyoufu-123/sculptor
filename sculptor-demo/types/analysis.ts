export type UIStatus = "idle" | "loading" | "refreshing" | "error";

export interface Verdict {
  score: number;
  label: "Strong" | "Medium" | "Weak";
}

export interface AnalysisResult {
  core_claim: string;
  bull_case: string[];
  bear_case: string[];
  hidden_assumptions: string[];
  decision_risks: string[];
  verdict: Verdict;
}

export interface InitialAnalysis {
  core_claim: string;
  arguments: string[];
  assumptions: string[];
}

export interface Critique {
  logical_issues: string[];
  missing_evidence: string[];
  confidence: number;
}

export interface AgentTrace {
  initial: InitialAnalysis;
  critique: Critique;
  final: AnalysisResult;
}

export interface AnalyzeRequest {
  url?: string;
  text?: string;
}
