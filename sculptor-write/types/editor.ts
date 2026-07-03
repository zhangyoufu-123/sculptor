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

export type Intent = "rewrite" | "continue" | "explain";

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
