"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import TopBar from "@/components/TopBar";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import CommandPalette from "@/components/CommandPalette";
import EchoWall from "@/components/panels/EchoWall";
import StyleSetup from "@/components/StyleSetup";
import SocraticPanel from "@/components/panels/SocraticPanel";
import StructureMap from "@/components/panels/StructureMap";
import { useGhostText } from "@/hooks/useGhostText";
import { useEchoWall } from "@/hooks/useEchoWall";
import { useUIStore } from "@/lib/store";
import type { Intent, SuggestionOption, StreamEvent, SaveStatus, StyleProfileData, MasterQuote, SearchResult } from "@/types/editor";
import type { ArchitectNode } from "@/types/architect";
import { loadArchitecture } from "@/lib/local-store";

const WRITE_TIMEOUT_MS = 45000;
const AUTOSAVE_DELAY_MS = 2000;

type PanelState = "open" | "collapsed";

export default function WritePage() {
  const editorRef = useRef<Editor | null>(null);
  const [leftPanel, setLeftPanel] = useState<PanelState>("open");
  const [rightPanel, setRightPanel] = useState<PanelState>("open");
  const [socraticOpen, setSocraticOpen] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("无标题");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [currentIntent, setCurrentIntent] = useState<Intent>("rewrite");
  const [styleOpen, setStyleOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  // v6.0 EchoWall engine
  const echoWall = useEchoWall({
    editorContent,
    cursorPosition: cursorPos,
  });

  const selectedText = useUIStore((s) => s.selectedText);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setStyleProfile = useUIStore((s) => s.setStyleProfile);

  // v6.0: Wire text selection to EchoWall intent channel
  useEffect(() => {
    echoWall.handleTextSelect(selectedText);
  }, [selectedText]);

  // Load skeleton nodes from local store (architect → write bridge)
  const [skeletonNodes, setSkeletonNodes] = useState<ArchitectNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadArchitecture();
    if (saved?.nodes?.length) {
      // Convert ArchNode → ArchitectNode for StructureMap compat
      setSkeletonNodes(saved.nodes.map((n) => ({
        id: n.id, label: n.title, type: n.type,
        position: { x: 0, y: 0 }, children: n.children,
        notes: n.summary, targetWords: n.targetWords,
        priority: n.priority,
      })));
    }
  }, []);

  // v6.1: Ghost text with architecture context
  const activeNode = skeletonNodes.find((n) => n.id === activeNodeId);
  const nodeContext = activeNode ? {
    title: activeNode.label,
    writingTip: (activeNode as any).writingTip || activeNode.notes,
    genre: skeletonNodes.length > 0 ? "议论文" : undefined,
  } : undefined;
  const { candidates: ghostCandidates, activeIndex: ghostActiveIndex, isGhostLoading } = useGhostText(editorRef.current, nodeContext);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    // Track content for EchoWall
    editor.on("update", () => {
      setEditorContent(editor.getText());
      setCursorPos(editor.state.selection.from);
    });
    editor.on("selectionUpdate", () => {
      setCursorPos(editor.state.selection.from);
    });
  }, []);

  // ── Autosave ────────────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDocument = useCallback(async (title?: string, content?: Record<string, unknown>) => {
    if (!currentDocId) return;
    setSaveStatus("saving");
    try {
      await fetch(`/api/documents/${currentDocId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content }) });
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
  }, [currentDocId]);

  const triggerAutosave = useCallback((title?: string) => {
    if (!currentDocId || !editorRef.current) return;
    setSaveStatus("unsaved");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => saveDocument(title, editorRef.current?.getJSON() as Record<string, unknown>), AUTOSAVE_DELAY_MS);
  }, [currentDocId, saveDocument]);

  // ── AI Intent ───────────────────────────────────────────────
  const writeAbortRef = useRef<AbortController | null>(null);
  const handleIntent = useCallback(async (intent: Intent, customText?: string) => {
    if (!selectedText) return;
    if (writeAbortRef.current) writeAbortRef.current.abort();
    const ctrl = new AbortController(); writeAbortRef.current = ctrl;
    setCurrentIntent(intent); setWritingState("loading"); clearSuggestions();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: selectedText, intent, documentId: currentDocId, customText }), signal: ctrl.signal });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader(); if (!reader) throw new Error("No body");
      setWritingState("streaming");
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        for (const line of buf.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try { const e: StreamEvent = JSON.parse(line.slice(6)); if (e.type === "option" && e.text) addSuggestion({ index: e.index!, text: e.text, styleShift: e.styleShift || "" }); else if (e.type === "done") setWritingState("idle"); } catch { /* */ }
        }
        buf = "";
      }
    } catch { clearSuggestions(); setWritingState("idle"); }
  }, [selectedText, currentDocId, setWritingState, addSuggestion, clearSuggestions]);

  // ── Keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCommandPaletteOpen(p => !p); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  const handleStyleSaved = useCallback((p: StyleProfileData) => {
    setStyleProfile({ tone: p.tone, avg_sentence_length: p.avg_sentence_length, common_imagery: p.common_imagery, formality: String(p.formality), keywords: p.keywords });
  }, [setStyleProfile]);

  const leftW = leftPanel === "open" ? "280px" : "48px";
  const rightW = rightPanel === "open" ? "320px" : "48px";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      <TopBar documentTitle={documentTitle} onTitleChange={(t) => { setDocumentTitle(t); saveDocument(t); }} saveStatus={saveStatus} onStyleClick={() => setStyleOpen(true)} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: Structure Map */}
        <div style={{ width: leftW, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", transition: "width 0.3s", overflow: "hidden" }}>
          {leftPanel === "open" ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>结构地图</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => window.location.href = "/architect"} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 11 }}>编辑架构</button>
                  <button className="btn-icon" onClick={() => setLeftPanel("collapsed")} aria-label="折叠" style={{ width: 24, height: 24 }}>◁</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
                {skeletonNodes.length === 0 ? (
                  <div style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: 24 }}>
                    <p style={{ marginBottom: 12 }}>无架构</p>
                    <a href="/architect" className="btn-primary" style={{ display: "inline-block", fontSize: 12, padding: "6px 14px", minHeight: 32, textDecoration: "none", color: "var(--text-inverse)" }}>创建架构</a>
                    <p style={{ marginTop: 12, fontSize: 11 }}>AI 将基于已写内容自动生成建议架构</p>
                  </div>
                ) : (
                  <StructureMap
                    nodes={skeletonNodes}
                    activeNodeId={activeNodeId}
                    onSelectNode={setActiveNodeId}
                    onAIExpand={(nodeId, label) => {
                      // Redirect to architect page with pre-filled expand command
                      window.location.href = `/architect?action=expand&node=${encodeURIComponent(label)}`;
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <button className="btn-icon" onClick={() => setLeftPanel("open")} aria-label="展开">▷</button>
            </div>
          )}
        </div>

        {/* CENTER: Editor */}
        <main style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto", position: "relative" }}>
          <div style={{ width: "100%", maxWidth: "680px" }}>
            <EditorCanvas onEditorReady={handleEditorReady} onBlankDoubleClick={() => setCommandPaletteOpen(true)} ghostCandidates={ghostCandidates} ghostActiveIndex={ghostActiveIndex} isGhostLoading={isGhostLoading} />
          </div>
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview editor={editorRef.current} intent={currentIntent} onDone={() => triggerAutosave()} />
        </main>

        {/* RIGHT: EchoWall */}
        <div style={{ width: rightW, flexShrink: 0, background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-light)", display: "flex", flexDirection: "column", transition: "width 0.3s", overflow: "hidden" }}>
          {rightPanel === "open" ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>回声壁</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-icon" onClick={() => setSocraticOpen(true)} aria-label="追问" style={{ width: 24, height: 24 }}>💭</button>
                  <button className="btn-icon" onClick={() => setRightPanel("collapsed")} aria-label="折叠" style={{ width: 24, height: 24 }}>▷</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <EchoWall
                  state={echoWall.state}
                  onDismissInspiration={echoWall.dismissInspiration}
                  onAcceptInspiration={(id) => {
                    const text = echoWall.acceptInspiration(id);
                    if (text && editorRef.current) {
                      editorRef.current.chain().focus().insertContent(text).run();
                    }
                  }}
                  onFeedback={(type, id, helpful) => {
                    fetch("/api/echo/feedback", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type, id, helpful, context: editorRef.current?.getText().slice(-200) || "" }),
                    }).catch(() => {});
                  }}
                  nodeCount={skeletonNodes.length}
                  wordCount={editorRef.current?.getText().length || 0}
                />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <button className="btn-icon" onClick={() => setRightPanel("open")} aria-label="展开">◁</button>
            </div>
          )}
        </div>
      </div>

      <StyleSetup isOpen={styleOpen} onClose={() => setStyleOpen(false)} onProfileSaved={handleStyleSaved} />
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onExecute={(intent, param) => { if (intent === "custom") { handleIntent("custom" as any, param); } else { handleIntent(intent as any); } }} />
      <SocraticPanel isOpen={socraticOpen} onClose={() => setSocraticOpen(false)} context={editorRef.current?.getText().slice(-500) || ""} />
    </div>
  );
}
