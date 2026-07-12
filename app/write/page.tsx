"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import TopBar from "@/components/TopBar";
import EditorCanvas from "@/components/EditorCanvas";
import AIBubble from "@/components/AIBubble";
import SuggestionPreview from "@/components/SuggestionPreview";
import CommandPalette from "@/components/CommandPalette";
import Studio from "@/components/panels/Studio";
import StyleSetup from "@/components/StyleSetup";
import StructureMap from "@/components/panels/StructureMap";
import ParagraphCards from "@/components/panels/ParagraphCards";
import AuthorMemoryModal from "@/components/author/AuthorMemoryModal";
import DraftSnapshots from "@/components/DraftSnapshots";
import { useGhostText } from "@/hooks/useGhostText";
import { useEchoWall } from "@/hooks/useEchoWall";
import { useUIStore } from "@/lib/store";
import type { Intent, SuggestionOption, StreamEvent, SaveStatus, StyleProfileData, MasterQuote, SearchResult } from "@/types/editor";
import type { ArchNode, ArchitectNode } from "@/types/architect";
import { loadArchitecture, saveArchitecture } from "@/lib/local-store";

const WRITE_TIMEOUT_MS = 45000;
const AUTOSAVE_DELAY_MS = 2000;

type PanelState = "open" | "collapsed";

export default function WritePage() {
  const editorRef = useRef<Editor | null>(null);
  const [leftPanel, setLeftPanel] = useState<PanelState>("open");
  const [rightPanel, setRightPanel] = useState<PanelState>("open");
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("无标题");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [currentIntent, setCurrentIntent] = useState<Intent>("rewrite");
  const [styleOpen, setStyleOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [authorMemoryOpen, setAuthorMemoryOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  // Empty editor prompt
  const [emptyPromptValue, setEmptyPromptValue] = useState("");

  // Structure offer after 300 chars
  const [structureOfferDismissed, setStructureOfferDismissed] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const structureOfferTriggerAt = useRef<number | null>(null);

  // v7.0 Studio engine
  const echoWall = useEchoWall({
    editorContent,
    cursorPosition: cursorPos,
  });

  const selectedText = useUIStore((s) => s.selectedText);
  const setWritingState = useUIStore((s) => s.setWritingState);
  const addSuggestion = useUIStore((s) => s.addSuggestion);
  const clearSuggestions = useUIStore((s) => s.clearSuggestions);
  const setStyleProfile = useUIStore((s) => s.setStyleProfile);

  // v7.0: Wire text selection to Studio intent channel
  useEffect(() => {
    echoWall.handleTextSelect(selectedText);
  }, [selectedText]);

  // Load skeleton nodes from local store (architect/discover → write bridge)
  const [skeletonNodes, setSkeletonNodes] = useState<ArchitectNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  useEffect(() => {
    // v8.0: Try discover outline first, then fall back to architect
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
          // Build parent-child relationships for level 2 items
          for (let i = 0; i < nodes.length; i++) {
            if (!discoverData.outline[i]) continue;
            if (discoverData.outline[i].level === 2) {
              // Find nearest level 1 above
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

    // Fallback: old architect format
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

  // v6.1: Ghost Thinking with architecture context
  const activeNode = skeletonNodes.find((n) => n.id === activeNodeId);
  const nodeContext = activeNode ? {
    title: activeNode.label,
    writingTip: (activeNode as any).writingTip || activeNode.notes,
    genre: skeletonNodes.length > 0 ? "议论文" : undefined,
  } : undefined;
  const { candidates: ghostCandidates, activeIndex: ghostActiveIndex, isGhostLoading } = useGhostText(editorRef.current, nodeContext);

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
    // Track content for Studio
    editor.on("update", () => {
      const text = editor.getText();
      setEditorContent(text);
      setCursorPos(editor.state.selection.from);
      // v8.0: Persist last content for Reflection
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

    // ── Node notes update ────────────────────────────────────
  const handleUpdateNodeNotes = useCallback((nodeId: string, notes: string) => {
    const updated = skeletonNodes.map((n) =>
      n.id === nodeId ? { ...n, notes } : n
    );
    setSkeletonNodes(updated);
    // Persist to localStorage
    const archNodes: ArchNode[] = updated.map((n, i) => ({
      id: n.id,
      type: n.type,
      title: n.label,
      summary: n.notes || "",
      children: n.children || [],
      order: i,
      parent: null,
      isExpanded: true,
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
      id: n.id,
      type: n.type,
      title: n.label,
      summary: n.notes || "",
      children: n.children || [],
      order: i,
      parent: null,
      isExpanded: true,
    }));
    saveArchitecture(archNodes);
  }, [skeletonNodes]);

  // v8.1: Focus Mode tooltip on first visit
  const [focusTipVisible, setFocusTipVisible] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("sculptor-focus-tip")) {
      const timer = setTimeout(() => {
        if (editorRef.current && editorContent.length > 0) {
          setFocusTipVisible(true);
          localStorage.setItem("sculptor-focus-tip", "1");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [editorContent]);

  const charCount = editorContent.length;
  const isEmpty = editorContent.trim() === "";
  const hasArchitecture = skeletonNodes.length > 0;

  // Structure offer visibility: show at >=300 chars, hide on dismiss or further typing
  const showStructureOffer = (() => {
    if (charCount < 300) {
      structureOfferTriggerAt.current = null;
      return false;
    }
    if (structureOfferDismissed) return false;
    if (hasArchitecture) return false;
    if (isGeneratingStructure) return false;
    if (structureOfferTriggerAt.current === null) {
      structureOfferTriggerAt.current = charCount;
      return true;
    }
    // Auto-dismiss when user continues typing past the trigger point
    if (charCount > structureOfferTriggerAt.current) return false;
    return true;
  })();

  // Reset dismissal when content drops below 300 (user cleared text)
  useEffect(() => {
    if (charCount < 300) {
      setStructureOfferDismissed(false);
      structureOfferTriggerAt.current = null;
    }
  }, [charCount]);

  // Generate architecture from written content
  const handleGenerateStructure = useCallback(async () => {
    if (!editorRef.current) return;
    setIsGeneratingStructure(true);
    try {
      const text = editorRef.current.getText();
      const res = await fetch("/api/architect/from-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, title: documentTitle }),
      });
      if (!res.ok) throw new Error("Failed to generate structure");
      const data = await res.json();
      if (data.nodes?.length) {
        // Convert API response to ArchNode format and save
        const archNodes: ArchNode[] = data.nodes.map((n: any, i: number) => ({
          id: n.id || `n${i + 1}`,
          type: n.type || "custom",
          title: n.label || n.title || "Untitled",
          summary: n.notes || "",
          parent: null,
          children: n.children || [],
          order: i,
          isExpanded: true,
        }));
        saveArchitecture(archNodes);
        // Update local state for StructureMap display
        setSkeletonNodes(data.nodes.map((n: any) => ({
          id: n.id,
          label: n.label || n.title,
          type: n.type || "custom",
          position: n.position || { x: 0, y: 0 },
          children: n.children || [],
          notes: n.notes,
        })));
      }
    } catch (err) {
      console.error("Failed to generate structure:", err);
    } finally {
      setIsGeneratingStructure(false);
      setStructureOfferDismissed(true);
    }
  }, [documentTitle]);

  const leftW = leftPanel === "open" ? "280px" : "48px";
  const rightW = rightPanel === "open" ? "320px" : "48px";

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
       <TopBar documentTitle={documentTitle} onTitleChange={(t) => { setDocumentTitle(t); saveDocument(t); }} saveStatus={saveStatus} onStyleClick={() => setStyleOpen(true)} />
      {/* v7.0: Author Memory quick access + Drafts */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setAuthorMemoryOpen(true)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-ui)" }}>
            思维偏好
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <DraftSnapshots
            docId={currentDocId || "untitled"}
            title={documentTitle}
            content={editorContent}
            onRestore={(text) => {
              if (editorRef.current) {
                editorRef.current.chain().focus().setContent(text).run();
              }
            }}
          />
          <button
            onClick={() => window.location.href = "/reflect"}
            title="完成写作，回望思维路径"
            style={{
              background: editorContent.length > 100 ? "var(--accent-gold, #c9a95c)" : "var(--bg-tertiary)",
              border: "none",
              color: editorContent.length > 100 ? "#fff" : "var(--text-tertiary)",
              fontSize: 11,
              cursor: editorContent.length > 100 ? "pointer" : "default",
              fontFamily: "var(--font-ui)",
              padding: "4px 12px",
              borderRadius: 6,
              fontWeight: 600,
              transition: "all 0.15s",
              opacity: editorContent.length > 100 ? 1 : 0.5,
            }}
          >
            完成
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* EMPTY STATE: centered prompt when no content and no architecture */}
        {isEmpty && !hasArchitecture ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-primary)",
          }}>
            <div style={{ textAlign: "center", maxWidth: 480, width: "100%", padding: "0 24px" }}>
              <h2 style={{
                fontSize: 28, fontWeight: 700, marginBottom: 8,
                color: "var(--text-primary)", fontFamily: "var(--font-ui)",
                letterSpacing: "0.02em",
              }}>
                今天想写什么？
              </h2>
              <p style={{
                fontSize: 14, color: "var(--text-tertiary)", marginBottom: 24,
                fontFamily: "var(--font-ui)",
              }}>
                输入主题，AI 帮你展开思路
              </p>
              <input
                type="text"
                value={emptyPromptValue}
                onChange={(e) => setEmptyPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && emptyPromptValue.trim()) {
                    if (editorRef.current) {
                      editorRef.current.chain().focus().insertContent(emptyPromptValue).run();
                    }
                    setEmptyPromptValue("");
                  }
                }}
                placeholder="例如：AI 会取代作家吗？"
                autoFocus
                style={{
                  width: "100%", padding: "14px 18px", fontSize: 16,
                  background: "var(--bg-secondary)", color: "var(--text-primary)",
                  border: "2px solid var(--border-light)", borderRadius: 12,
                  outline: "none", fontFamily: "var(--font-ui)",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent-gold)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-light)"; }}
              />
            </div>
          </div>
        ) : (
          <></>
        )}

        {/* LEFT: Structure Map (hidden when empty with no architecture) */}
        {(!isEmpty || hasArchitecture) && (
        <div style={{ width: leftW, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", transition: "width 0.3s", overflow: "hidden" }}>
          {leftPanel === "open" ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>结构地图</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => window.location.href = "/discover"} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 11 }}>编辑大纲</button>
                  <button className="btn-icon" onClick={() => setLeftPanel("collapsed")} aria-label="折叠" style={{ width: 24, height: 24 }}>◁</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
                {skeletonNodes.length === 0 ? (
                  <div style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: 24 }}>
                    <p style={{ marginBottom: 12 }}>无大纲</p>
                    <a href="/discover" className="btn-primary" style={{ display: "inline-block", fontSize: 12, padding: "6px 14px", minHeight: 32, textDecoration: "none", color: "var(--text-inverse)" }}>创建大纲</a>
                    <p style={{ marginTop: 12, fontSize: 11 }}>AI 将基于已写内容自动生成建议大纲</p>
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
              <button className="btn-icon" onClick={() => setLeftPanel("open")} aria-label="展开">▷</button>
            </div>
          )}
        </div>
        )}

        {/* CENTER: Editor (always mounted so refs work, hidden when empty prompt showing) */}
        <main style={{ flex: 1, display: isEmpty && !hasArchitecture ? "none" : "flex", justifyContent: "center", overflow: "auto", position: "relative" }}>
          <div style={{ width: "100%", maxWidth: "680px" }}>
            <EditorCanvas onEditorReady={handleEditorReady} onBlankDoubleClick={() => setCommandPaletteOpen(true)} ghostCandidates={ghostCandidates} ghostActiveIndex={ghostActiveIndex} isGhostLoading={isGhostLoading} />
          </div>
          <AIBubble onIntent={handleIntent} />
          <SuggestionPreview editor={editorRef.current} intent={currentIntent} onDone={() => triggerAutosave()} />

          {/* Structure offer floating prompt */}
          {showStructureOffer && (
            <div style={{
              position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
              zIndex: 100, maxWidth: 500, width: "calc(100% - 48px)",
              background: "var(--bg-primary)", border: "1.5px solid var(--accent-gold, #c9a95c)",
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              animation: "fadeInUp 0.3s ease",
            }}>
              <span style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-ui)", fontWeight: 500 }}>
                ✨ 是否整理为结构？
              </span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={handleGenerateStructure}
                  disabled={isGeneratingStructure}
                  style={{
                    padding: "6px 14px", fontSize: 13, fontWeight: 600,
                    background: "var(--accent-gold, #c9a95c)", color: "#fff",
                    border: "none", borderRadius: 8, cursor: "pointer",
                    fontFamily: "var(--font-ui)", whiteSpace: "nowrap",
                    opacity: isGeneratingStructure ? 0.6 : 1,
                  }}
                >
                  {isGeneratingStructure ? "生成中…" : "整理为结构"}
                </button>
                <button
                  onClick={() => { setStructureOfferDismissed(true); }}
                  style={{
                    padding: "6px 10px", fontSize: 13,
                    background: "transparent", color: "var(--text-tertiary)",
                    border: "none", cursor: "pointer", fontFamily: "var(--font-ui)",
                  }}
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          {/* Focus Mode first-visit tooltip */}
          {focusTipVisible && (
            <div style={{
              position: "fixed", top: 60, right: 24,
              zIndex: 100,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-light)",
              borderRadius: 8,
              padding: "8px 14px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              animation: "fadeInUp 0.25s ease",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <kbd style={{
                fontSize: 12, fontWeight: 600,
                color: "var(--text-inverse)",
                background: "var(--text-primary)",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: "var(--font-mono)",
              }}>F</kbd>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "var(--font-ui)" }}>
                进入专注模式
              </span>
              <button
                onClick={() => setFocusTipVisible(false)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text-tertiary)", cursor: "pointer",
                  fontSize: 14, padding: 0, lineHeight: 1,
                }}
              >✕</button>
            </div>
          )}

        </main>

        {/* RIGHT: Studio (hidden when empty with no architecture) */}
        {(!isEmpty || hasArchitecture) && (
        <div style={{ width: rightW, flexShrink: 0, background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-light)", display: "flex", flexDirection: "column", transition: "width 0.3s", overflow: "hidden" }}>
          {rightPanel === "open" ? (
            <>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Studio</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-icon" onClick={() => setRightPanel("collapsed")} aria-label="折叠" style={{ width: 24, height: 24 }}>▷</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <Studio
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
        )}
      </div>

      <StyleSetup isOpen={styleOpen} onClose={() => setStyleOpen(false)} onProfileSaved={handleStyleSaved} />
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onExecute={(intent, param) => { if (intent === "custom") { handleIntent("custom" as any, param); } else { handleIntent(intent as any); } }} />
      {/* v7.0: Author Memory modal */}
      {authorMemoryOpen && <AuthorMemoryModal onClose={() => setAuthorMemoryOpen(false)} />}
    </div>
  );
}
