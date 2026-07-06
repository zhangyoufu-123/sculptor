export interface StyleIdentity {
  tone: number;
  density: number;
}

export interface StyleRhythm {
  sentenceLength: number;
  punctuation: number;
}

export interface StyleConfig {
  identity: StyleIdentity;
  rhythm: StyleRhythm;
  imagery: string[];
}

export type Intent =
  | "rewrite"
  | "continue"
  | "explain"
  | "shorter"
  | "longer"
  | "more_formal"
  | "more_casual"
  | "translate_en"
  | "custom";

export interface SuggestionOption {
  index: number;
  text: string;
  styleShift: string;
}

export interface StreamEvent {
  type: "option" | "done" | "error";
  index?: number;
  text?: string;
  styleShift?: string;
  total?: number;
  error?: string;
}

export type WritingState =
  | "idle"
  | "selected"
  | "bubble_open"
  | "loading"
  | "streaming"
  | "inserting";

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown> | null;
  updated_at: string;
  created_at: string;
}

export interface DocumentListItem {
  id: string;
  title: string;
  updated_at: string;
}

export type SaveStatus = "saved" | "saving" | "unsaved";

export interface StyleProfileData {
  tone: string;
  avg_sentence_length: number;
  common_imagery: string[];
  formality: number;
  keywords: string[];
}

export interface MasterQuote {
  text: string;
  author: string;
  source: string;
  keywords: string[];
  tone: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  url: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  children: ArchitectureNode[];
  position: number;
}

export interface ImageryWord {
  word: string;
  count: number;
  positions: number[];
}

// ═══════════════════════════════════════════════════════════════
// v2.1 Pipeline types
// ═══════════════════════════════════════════════════════════════

export interface ContextPackage {
  userId: string;
  documentId: string;
  currentText: string;
  surroundingContext: string;
  userInstruction: string;
  styleProfile: StyleProfileData | null;
  documentSkeleton: unknown | null;
  recentFeedback: FeedbackLog[];
  recentMemories?: MemoryEntry[];
}

export interface IntentAnalysis {
  genre: "fiction" | "essay" | "prose" | "report" | "unknown";
  function: "continue" | "rewrite" | "describe" | "argue" | "explain";
  emotion: "calm" | "tense" | "melancholy" | "passionate" | "neutral";
  pace: "slow" | "medium" | "fast";
  topicWords: string[];
}

export interface StyleConstraints {
  avgSentenceLength: number;
  activeImagery: string[];
  toneProfile: string;
  formality: string;
  observations: string[];
  retrievalKeywords: string[];
}

export interface RelevantMaterial {
  source: "user_corpus" | "corpus";
  title: string;
  snippet: string;
  relevance: number;
}

export interface FeedbackLog {
  id: string;
  documentId: string;
  suggestionText: string;
  action: "accept" | "reject" | "modify";
  contextPreview: string;
  createdAt: string;
}

export interface MemoryEntry {
  memoryType: string;
  memoryData: Record<string, unknown>;
  importance: number;
}

export interface GhostTextState {
  text: string;
  visible: boolean;
  position: { from: number; to: number };
}

export type PipelineStage =
  | "idle"
  | "collecting_context"
  | "analyzing_intent"
  | "reading_style"
  | "retrieving"
  | "rewriting_instruction"
  | "generating"
  | "recording_feedback"
  | "done"
  | "error";

// v2.1-Final: Intensity grading
export type GenerationIntensity = "light" | "normal" | "deep" | "experiment";
