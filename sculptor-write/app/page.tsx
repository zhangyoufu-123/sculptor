"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Editor } from "@tiptap/react";
import TopBar from "@/components/TopBar";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import DocumentList from "@/components/DocumentList";
import StyleSetup from "@/components/StyleSetup";
import CommandPalette from "@/components/CommandPalette";
import EchoWall from "@/components/EchoWall";
import ArchitecturePanel from "@/components/ArchitecturePanel";
import ModeSelector from "@/components/shared/ModeSelector";
import SocraticPanel from "@/components/panels/SocraticPanel";
import { useGhostText } from "@/hooks/useGhostText";
import { useUIStore } from "@/lib/store";
import type { Intent, SuggestionOption, StreamEvent, DocumentListItem, Document, SaveStatus, StyleProfileData, MasterQuote, SearchResult } from "@/types/editor";

const WRITE_TIMEOUT_MS = 45000;
const AUTOSAVE_DELAY_MS = 2000;
const ANALYSIS_POLL_MS = 15000;
const PAUSE_DETECT_MS = 8000;

type PanelState = "open" | "collapsed" | "hidden";

export default function Home() {
  const router = useRouter();
  const editorRef = useRef<Editor | null>(null);

  // ── Mode Selector ───────────────────────────────────────────
  const [showModeSelector, setShowModeSelector] = useState(true);

  // ── Panel states ────────────────────────────────────────────
  const [leftPanel, setLeftPanel] = useState<PanelState>("open");
  const [rightPanel, setRightPanel] = useState<PanelState>("open");
  const [socraticOpen, setSocraticOpen] = useState(false);

  // ── Document state ──────────────────────────────────────────
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("无标题");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [currentIntent, setCurrentIntent] = useState<Intent>("rewrite");

  // ── Style profile ───────────────────────────────────────────
  const [styleOpen, setStyleOpen] = useState(false);

  // ── Command palette ─────────────────────────────────────────
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // ── Echo Wall state ─────────────────────────────────────────
  const [echoWallAnalysis, setEchoWallAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [echoWallInspiration, setEchoWallInspiration] = useState("");
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [masterQuotes, setMasterQuotes] = useState<MasterQuote[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Zustand store ───────────────────────────────────────────
  const selectedText = useUIStore((s) => s.selectedText);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setStyleProfile = useUIStore((s) => s.setStyleProfile);
  const styleProfile = useUIStore((s) => s.styleProfile);

  // ── Ghost Text ──────────────────────────────────────────────
  const { ghostText } = useGhostText(editorRef.current);

  // ── Editor ready ────────────────────────────────────────────
  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // ── Autosave ────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const lastKeypressTime = useRef(Date.now());

  const saveDocument = useCallback(async (title?: string, content?: Record<string, unknown>) => {
    if (!currentDocId || isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus("saving");
    try {
      const body: Record<string, unknown> = {};
      if (content !== undefined) body.content = content;
      if (title !== undefined) body.title = title;
      const res = await fetch(`/api/documents/${currentDocId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
    finally { isSavingRef.current = false; }
  }, [currentDocId]);

  const triggerAutosave = useCallback((title?: string) => {
    if (!currentDocId || !editorRef.current) return;
    setSaveStatus("unsaved");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const json = editorRef.current?.getJSON() ?? null;
      saveDocument(title, json as Record<string, unknown>);
    }, AUTOSAVE_DELAY_MS);
  }, [currentDocId, saveDocument]);

  // ── Document CRUD ───────────────────────────────────────────
  const handleNewDocument = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const doc: Document = data.document;
      setCurrentDoc(doc); setCurrentDocId(doc.id);
      setDocumentTitle("无标题"); setSaveStatus("saved");
      editorRef.current?.commands.clearContent();
    } catch (e) { console.error(e); }
  }, []);

  const handleOpenDocument = useCallback(async (item: DocumentListItem) => {
    try {
      const res = await fetch(`/api/documents/${item.id}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const doc: Document = data.document;
      setCurrentDoc(doc); setCurrentDocId(doc.id);
      setDocumentTitle(doc.title); setSaveStatus("saved");
      if (editorRef.current && doc.content) editorRef.current.commands.setContent(doc.content);
    } catch (e) { console.error(e); }
  }, []);

  const handleTitleChange = useCallback((t: string) => { setDocumentTitle(t); saveDocument(t); }, [saveDocument]);

  // ── AI Intent handler ───────────────────────────────────────
  const writeAbortRef = useRef<AbortController | null>(null);
  const handleIntent = useCallback(async (intent: Intent, customText?: string) => {
    if (!selectedText) return;
    if (writeAbortRef.current) writeAbortRef.current.abort();
    const controller = new AbortController(); writeAbortRef.current = controller;
    setCurrentIntent(intent); setWritingState("loading"); clearSuggestions();
    try {
      const body: Record<string, unknown> = { text: selectedText, intent, documentId: currentDocId };
      if (intent === "custom" && customText) body.customText = customText;
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader(); if (!reader) throw new Error("No body");
      setWritingState("streaming");
      const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));
            if (event.type === "option" && event.text) {
              addSuggestion({ index: event.index!, text: event.text, styleShift: event.styleShift || "" });
            } else if (event.type === "done") setWritingState("idle");
            else if (event.type === "error") throw new Error(event.error);
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) { clearSuggestions(); setWritingState("idle"); }
    } finally {
      if (writeAbortRef.current === controller) writeAbortRef.current = null;
    }
  }, [selectedText, currentDocId, setWritingState, addSuggestion, clearSuggestions]);

  // ── Ghost feedback ──────────────────────────────────────────
  const handleGhostAccept = useCallback(() => {
    if (!ghostText.text || !ghostText.visible) return;
    fetch("/api/chat/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: currentDocId, suggestionText: ghostText.text, action: "accept", contextPreview: editorRef.current?.getText().slice(-200) || "" }) }).catch(() => {});
  }, [ghostText, currentDocId]);

  const handleGhostReject = useCallback(() => {
    if (!ghostText.text || !ghostText.visible) return;
    fetch("/api/chat/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: currentDocId, suggestionText: ghostText.text, action: "reject", contextPreview: editorRef.current?.getText().slice(-200) || "" }) }).catch(() => {});
  }, [ghostText, currentDocId]);

  // ── EchoWall: 15s poll ──────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      const editor = editorRef.current; if (!editor) return;
      const fullText = editor.getText(); if (!fullText.trim()) return;
      const recentText = fullText.slice(-500);
      setAnalysisLoading(true);
      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: recentText, intent: "explain", documentId: currentDocId }) });
        if (res.ok && res.body) {
          const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = "", text = "";
          while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() || ""; for (const line of lines) { if (!line.startsWith("data: ")) continue; try { const e = JSON.parse(line.slice(6)); if (e.type === "option" && e.text && !text) text = e.text; } catch { /* */ } } }
          if (text) setEchoWallAnalysis(text);
        }
      } catch { /* */ } finally { setAnalysisLoading(false); }
    }, ANALYSIS_POLL_MS);
    return () => clearInterval(interval);
  }, [currentDocId]);

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCommandPaletteOpen(p => !p); }
      if (e.key === "Escape" && commandPaletteOpen) setCommandPaletteOpen(false);
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [commandPaletteOpen]);

  // ── Mode handlers ───────────────────────────────────────────
  const handleSelectDirect = () => setShowModeSelector(false);
  const handleSelectArchitect = () => router.push("/architect");
  const handleSelectImport = () => setShowModeSelector(false);

  // ── Style callback ──────────────────────────────────────────
  const handleStyleSaved = useCallback((p: StyleProfileData) => {
    setStyleProfile({ tone: p.tone, avg_sentence_length: p.avg_sentence_length, common_imagery: p.common_imagery, formality: String(p.formality), keywords: p.keywords });
  }, [setStyleProfile]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  const leftW = leftPanel === "open" ? "var(--sidebar-left)" : leftPanel === "collapsed" ? "var(--sidebar-collapsed)" : "0px";
  const rightW = rightPanel === "open" ? "var(--sidebar-right)" : rightPanel === "collapsed" ? "var(--sidebar-collapsed)" : "0px";
  const showLeft = leftPanel !== "hidden";
  const showRight = rightPanel !== "hidden";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      <TopBar documentTitle={documentTitle} onTitleChange={handleTitleChange} saveStatus={saveStatus} onStyleClick={() => setStyleOpen(true)} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT PANEL */}
        {showLeft && (
          <div style={{ width: leftW, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.3s ease" }}>
            {leftPanel === "open" ? (
              <>
                <div style={{ padding: "12px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>架构地图</span>
                  <button className="btn-icon" onClick={() => setLeftPanel("collapsed")} aria-label="折叠左侧面板">◁</button>
                </div>
                <ArchitecturePanel editorContent="" onNodeClick={() => {}} imageryWords={[]} wordGoal={3000} onWordGoalChange={() => {}} />
                <div style={{ flex: 1, overflow: "auto" }}>
                  <DocumentList onOpenDocument={handleOpenDocument} currentDocId={currentDocId} onToggle={() => setLeftPanel("hidden")} onImport={() => {}} />
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12 }}>
                <button className="btn-icon" onClick={() => setLeftPanel("open")} aria-label="展开左侧面板">▷</button>
              </div>
            )}
          </div>
        )}

        {/* CENTER EDITOR */}
        <main style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto", position: "relative" }}>
          <div style={{ width: "100%", maxWidth: "var(--editor-max)" }}>
            <EditorCanvas onEditorReady={handleEditorReady} onBlankDoubleClick={() => setCommandPaletteOpen(true)} ghostText={ghostText.text} onGhostAccept={handleGhostAccept} onGhostReject={handleGhostReject} />
          </div>
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview editor={editorRef.current} intent={currentIntent} onDone={() => triggerAutosave()} />
        </main>

        {/* RIGHT PANEL */}
        {showRight && (
          <div style={{ width: rightW, flexShrink: 0, background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-light)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.3s ease" }}>
            {rightPanel === "open" ? (
              <>
                <div style={{ padding: "12px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>回声壁</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-icon" onClick={() => setSocraticOpen(true)} aria-label="苏格拉底追问" title="追问">💭</button>
                    <button className="btn-icon" onClick={() => setRightPanel("collapsed")} aria-label="折叠右侧面板">▷</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: "auto" }}>
                  <EchoWall analysisText={echoWallAnalysis} analysisLoading={analysisLoading} inspiration={echoWallInspiration} inspirationLoading={inspirationLoading} masterQuotes={masterQuotes} searchResults={searchResults} searchLoading={searchLoading} onAdopt={(t) => { editorRef.current?.chain().focus().insertContent(" " + t).run(); }} onStyleSetupClick={() => setStyleOpen(true)} onSearch={async () => {}} />
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12 }}>
                <button className="btn-icon" onClick={() => setRightPanel("open")} aria-label="展开右侧面板">◁</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OVERLAYS */}
      <ModeSelector isOpen={showModeSelector} onSelectDirect={handleSelectDirect} onSelectArchitect={handleSelectArchitect} onSelectImport={handleSelectImport} onClose={() => setShowModeSelector(false)} />
      <StyleSetup isOpen={styleOpen} onClose={() => setStyleOpen(false)} onProfileSaved={handleStyleSaved} />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onCommand={(i) => handleIntent(i)} onCustomCommand={(t) => handleIntent("custom", t)} />
      <SocraticPanel isOpen={socraticOpen} onClose={() => setSocraticOpen(false)} context={editorRef.current?.getText().slice(-500) || ""} />
    </div>
  );
}
