"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────

export interface ParagraphInfo {
  text: string;        // paragraph content
  index: number;       // position in document
  startPos: number;    // character offset
  endPos: number;
}

export interface DiagnosisResult {
  mirrorPlayback: string;    // "这段在论述 [主题]，核心论点是 [观点]"
  readerQuestion: string;    // "但我还想知道——[具体追问]"
  microAlerts: string[];     // ["· 这段节奏偏快", "· 缺少过渡句"]
  updatedAt: number;         // timestamp
}

export interface InspirationItem {
  id: string;
  type: "alert" | "suggestion" | "knowledge" | "continuation";
  priority: "high" | "medium" | "low";
  content: string;           // display text
  source?: string;           // "历史风格库" | "AI创作" | "知识库"
  actionable?: boolean;      // can be clicked to insert
}

export interface EchoWallState {
  // Paragraph detection
  currentParagraph: ParagraphInfo | null;
  paragraphCount: number;

  // Pause detection
  isPaused: boolean;         // user stopped typing for 3+ seconds
  pauseDuration: number;     // seconds since last input

  // Diagnosis
  diagnosis: DiagnosisResult | null;
  diagnosisLoading: boolean;

  // Inspiration stream
  inspirations: InspirationItem[];

  // Selection (intent channel)
  selectedText: string | null;
  selectionAnalysis: DiagnosisResult | null;
  selectionLoading: boolean;
}

// ── Paragraph Detector ─────────────────────────────────────

export function detectParagraphs(text: string): ParagraphInfo[] {
  const paragraphs: ParagraphInfo[] = [];
  let index = 0;
  let pos = 0;

  const parts = text.split(/\n\n+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {
      pos += part.length + 2;
      continue;
    }
    const startPos = text.indexOf(trimmed, pos);
    paragraphs.push({
      text: trimmed,
      index,
      startPos: startPos >= 0 ? startPos : pos,
      endPos: startPos >= 0 ? startPos + trimmed.length : pos + trimmed.length,
    });
    index++;
    pos = startPos >= 0 ? startPos + trimmed.length + 2 : pos + part.length + 2;
  }
  return paragraphs;
}

export function getCurrentParagraph(
  text: string,
  cursorPos: number
): ParagraphInfo | null {
  const paragraphs = detectParagraphs(text);
  return (
    paragraphs.find(
      (p) => cursorPos >= p.startPos && cursorPos <= p.endPos
    ) || paragraphs[paragraphs.length - 1] || null
  );
}

// ── Micro Alert Rules (real-time, no AI needed) ────────────

function analyzeMicroAlerts(text: string): string[] {
  const alerts: string[] = [];

  // Word repetition check
  const words = text.split(/[，。！？、\s]+/).filter(Boolean);
  const wordCount: Record<string, number> = {};
  words.forEach((w) => {
    if (w.length >= 2) wordCount[w] = (wordCount[w] || 0) + 1;
  });
  const overused = Object.entries(wordCount)
    .filter(([, c]) => c >= 3)
    .slice(0, 2);
  overused.forEach(([w, c]) => {
    alerts.push(`· " ${w} " 出现了 ${c} 次，可以考虑替换`);
  });

  // Paragraph length check
  const len = text.replace(/\s/g, "").length;
  if (len > 800) alerts.push("· 这段偏长（>800字），读者可能疲劳");
  if (len < 30 && len > 0) alerts.push("· 这段很短，是否需要展开？");

  // Connective word check
  const connectives = ["但是", "然而", "因此", "所以", "而且", "不过", "此外"];
  const found = connectives.filter((c) => text.includes(c));
  if (found.length === 0 && len > 100) {
    alerts.push("· 未检测到逻辑连接词，段落间可能需要过渡");
  }

  return alerts;
}

// ── Main Hook ──────────────────────────────────────────────

export function useEchoWall(options?: {
  editorContent?: string;
  cursorPosition?: number;
}) {
  const { editorContent = "", cursorPosition = 0 } = options || {};

  const [state, setState] = useState<EchoWallState>({
    currentParagraph: null,
    paragraphCount: 0,
    isPaused: false,
    pauseDuration: 0,
    diagnosis: null,
    diagnosisLoading: false,
    inspirations: [],
    selectedText: null,
    selectionAnalysis: null,
    selectionLoading: false,
  });

  const lastInputRef = useRef(Date.now());
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevParagraphRef = useRef<string>("");

  // ── Paragraph detection effect ──────────────────────────
  useEffect(() => {
    const paragraphs = detectParagraphs(editorContent);
    const current = getCurrentParagraph(editorContent, cursorPosition);

    setState((prev) => ({
      ...prev,
      currentParagraph: current,
      paragraphCount: paragraphs.length,
    }));

    // Detect paragraph completion (new paragraph started)
    if (
      current &&
      current.text !== prevParagraphRef.current &&
      current.text.length > 50
    ) {
      prevParagraphRef.current = current.text;

      // Trigger analysis after a paragraph completes
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          diagnosisLoading: true,
        }));
        // Analysis will be done by the AI API or local rules
        // For now, use local micro-alerts
        const microAlerts = analyzeMicroAlerts(current.text);
        setState((prev) => ({
          ...prev,
          diagnosis: {
            mirrorPlayback: `这段在展开论述，共 ${current.text.length} 字`,
            readerQuestion: "作为读者，我想知道——你的核心论点是否已经有了足够的支撑？",
            microAlerts,
            updatedAt: Date.now(),
          },
          diagnosisLoading: false,
        }));
      }, 1500);
    }

    // Update paragraph ref even for short paragraphs
    if (current && current.text.length > 0) {
      prevParagraphRef.current = current.text;
    }
  }, [editorContent, cursorPosition]);

  // ── Pause detection effect ──────────────────────────────
  useEffect(() => {
    lastInputRef.current = Date.now();

    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    pauseTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastInputRef.current;
      const seconds = Math.floor(elapsed / 1000);

      setState((prev) => ({
        ...prev,
        isPaused: seconds >= 3,
        pauseDuration: seconds >= 3 ? seconds : 0,
      }));

      // After 3 seconds pause, trigger inspiration refresh
      if (seconds === 3 && prevParagraphRef.current.length > 0) {
        setState((prev) => ({
          ...prev,
          inspirations: [
            ...prev.inspirations,
            {
              id: `pause-${Date.now()}`,
              type: "suggestion" as const,
              priority: "medium" as const,
              content: `当前在写「${prev.currentParagraph?.text.slice(0, 30) || "..."}...」，需要灵感吗？`,
              source: "AI创作",
            },
          ].slice(-10), // keep last 10
        }));
      }
    }, 1000);

    return () => {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    };
  }, [editorContent]);

  // ── Intent channel: text selection ──────────────────────
  const handleTextSelect = useCallback((selectedText: string | null) => {
    if (!selectedText || selectedText.length < 10) {
      setState((prev) => ({ ...prev, selectedText: null, selectionAnalysis: null }));
      return;
    }

    setState((prev) => ({
      ...prev,
      selectedText,
      selectionLoading: true,
    }));

    // Simulated analysis (will be replaced by API call)
    const microAlerts = analyzeMicroAlerts(selectedText);
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        selectionAnalysis: {
          mirrorPlayback: `选中了 ${selectedText.length} 字的文段`,
          readerQuestion: "这段的逻辑是否自洽？有没有需要加强的地方？",
          microAlerts,
          updatedAt: Date.now(),
        },
        selectionLoading: false,
      }));
    }, 800);
  }, []);

  // ── Intent channel: double-click paragraph ──────────────
  const handleParagraphDoubleClick = useCallback(
    (paragraphText: string) => {
      handleTextSelect(paragraphText);
    },
    [handleTextSelect]
  );

  // ── Dismiss an inspiration item ─────────────────────────
  const dismissInspiration = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      inspirations: prev.inspirations.filter((i) => i.id !== id),
    }));
  }, []);

  // ── Accept an inspiration (insert into editor) ──────────
  const acceptInspiration = useCallback((id: string): string | null => {
    const item = state.inspirations.find((i) => i.id === id);
    if (item?.actionable) {
      dismissInspiration(id);
      return item.content;
    }
    return null;
  }, [state.inspirations, dismissInspiration]);

  // ── Cleanup ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
      if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    };
  }, []);

  return {
    state,
    handleTextSelect,
    handleParagraphDoubleClick,
    dismissInspiration,
    acceptInspiration,
  };
}
