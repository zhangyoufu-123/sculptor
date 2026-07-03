// Types for the adversarial reading engine's 5-step agent loop output

export interface InitialAnalysis {
  core_claim: string;
  arguments: string[];
  assumptions: string[];
}

export interface Critique {
  logical_issues: string[];
  missing_evidence: string[];
  confidence: number; // 0-100
}

export interface Verdict {
  score: number; // 0-100
  label: "Strong" | "Medium" | "Weak";
}

export interface FinalAnalysis {
  core_claim: string;
  bull_case: string[];
  bear_case: string[];
  hidden_assumptions: string[];
  decision_risks: string[];
  verdict: Verdict;
}

export interface AgentTrace {
  initial: InitialAnalysis;
  critique: Critique;
  final: FinalAnalysis;
}

export interface AnalyzeRequest {
  url?: string;
  text?: string;
}

export interface AnalyzeError {
  error: string;
}
