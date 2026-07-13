"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import CommandPalette from "@/components/CommandPalette";
import ParagraphCards from "@/components/panels/ParagraphCards";
import StyleSetup from "@/components/StyleSetup";
import { useGhostText } from "@/hooks/useGhostText";
import { useUIStore } from "@/lib/store";
import type { Intent, StreamEvent, SaveStatus, StyleProfileData } from "@/types/editor";
import type { ArchNode, ArchitectNode } from "@/types/architect";
import { loadArchitecture, saveArchitecture } from "@/lib/local-store";

const AUTOSAVE_DELAY_MS = 2000;

type PanelState = "open" | "collapsed";

export default function WritePage() {
  const editorRef = useRef<Editor | null>(null);
  const [leftPanel, setLeftPanel] = useState<PanelState>("open");
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("无标题");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [currentIntent, setCurrentIntent] = useState<Intent>("rewrite");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  // Ghost Thinking: off by default, toggled via CommandPalette (⌘K)
  const [ghostEnabled, setGhostEnabled] = useState(false);

  // Style setup modal
  const [styleOpen, setStyleOpen] = useState(false);

  // AI selected text from store
  const selectedText = useUIStore((s) => s.selectedText);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setStyleProfile = useUIStore((s) => s.setStyleProfile);

  // Load skeleton nodes from local store (architect/discover → write bridge)
  const [skeletonNodes, setSkeletonNodes] = useState<ArchitectNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const discoverRaw = localStorage.getItem("sculptor-discover-outline");
    if (discoverRaw) {
      try {
        const discoverData = JSON.parse(discoverRaw);
        if (discoverData.outline?.length) {
          const nodes: ArchitectNode[] = discoverData.outline.map(
            (item: any, i: number) => ({
              id: `dn${i + 1}`,
              label: item.title,
              type: item.level === 1 ? "section" : "subsection",
              position: { x: 0, y: 0 },
              children: item.level === 1 ? [] : undefined,
              notes: item.notes || "",
            })
          );
          for (let i = 0; i < nodes.length; i++) {
            if (!discoverData.outline[i]) continue;
            if (discoverData.outline[i].level === 2) {
              for (let j = i - 1; j >= 0; j--) {
                if (discoverData.outline[j].level === 1) {
                  nodes[j].children = nodes[j].children || [];
                  nodes[j].children.push(nodes[i].id);
                  break;
                }
              }
            }
          }
          setSkeletonNodes(nodes);
          return;
        }
      } catch { /* fall through */ }
    }

    const saved = loadArchitecture();
    if (saved?.nodes?.length) {
      setSkeletonNodes(saved.nodes.map((n) => ({
        id: n.id, label: n.title, type: n.type,
        position: { x: 0, y: 0 }, children: n.children,
        notes: n.summary, targetWords: n.targetWords,
        priority: n.priority,
      })));
    }
  }, []);

  // Ghost Thinking context from active node — only shown when ghostEnabled
  const activeNode = skeletonNodes.find((n) => n.id === activeNodeId);
  const nodeContext = activeNode ? {
    title: activeNode.label,
    writingTip: (activeNode as any).writingTip || activeNode.notes,
    genre: skeletonNodes.length > 0 ? "议论文" : undefined,
  } : undefined;
  const { candidates: ghostCandidates, activeIndex: ghostActiveIndex, isGhostLoading } = useGhostText(editorRef.current, nodeContext);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    editor.on("update", () => {
      const text = editor.getText();
      setEditorContent(text);
      setCursorPos(editor.state.selection.from);
      localStorage.setItem("sculptor-last-content", text);
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
      await fetch(`/api/documents/${currentDocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      setSaveStatus("saved");
    } catch { setSaveStatus("unsaved"); }
  }, [currentDocId]);

  const triggerAutosave = useCallback((title?: string) => {
    if (!currentDocId || !editorRef.current) return;
    setSaveStatus("unsaved");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(
      () => saveDocument(title, editorRef.current?.getJSON() as Record<string, unknown>),
      AUTOSAVE_DELAY_MS
    );
  }, [currentDocId, saveDocument]);

  // ── 完成 → save then redirect ─────────────────────────────
  const handleFinish = useCallback(async () => {
    if (currentDocId && editorRef.current) {
      try {
        await fetch(`/api/documents/${currentDocId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: documentTitle,
            content: editorRef.current.getJSON(),
          }),
        });
      } catch { /* best effort */ }
    }
    window.location.href = "/reflect";
  }, [currentDocId, documentTitle]);

  // ── AI Intent ───────────────────────────────────────────────
  const writeAbortRef = useRef<AbortController | null>(null);
  const handleIntent = useCallback(async (intent: Intent, customText?: string) => {
    if (!selectedText) return;
    if (writeAbortRef.current) writeAbortRef.current.abort();
    const ctrl = new AbortController(); writeAbortRef.current = ctrl;
    setCurrentIntent(intent); setWritingState("loading"); clearSuggestions();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText, intent, documentId: currentDocId, customText }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader(); if (!reader) throw new Error("No body");
      setWritingState("streaming");
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        for (const line of buf.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const e: StreamEvent = JSON.parse(line.slice(6));
            if (e.type === "option" && e.text) addSuggestion({ index: e.index!, text: e.text, styleShift: e.styleShift || "" });
            else if (e.type === "done") setWritingState("idle");
          } catch { /* */ }
        }
        buf = "";
      }
    } catch { clearSuggestions(); setWritingState("idle"); }
  }, [selectedText, currentDocId, setWritingState, addSuggestion, clearSuggestions]);

  // ── Keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(p => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleStyleSaved = useCallback((p: StyleProfileData) => {
    setStyleProfile({
      tone: p.tone,
      avg_sentence_length: p.avg_sentence_length,
      common_imagery: p.common_imagery,
      formality: String(p.formality),
      keywords: p.keywords,
    });
  }, [setStyleProfile]);

  // ── Node notes update ────────────────────────────────────
  const handleUpdateNodeNotes = useCallback((nodeId: string, notes: string) => {
    const updated = skeletonNodes.map((n) =>
      n.id === nodeId ? { ...n, notes } : n
    );
    setSkeletonNodes(updated);
    const archNodes: ArchNode[] = updated.map((n, i) => ({
      id: n.id, type: n.type, title: n.label, summary: n.notes || "",
      children: n.children || [], order: i, parent: null, isExpanded: true,
    }));
    saveArchitecture(archNodes);
  }, [skeletonNodes]);

  // ── Node label update ────────────────────────────────────
  const handleUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    const updated = skeletonNodes.map((n) =>
      n.id === nodeId ? { ...n, label } : n
    );
    setSkeletonNodes(updated);
    const archNodes: ArchNode[] = updated.map((n, i) => ({
      id: n.id, type: n.type, title: n.label, summary: n.notes || "",
      children: n.children || [], order: i, parent: null, isExpanded: true,
    }));
    saveArchitecture(archNodes);
  }, [skeletonNodes]);

  const isEmpty = editorContent.trim() === "";
  const hasArchitecture = skeletonNodes.length > 0;
  const leftW = leftPanel === "open" ? "260px" : "40px";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      {/* ── Top bar: outline toggle + TopBar + 完成 ────────── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "0 16px", height: 48,
        borderBottom: "1px solid var(--border-light)",
        background: "var(--bg-secondary)",
        flexShrink: 0,
      }}>
        {/* Outline toggle */}
        <button
          onClick={() => setLeftPanel(p => p === "open" ? "collapsed" : "open")}
          title={leftPanel === "open" ? "折叠大纲" : "展开大纲"}
          style={{
            background: "none", border: "none",
            color: "var(--text-tertiary)", cursor: "pointer",
            fontSize: 14, padding: "4px 6px", lineHeight: 1,
            flexShrink: 0, marginRight: 8,
          }}
        >
          {leftPanel === "open" ? "◁" : "▷"}
        </button>

        {/* Title */}
        <span
          style={{
            flex: 1, fontWeight: 600, fontSize: 14,
            color: "var(--text-primary)", fontFamily: "var(--font-ui)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            marginRight: 16,
          }}
        >
          {documentTitle}
        </span>

        {/* Save status */}
        <span style={{ fontSize: 11, color: saveStatus === "saved" ? "var(--text-tertiary)" : "var(--text-secondary)", marginRight: 12 }}>
          {saveStatus === "saving" ? "保存中..." : saveStatus === "unsaved" ? "未保存" : "已保存"}
        </span>

        {/* 完成 → */}
        <button
          onClick={handleFinish}
          disabled={editorContent.length < 20}
          style={{
            padding: "6px 14px", fontSize: 13, fontWeight: 500,
            background: editorContent.length >= 20 ? "var(--color-brand-500)" : "var(--bg-tertiary)",
            color: editorContent.length >= 20 ? "var(--text-on-brand)" : "var(--text-tertiary)",
            border: "none", borderRadius: 6, cursor: editorContent.length >= 20 ? "pointer" : "default",
            fontFamily: "var(--font-ui)", whiteSpace: "nowrap",
            opacity: editorContent.length >= 20 ? 1 : 0.5,
          }}
        >
          完成
        </button>
      </div>

      {/* ── Main area ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* LEFT: Outline panel */}
        <div style={{
          width: leftW, flexShrink: 0,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-light)",
          display: "flex", flexDirection: "column",
          transition: "width 0.25s", overflow: "hidden",
        }}>
          {leftPanel === "open" ? (
            <>
              {/* Header */}
              <div style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-light)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-ui)" }}>
                  大纲
                </span>
                <button
                  onClick={() => setLeftPanel("collapsed")}
                  aria-label="折叠"
                  style={{
                    background: "none", border: "none",
                    color: "var(--text-tertiary)", cursor: "pointer",
                    fontSize: 13, padding: 0, lineHeight: 1,
                  }}
                >
                  ◁
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
                {skeletonNodes.length === 0 ? (
                  <div style={{
                    color: "var(--text-tertiary)", fontSize: 12,
                    textAlign: "center", padding: "40px 16px",
                    fontFamily: "var(--font-ui)",
                  }}>
                    <p style={{ marginBottom: 8 }}>还没有大纲</p>
                    <a
                      href="/discover"
                      style={{
                        display: "inline-block", fontSize: 12,
                        padding: "6px 14px",
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                        borderRadius: 6,
                        textDecoration: "none",
                        fontFamily: "var(--font-ui)",
                      }}
                    >
                      回到思考阶段 →
                    </a>
                  </div>
                ) : (
                  <ParagraphCards
                    nodes={skeletonNodes}
                    activeNodeId={activeNodeId}
                    editorContent={editorContent}
                    onSelectNode={setActiveNodeId}
                    onAIExpandNode={(nodeId, label) => {
                      window.location.href = `/discover?action=expand&node=${encodeURIComponent(label)}`;
                    }}
                    onUpdateNodeNotes={handleUpdateNodeNotes}
                    onUpdateNodeLabel={handleUpdateNodeLabel}
                  />
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <button
                onClick={() => setLeftPanel("open")}
                aria-label="展开大纲"
                style={{
                  background: "none", border: "none",
                  color: "var(--text-tertiary)", cursor: "pointer",
                  fontSize: 14, padding: 0, lineHeight: 1,
                }}
              >
                ▷
              </button>
            </div>
          )}
        </div>

        {/* CENTER: Editor */}
        <main style={{
          flex: 1, display: "flex", justifyContent: "center",
          overflow: "auto", position: "relative",
        }}>
          <div style={{ width: "100%", maxWidth: "680px" }}>
            <EditorCanvas
              onEditorReady={handleEditorReady}
              onBlankDoubleClick={() => setCommandPaletteOpen(true)}
              ghostCandidates={ghostEnabled ? ghostCandidates : []}
              ghostActiveIndex={ghostEnabled ? ghostActiveIndex : 0}
              isGhostLoading={ghostEnabled ? isGhostLoading : undefined}
            />
          </div>
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview
            editor={editorRef.current}
            intent={currentIntent}
            onDone={() => triggerAutosave()}
          />
        </main>

        {/* RIGHT: Mentor — collapsed by default */}
        <div style={{
          width: 40, flexShrink: 0,
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-light)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          transition: "width 0.25s", overflow: "hidden",
        }}>
          <span style={{
            writingMode: "vertical-rl",
            fontSize: 11, color: "var(--text-tertiary)",
            fontFamily: "var(--font-ui)",
            letterSpacing: "0.05em",
            userSelect: "none",
            padding: "16px 0",
          }}>
            AI 已退出
          </span>
        </div>
      </div>

      {/* ── Subtle action bar: 写作规则 ───────────────────── */}
      <div style={{
        display: "flex", justifyContent: "flex-end",
        padding: "2px 16px", borderTop: "1px solid var(--border-light)",
        background: "var(--bg-primary)",
      }}>
        <button
          onClick={() => setStyleOpen(true)}
          style={{
            background: "none", border: "none",
            color: "var(--text-tertiary)",
            fontSize: 11, cursor: "pointer",
            fontFamily: "var(--font-ui)",
            padding: "4px 0",
            opacity: 0.6,
          }}
        >
          写作规则
        </button>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      <StyleSetup
        isOpen={styleOpen}
        onClose={() => setStyleOpen(false)}
        onProfileSaved={handleStyleSaved}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onExecute={(intent, param) => {
          if (intent === "custom") {
            handleIntent("custom" as any, param);
          } else if (intent === "ghost-toggle") {
            setGhostEnabled(p => !p);
          } else {
            handleIntent(intent as any);
          }
        }}
      />
    </div>
  );
}
