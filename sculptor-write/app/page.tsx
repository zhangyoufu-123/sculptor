"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import DocumentList from "@/components/DocumentList";
import StyleSetup from "@/components/StyleSetup";
import CommandPalette from "@/components/CommandPalette";
import EchoWall from "@/components/EchoWall";
import ArchitecturePanel from "@/components/ArchitecturePanel";
import { useGhostText } from "@/hooks/useGhostText";
import { useUIStore } from "@/lib/store";
import type {
  Intent,
  SuggestionOption,
  StreamEvent,
  DocumentListItem,
  Document,
  SaveStatus,
  StyleProfileData,
  MasterQuote,
  SearchResult,
} from "@/types/editor";
import type { Editor } from "@tiptap/react";

const WRITE_TIMEOUT_MS = 45_000;
const AUTOSAVE_DELAY_MS = 2000;
const ANALYSIS_POLL_MS = 15_000;
const PAUSE_DETECT_MS = 8_000;
const PAUSE_CHECK_MS = 1_000;

export default function Home() {
  const editorRef = useRef<Editor | null>(null);
  const [currentIntent, setCurrentIntent] = useState<Intent>("rewrite");

  // ── Document state ────────────────────────────────────────────
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("Untitled");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Style profile modal ───────────────────────────────────────
  const [styleOpen, setStyleOpen] = useState(false);

  // ── Command palette ───────────────────────────────────────────
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // ── Architecture panel state ───────────────────────────────────
  const [wordGoal, setWordGoal] = useState(3000);
  const [editorPlainText, setEditorPlainText] = useState("");

  // ── Echo Wall state ───────────────────────────────────────────
  const [echoWallAnalysis, setEchoWallAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [echoWallInspiration, setEchoWallInspiration] = useState("");
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [masterQuotes, setMasterQuotes] = useState<MasterQuote[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Write mode store ──────────────────────────────────────────
  const selectedText = useUIStore((s) => s.selectedText);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setStyleProfile = useUIStore((s) => s.setStyleProfile);
  const styleProfile = useUIStore((s) => s.styleProfile);

  // ── Ghost Text ────────────────────────────────────────────────
  const { ghostText } = useGhostText(editorRef.current);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // ── Autosave ──────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const saveDocument = useCallback(
    async (title?: string, content?: Record<string, unknown>) => {
      if (!currentDocId) return;
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      setSaveStatus("saving");

      try {
        const body: Record<string, unknown> = {};
        if (content !== undefined) body.content = content;
        if (title !== undefined) body.title = title;

        const res = await fetch(`/api/documents/${currentDocId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Save failed");
        }

        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave error:", err);
        setSaveStatus("unsaved");
      } finally {
        isSavingRef.current = false;
      }
    },
    [currentDocId]
  );

  const triggerAutosave = useCallback(
    (title?: string) => {
      if (!currentDocId || !editorRef.current) return;

      setSaveStatus("unsaved");

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(() => {
        const json = editorRef.current?.getJSON() ?? null;
        saveDocument(title, json as Record<string, unknown>);
      }, AUTOSAVE_DELAY_MS);
    },
    [currentDocId, saveDocument]
  );

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // ── Document CRUD ─────────────────────────────────────────────
  const handleOpenDocument = useCallback(
    async (docItem: DocumentListItem) => {
      try {
        const res = await fetch(`/api/documents/${docItem.id}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const doc: Document = data.document;

        setCurrentDoc(doc);
        setCurrentDocId(doc.id);
        setDocumentTitle(doc.title);
        setSaveStatus("saved");

        // Load content into editor
        if (editorRef.current && doc.content) {
          editorRef.current.commands.setContent(doc.content);
        }
      } catch (err) {
        console.error("Error opening document:", err);
      }
    },
    []
  );

  const handleNewDocument = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      const doc: Document = data.document;

      setCurrentDoc(doc);
      setCurrentDocId(doc.id);
      setDocumentTitle("Untitled");
      setSaveStatus("saved");

      // Clear editor
      if (editorRef.current) {
        editorRef.current.commands.clearContent();
      }
    } catch (err) {
      console.error("Error creating document:", err);
    }
  }, []);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setDocumentTitle(newTitle);
      saveDocument(newTitle);
    },
    [saveDocument]
  );

  // ── Editor change handler (for autosave + pause detection) ────
  const lastKeypressTime = useRef(Date.now());

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !currentDocId) return;

    const handleUpdate = () => {
      triggerAutosave();
      lastKeypressTime.current = Date.now();

      // Clear inspiration and master quotes when user resumes typing
      setEchoWallInspiration("");
      setMasterQuotes([]);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [currentDocId, triggerAutosave]);

  // ── Architecture panel: node click → scroll editor ────────────
  const handleArchitectureNodeClick = useCallback((position: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    // Navigate editor to the paragraph position
    const docSize = editor.state.doc.content.size;
    const targetPos = Math.min(position + 1, docSize);
    editor.commands.setTextSelection(targetPos);
    editor.commands.scrollIntoView();
  }, []);

  // ── Echo Wall: 15s polling cycle ──────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const editor = editorRef.current;
      if (!editor) return;

      // Only poll if editor has content
      const fullText = editor.getText();
      if (!fullText.trim()) return;

      // Get last ~500 chars
      const recentText = fullText.slice(-500);

      setAnalysisLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: recentText,
            intent: "explain",
            documentId: currentDocId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.analysis) {
            setEchoWallAnalysis(data.analysis);
          }
        }
      } catch {
        // Silent fail — analysis is non-critical
      } finally {
        setAnalysisLoading(false);
      }

      // Also trigger inspiration fetch when text > 200 chars
      if (fullText.length > 200) {
        try {
          const inspRes = await fetch("/api/write/inspiration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recentText: fullText.slice(-1000) }),
          });

          if (inspRes.ok) {
            const inspData = await inspRes.json();
            if (inspData.quotes) {
              setMasterQuotes(inspData.quotes);
            }
          }
        } catch {
          // Silent fail
        }
      }
    }, ANALYSIS_POLL_MS);

    return () => clearInterval(interval);
  }, [styleProfile]);

  // ── 8s Pause Detection for inspiration ────────────────────────
  const inspirationFetchedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      // Don't re-trigger if already shown inspiration
      if (inspirationFetchedRef.current) return;

      const editor = editorRef.current;
      if (!editor) return;

      const fullText = editor.getText();
      if (!fullText.trim()) return;

      const paused = Date.now() - lastKeypressTime.current > PAUSE_DETECT_MS;
      if (!paused) return;

      // User paused 8s — fetch inspiration
      inspirationFetchedRef.current = true;
      setInspirationLoading(true);

      try {
        // Get last paragraph as context
        const paragraphs = fullText.split("\n").filter((p) => p.trim());
        const lastParagraph = paragraphs[paragraphs.length - 1] || fullText.slice(-300);

        const res = await fetch("/api/write/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText: lastParagraph,
            intent: "continue",
          }),
        });

        if (res.ok) {
          const reader = res.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            let buffer = "";
            let inspirationText = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                let event: StreamEvent;
                try {
                  event = JSON.parse(data);
                } catch {
                  continue;
                }
                if (event.type === "option" && event.text) {
                  // Take first suggestion only
                  if (!inspirationText) {
                    inspirationText = event.text;
                  }
                }
              }
            }

            if (inspirationText) {
              setEchoWallInspiration(inspirationText);
            }
          }
        }
      } catch {
        // Silent fail
      } finally {
        setInspirationLoading(false);
      }
    }, PAUSE_CHECK_MS);

    return () => clearInterval(interval);
  }, []);

  // ── Style profile callback ────────────────────────────────────
  const handleStyleProfileSaved = useCallback(
    (profile: StyleProfileData) => {
      setStyleProfile({
        tone: profile.tone,
        avg_sentence_length: profile.avg_sentence_length,
        common_imagery: profile.common_imagery,
        formality: String(profile.formality),
        keywords: profile.keywords,
      });
    },
    [setStyleProfile]
  );

  // ── Write: handle AI suggestions ──────────────────────────────
  const writeAbortRef = useRef<AbortController | null>(null);
  const writeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIntent = useCallback(
    async (intent: Intent, customText?: string) => {
      if (!selectedText) return;

      // Abort any in-flight request to prevent races
      if (writeAbortRef.current) {
        writeAbortRef.current.abort();
      }
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }

      const controller = new AbortController();
      writeAbortRef.current = controller;

      setCurrentIntent(intent);
      setWritingState("loading");
      clearSuggestions();

      // 45s timeout
      writeTimeoutRef.current = setTimeout(() => {
        controller.abort();
      }, WRITE_TIMEOUT_MS);

      try {
        const body: Record<string, unknown> = {
          text: selectedText,
          intent,
          documentId: currentDocId,
        };
        if (intent === "custom" && customText) {
          body.customText = customText;
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
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

            // Defensive JSON parsing for SSE events
            let event: StreamEvent;
            try {
              event = JSON.parse(data);
            } catch {
              console.warn("Skipping malformed SSE event:", data.slice(0, 80));
              continue;
            }

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
        // Ignore abort errors (user triggered a new request)
        if (controller.signal.aborted) return;

        const msg = err instanceof Error ? err.message : "Something went wrong";
        console.error("AI suggest error:", msg);
        clearSuggestions();
        setWritingState("idle");
      } finally {
        // Cleanup timeout if this is still the active controller
        if (writeAbortRef.current === controller) {
          writeAbortRef.current = null;
        }
        if (writeTimeoutRef.current) {
          clearTimeout(writeTimeoutRef.current);
          writeTimeoutRef.current = null;
        }
      }
    },
    [selectedText, setWritingState, addSuggestion, clearSuggestions]
  );

  const handleDone = useCallback(() => {
    // Trigger autosave after suggestion inserted
    triggerAutosave();
  }, [triggerAutosave]);

  // ── EchoWall: adopt inspiration ───────────────────────────────
  const handleAdoptInspiration = useCallback(
    (text: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      // Insert inspiration at cursor position
      editor
        .chain()
        .focus()
        .insertContent(" " + text)
        .run();

      setEchoWallInspiration("");
      triggerAutosave();
    },
    [triggerAutosave]
  );

  // ── EchoWall: web search ──────────────────────────────────────
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchLoading(true);
      try {
        const res = await fetch("/api/write/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results) {
            setSearchResults(data.results);
          }
        }
      } catch {
        // Silent fail
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  // ── Document import ───────────────────────────────────────────
  const handleImport = useCallback(
    (text: string, _filename: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.commands.setContent(text);
      triggerAutosave();
    },
    [triggerAutosave]
  );

  // ── Blank line double-click ───────────────────────────────────
  const handleBlankDoubleClick = useCallback(() => {
    // Open the command palette for custom prompt mode
    setCommandPaletteOpen(true);
  }, []);

  // ── Ghost Text feedback ───────────────────────────────────────
  const handleGhostAccept = useCallback(() => {
    if (!ghostText.text || !ghostText.visible) return;
    fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: currentDocId,
        suggestionText: ghostText.text,
        action: "accept",
        contextPreview: editorRef.current?.getText().slice(-200) || "",
      }),
    }).catch(() => {});
  }, [ghostText.text, ghostText.visible, currentDocId]);

  const handleGhostReject = useCallback(() => {
    if (!ghostText.text || !ghostText.visible) return;
    fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: currentDocId,
        suggestionText: ghostText.text,
        action: "reject",
        contextPreview: editorRef.current?.getText().slice(-200) || "",
      }),
    }).catch(() => {});
  }, [ghostText.text, ghostText.visible, currentDocId]);

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // ⌘J / Ctrl+J: Open command palette
      if (mod && e.key === "j") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // ⌘K / Ctrl+K: Open command palette (legacy)
      if (mod && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // ⌘Enter / Ctrl+Enter: Quick rewrite
      if (mod && e.key === "Enter" && selectedText) {
        e.preventDefault();
        handleIntent("rewrite");
        return;
      }

      // Escape: Close command palette
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedText, commandPaletteOpen, handleIntent]);

  // ── Command palette handler ────────────────────────────────────
  const handleCommand = useCallback(
    (intent: Intent) => {
      handleIntent(intent);
    },
    [handleIntent]
  );

  const handleCustomCommand = useCallback(
    (text: string) => {
      handleIntent("custom", text);
    },
    [handleIntent]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        documentTitle={documentTitle}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        onStyleClick={() => setStyleOpen(true)}
      />
      <div style={{ display: "flex", flex: 1 }}>
        {sidebarCollapsed ? (
          <div
            style={{
              width: 48,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 12,
              background: "#0d0d0d",
              borderRight: "1px solid #1a1a1a",
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(false)}
              style={{
                background: "none",
                border: "none",
                color: "#c4a565",
                fontSize: 18,
                cursor: "pointer",
                padding: 4,
              }}
            >
              →
            </button>
          </div>
        ) : (
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: "#0d0d0d",
              borderRight: "1px solid #1a1a1a",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <ArchitecturePanel
              editorContent={editorPlainText}
              onNodeClick={handleArchitectureNodeClick}
              imageryWords={[]}
              wordGoal={wordGoal}
              onWordGoalChange={setWordGoal}
            />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <DocumentList
                onOpenDocument={handleOpenDocument}
                currentDocId={currentDocId}
                onToggle={setSidebarCollapsed}
                onImport={handleImport}
              />
            </div>
          </div>
        )}
        <main
          className="flex-1 relative"
          style={{
            marginLeft: sidebarCollapsed ? 48 : 280,
            marginRight: 320,
          }}
        >
          <EditorCanvas
            onEditorReady={handleEditorReady}
            onBlankDoubleClick={handleBlankDoubleClick}
            ghostText={ghostText.text}
            onGhostAccept={handleGhostAccept}
            onGhostReject={handleGhostReject}
          />
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview
            editor={editorRef.current}
            intent={currentIntent}
            onDone={handleDone}
          />
        </main>
        <EchoWall
          analysisText={echoWallAnalysis}
          analysisLoading={analysisLoading}
          inspiration={echoWallInspiration}
          inspirationLoading={inspirationLoading}
          masterQuotes={masterQuotes}
          searchResults={searchResults}
          searchLoading={searchLoading}
          onAdopt={handleAdoptInspiration}
          onStyleSetupClick={() => setStyleOpen(true)}
          onSearch={handleSearch}
        />
      </div>
      <StyleSetup
        isOpen={styleOpen}
        onClose={() => setStyleOpen(false)}
        onProfileSaved={handleStyleProfileSaved}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onCommand={handleCommand}
        onCustomCommand={handleCustomCommand}
      />
    </div>
  );
}
