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
