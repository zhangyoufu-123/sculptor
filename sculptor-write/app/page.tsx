"use client";

import { useCallback, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import type { AppMode } from "@/components/TopBar";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import InputPanel from "@/components/InputPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import VerdictCard from "@/components/VerdictCard";
import { useUIStore } from "@/lib/store";
import type { Intent, SuggestionOption, StreamEvent } from "@/types/editor";
import type { AgentTrace } from "@/types/analysis";
import type { Editor } from "@tiptap/react";

export default function Home() {
  const editorRef = useRef<Editor | null>(null);
  const [currentIntent, setCurrentIntent] = useState<Intent>("rewrite");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Mode state ────────────────────────────────────────────────────
  const [mode, setMode] = useState<AppMode>("write");

  // ── Analyze state ─────────────────────────────────────────────────
  const [analysisTrace, setAnalysisTrace] = useState<AgentTrace | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // ── Write mode store ──────────────────────────────────────────────
  const selectedText = useUIStore((s) => s.selectedText);
  const style = useUIStore((s) => s.style);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // ── Write: handle AI suggestions ──────────────────────────────────
  const handleIntent = useCallback(
    async (intent: Intent) => {
      if (!selectedText) return;

      setCurrentIntent(intent);
      setWritingState("loading");
      clearSuggestions();
      setErrorMessage(null);

      try {
        const response = await fetch("/api/write/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText,
            intent,
            style,
          }),
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        setWritingState("streaming");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            const event: StreamEvent = JSON.parse(data);

            if (event.type === "option" && event.text) {
              const opt: SuggestionOption = {
                index: event.index!,
                text: event.text,
                styleShift: event.styleShift || "",
              };
              addSuggestion(opt);
            } else if (event.type === "done") {
              setWritingState("idle");
            } else if (event.type === "error") {
              throw new Error(event.error || "AI error");
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        console.error("AI suggest error:", msg);
        clearSuggestions();
        setWritingState("idle");
        setErrorMessage(msg);
      }
    },
    [selectedText, style, setWritingState, addSuggestion, clearSuggestions],
  );

  const handleDone = useCallback(() => {
    // cleanup after insert
  }, []);

  // ── Analyze: handle analyze request ───────────────────────────────
  const handleAnalyze = useCallback(
    async (url?: string, text?: string) => {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setAnalysisTrace(null);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(url ? { url } : { text }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Analysis failed");
        }

        const trace: AgentTrace = await response.json();
        setAnalysisTrace(trace);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        console.error("Analyze error:", msg);
        setAnalysisError(msg);
      } finally {
        setAnalysisLoading(false);
      }
    },
    [],
  );

  // ── Mode switch handler ───────────────────────────────────────────
  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    // Clear analyze state when switching away
    if (newMode === "write") {
      setAnalysisError(null);
    }
    if (newMode === "analyze") {
      setErrorMessage(null);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar mode={mode} onModeChange={handleModeChange} />

      {mode === "write" ? (
        /* ================================================================ */
        /* WRITE MODE                                                        */
        /* ================================================================ */
        <main className="flex-1 relative">
          <EditorCanvas onEditorReady={handleEditorReady} />
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview
            editor={editorRef.current}
            intent={currentIntent}
            onDone={handleDone}
          />
          {errorMessage && (
            <div
              style={{
                position: "fixed",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--error-bg, #fee2e2)",
                color: "var(--error-text, #dc2626)",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                zIndex: 100,
              }}
            >
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                style={{ marginLeft: 12, cursor: "pointer", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>
          )}
        </main>
      ) : (
        /* ================================================================ */
        /* ANALYZE MODE                                                      */
        /* ================================================================ */
        <main
          className="flex-1 flex overflow-hidden"
          style={{ height: "calc(100vh - 48px)" }}
        >
          {/* Left panel: Input */}
          <div className="w-[380px] flex-shrink-0">
            <InputPanel
              onAnalyze={handleAnalyze}
              loading={analysisLoading}
              error={analysisError}
            />
          </div>

          {/* Right panel: Analysis + Verdict */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <AnalysisPanel
              trace={analysisTrace}
              loading={analysisLoading}
            />

            {analysisTrace && (
              <VerdictCard
                verdict={analysisTrace.final.verdict}
                hidden_assumptions={analysisTrace.final.hidden_assumptions}
                decision_risks={analysisTrace.final.decision_risks}
              />
            )}
          </div>
        </main>
      )}
    </div>
  );
}
