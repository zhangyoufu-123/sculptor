"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "@/components/TopBar";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import DocumentList from "@/components/DocumentList";
import StyleSetup from "@/components/StyleSetup";
import CommandPalette from "@/components/CommandPalette";
import { useUIStore } from "@/lib/store";
import type {
  Intent,
  SuggestionOption,
  StreamEvent,
  DocumentListItem,
  Document,
  SaveStatus,
  StyleProfileData,
} from "@/types/editor";
import type { Editor } from "@tiptap/react";

const WRITE_TIMEOUT_MS = 45_000;
const AUTOSAVE_DELAY_MS = 2000;

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

  // ── Write mode store ──────────────────────────────────────────
  const selectedText = useUIStore((s) => s.selectedText);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setStyleProfile = useUIStore((s) => s.setStyleProfile);

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

  // ── Editor change handler (for autosave) ─────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !currentDocId) return;

    const handleUpdate = () => {
      triggerAutosave();
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [currentDocId, triggerAutosave]);

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
    async (intent: Intent) => {
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
        const response = await fetch("/api/write/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText,
            intent,
          }),
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

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K / Ctrl+K: Open command palette
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

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        documentTitle={documentTitle}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        onStyleClick={() => setStyleOpen(true)}
      />
      <div style={{ display: "flex", flex: 1 }}>
        <DocumentList
          onOpenDocument={handleOpenDocument}
          currentDocId={currentDocId}
          onToggle={setSidebarCollapsed}
        />
        <main className="flex-1 relative" style={{ marginLeft: sidebarCollapsed ? 0 : 240 }}>
          <EditorCanvas onEditorReady={handleEditorReady} />
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview
            editor={editorRef.current}
            intent={currentIntent}
            onDone={handleDone}
          />
        </main>
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
      />
    </div>
  );
}
