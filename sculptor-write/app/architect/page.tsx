"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useArchitectStore } from "@/store/architect-store";
import ArchitectToolbar from "@/components/architect/ArchitectToolbar";
import GenreConfirmCard from "@/components/architect/GenreConfirmCard";
import { autoLayout, canAddChild } from "@/lib/ai/architect-layout";
import type { AlignMessage, ArchitectNode, ArchitectEdge, EdgeRelation, BubbleType, ReviewIssue } from "@/types/architect";
import { BUBBLE_COLORS, EDGE_LABELS, BUBBLE_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types/architect";

let nodeCounter = 30;

interface LayoutData { manual: boolean; positions: Record<string, { x: number; y: number }>; }

export default function ArchitectPage() {
  const router = useRouter();
  const nodes = useArchitectStore((s) => s.nodes);
  const edges = useArchitectStore((s) => s.edges);
  const addNode = useArchitectStore((s) => s.addNode);
  const updateNode = useArchitectStore((s) => s.updateNode);
  const removeNode = useArchitectStore((s) => s.removeNode);
  const addEdge = useArchitectStore((s) => s.addEdge);
  const removeEdge = useArchitectStore((s) => s.removeEdge);
  const selectNode = useArchitectStore((s) => s.selectNode);
  const selectedNodeId = useArchitectStore((s) => s.selectedNodeId);
  const setNodes = useArchitectStore((s) => s.setNodes);
  const setEdges = useArchitectStore((s) => s.setEdges);
  const selectedEdgeId = useArchitectStore((s) => s.selectedEdgeId);
  const selectEdge = useArchitectStore((s) => s.selectEdge);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef({ x: 0, y: 0 });
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMessages, setAiMessages] = useState<AlignMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ nodes: ArchitectNode[]; edges: ArchitectEdge[] } | null>(null);
  const [reviewResult, setReviewResult] = useState<{ issues: ReviewIssue[]; score: number } | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [edgeRelationPicker, setEdgeRelationPicker] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [layoutData, setLayoutData] = useState<LayoutData>({ manual: false, positions: {} });

  // New: input overlay + genre confirm
  const [initialInput, setInitialInput] = useState("");
  const [genreConfirm, setGenreConfirm] = useState<{ genres: { name: string; description: string; icon: string }[] } | null>(null);
  const [genreLoading, setGenreLoading] = useState(false);

  // ── Initial input: submit to detect genre ────────────────────
  const handleInitialSubmit = async () => {
    const text = initialInput.trim();
    if (!text) return;
    setGenreLoading(true);
    // Check if user already specified a genre explicitly
    const explicitGenres = ["议论文", "记叙文", "散文", "说明文", "报告", "游记", "书评", "影评", "新闻稿", "小说", "诗歌"];
    const hasExplicit = explicitGenres.some(g => text.includes(g));

    if (hasExplicit) {
      // Direct generate
      const matched = explicitGenres.find(g => text.includes(g)) || "散文";
      await generateArch(matched, text);
      setGenreLoading(false);
      return;
    }

    // Ask AI to confirm genre
    try {
      const res = await fetch("/api/architect/confirm-genre", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userInput: text }) });
      if (res.ok) {
        const d = await res.json();
        setGenreConfirm(d);
      }
    } catch { /* */ }
    setGenreLoading(false);
  };

  const handleGenreSelect = async (genre: string) => {
    setGenreConfirm(null);
    await generateArch(genre, initialInput);
  };

  // ── Generate architecture ────────────────────────────────────
  const generateArch = async (type: string, summary: string) => {
    try {
      const res = await fetch("/api/architect/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateType: type, userInput: summary, conversationSummary: summary }) });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes?.length > 0) {
          const laidOut = autoLayout(data.nodes);
          setNodes(laidOut);
          setEdges(data.edges || []);
          return;
        }
      }
      // Fallback template
      const map: Record<string, string> = { "议论文": "argumentative", "记叙文": "narrative", "说明文": "expository", "散文": "essay", "报告": "report", "游记": "narrative", "书评": "essay", "影评": "essay", "新闻稿": "report" };
      const tpl = await fetch(`/templates/${map[type] || "essay"}.json`);
      if (tpl.ok) {
        const d = await tpl.json();
        setNodes(d.defaultNodes); setEdges(d.defaultEdges);
      }
    } catch { /* */ }
  };

  // ── Canvas handlers ─────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest("svg")) {
      setIsPanning(true); panRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      selectNode(null); selectEdge(null); setContextMenu(null);
    }
  }, [offset, selectNode, selectEdge]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) setOffset({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
  }, [isPanning]);

  const handleMouseUp = () => { setIsPanning(false); };
  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setScale(s => Math.max(0.3, Math.min(2, s - e.deltaY * 0.001))); }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".arch-bubble")) return;
    const x = (e.clientX - 280) / scale - offset.x / scale;
    const y = (e.clientY - 80) / scale - offset.y / scale;
    addNode({ id: `n${++nodeCounter}`, label: "新节点", type: "argument", position: { x, y }, children: [] });
  }, [scale, offset, addNode]);

  // ── Node operations ─────────────────────────────────────────
  const handleAddNode = (type: string) => {
    addNode({ id: `n${++nodeCounter}`, label: BUBBLE_LABELS[type as BubbleType] || type, type: type as BubbleType, position: { x: 400 + Math.random() * 200, y: 200 + Math.random() * 300 }, children: [] });
  };

  const handleAddChild = (parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const { allowed, reason } = canAddChild(parent, nodes);
    if (!allowed) { alert(reason); return; }
    const childId = `n${++nodeCounter}`;
    const px = parent.position.x + 160;
    const py = parent.position.y + 100 + (parent.children?.length || 0) * 60;
    addNode({ id: childId, label: "子节点", type: "evidence", position: { x: px, y: py }, children: [] });
    updateNode(parentId, { children: [...(parent.children || []), childId] });
    // Mark layout as manual since user added a child
    setLayoutData(prev => ({ ...prev, manual: true, positions: { ...prev.positions, [childId]: { x: px, y: py } } }));
  };

  const handleDelete = () => {
    if (selectedNodeId) removeNode(selectedNodeId);
    if (selectedEdgeId) removeEdge(selectedEdgeId);
    selectNode(null); selectEdge(null);
  };

  const handleBubbleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connectMode && connectFrom) {
      if (connectFrom !== id) { const eid = `e${Date.now()}`; addEdge({ id: eid, from: connectFrom, to: id, relation: "supports" }); setEdgeRelationPicker({ x: e.clientX, y: e.clientY, edgeId: eid }); }
      setConnectFrom(null); return;
    }
    if (connectMode) { setConnectFrom(id); return; }
    selectNode(id); selectEdge(null);
  };

  const handleBubbleDoubleClick = (e: React.MouseEvent, node: ArchitectNode) => {
    e.stopPropagation(); setEditingNode(node.id); setEditLabel(node.label); setEditNotes(node.notes || "");
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, nodeId }); selectNode(nodeId); };
  const saveEdit = () => { if (editingNode && editLabel.trim()) { updateNode(editingNode, { label: editLabel.trim(), notes: editNotes.trim() || undefined }); } setEditingNode(null); };

  // ── Node drag ────────────────────────────────────────────────
  const handleNodeDragEnd = (nodeId: string, pos: { x: number; y: number }) => {
    updateNode(nodeId, { position: pos });
    setLayoutData(prev => ({ manual: true, positions: { ...prev.positions, [nodeId]: pos } }));
  };

  const handleRelationPick = (edgeId: string, relation: EdgeRelation) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) { removeEdge(edgeId); addEdge({ ...edge, relation }); }
    setEdgeRelationPicker(null); selectEdge(null);
  };

  // ── AI Panel ────────────────────────────────────────────────
  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msgs = [...aiMessages, { role: "user" as const, content: aiInput }];
    setAiMessages(msgs); setAiInput(""); setAiLoading(true);
    try {
      const res = await fetch("/api/architect/align", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userInput: aiInput, conversationHistory: msgs.map(m => ({ role: m.role, content: m.content })) }) });
      if (res.ok) {
        const d = await res.json();
        setAiMessages([...msgs, { role: "ai", content: d.content || "好的" }]);
        if (msgs.length >= 1) {
          const genRes = await fetch("/api/architect/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateType: "essay", userInput: aiInput, conversationSummary: msgs.map(m => m.content).join(" | ") }) });
          if (genRes.ok) { const gd = await genRes.json(); if (gd.nodes) { const laidOut = autoLayout(gd.nodes, layoutData); setAiPreview({ nodes: laidOut, edges: gd.edges || [] }); } }
        }
      }
    } catch { /* */ } finally { setAiLoading(false); }
  };

  const acceptAIPreview = () => {
    if (aiPreview) { setNodes(aiPreview.nodes); setEdges(aiPreview.edges); setAiPreview(null); }
  };

  // ── Review ──────────────────────────────────────────────────
  const handleReview = async () => {
    if (nodes.length === 0) return;
    try {
      const res = await fetch("/api/architect/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes, edges }) });
      if (res.ok) { const d = await res.json(); setReviewResult({ issues: d.issues || [], score: d.overallScore || 0 }); }
    } catch { /* */ }
  };

  // ── Templates ───────────────────────────────────────────────
  const loadTemplate = async (type: string) => {
    try {
      const res = await fetch(`/templates/${type}.json`);
      if (res.ok) { const d = await res.json(); setNodes(d.defaultNodes); setEdges(d.defaultEdges); }
    } catch { /* */ } finally { setShowTemplateModal(false); }
  };

  const handleStartWriting = () => router.push("/write");
  const handleSkip = () => router.push("/write");

  // ── Keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Delete" && (selectedNodeId || selectedEdgeId)) handleDelete();
      if (e.key === "Escape") { setEditingNode(null); setContextMenu(null); setConnectMode(false); setConnectFrom(null); setGenreConfirm(null); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [selectedNodeId, selectedEdgeId]);

  // ── Quick templates for initial input ───────────────────────
  const quickTemplates = [
    { label: "议论文", icon: "📝" }, { label: "记叙文", icon: "📖" }, { label: "散文", icon: "🌸" },
    { label: "说明文", icon: "📋" }, { label: "报告", icon: "📊" }, { label: "游记", icon: "✈️" },
  ];

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-ui)", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>Sculptor Architect</span>
        <button className="btn-primary" onClick={handleStartWriting} disabled={nodes.length === 0} style={{ fontSize: 13, padding: "8px 20px", minHeight: 36 }}>开始写作</button>
      </div>

      {/* Toolbar */}
      <ArchitectToolbar
        onAddNode={handleAddNode} onConnectMode={() => setConnectMode(c => !c)} onDelete={handleDelete}
        onAIPanel={() => setShowAIPanel(p => !p)} onAIExpand={() => {}}
        onReview={handleReview} onTemplates={() => setShowTemplateModal(true)} onImport={() => {}}
        onZoomIn={() => setScale(s => Math.min(2, s + 0.2))} onZoomOut={() => setScale(s => Math.max(0.3, s - 0.2))}
        onFit={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
        connectMode={connectMode} canDelete={!!(selectedNodeId || selectedEdgeId)}
      />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--bg-primary)", cursor: isPanning ? "grabbing" : connectMode ? "crosshair" : "grab" }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onDoubleClick={handleDoubleClick}
        >
          {/* Initial input overlay */}
          {nodes.length === 0 && !genreConfirm && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, background: "var(--bg-primary)" }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>你想写什么？</h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>描述你的写作想法，AI 帮你搭建文章骨架</p>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  className="input-field"
                  value={initialInput}
                  onChange={e => setInitialInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleInitialSubmit(); }}
                  placeholder="例如：我想写一篇关于城市孤独感的散文..."
                  style={{ width: 420, fontSize: 14, padding: "12px 16px" }}
                  autoFocus
                />
                <button className="btn-primary" onClick={handleInitialSubmit} disabled={genreLoading || !initialInput.trim()} style={{ minWidth: 80 }}>{genreLoading ? "..." : "生成架构"}</button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 500 }}>
                <span style={{ color: "var(--text-tertiary)", fontSize: 11, width: "100%", textAlign: "center", marginBottom: 4 }}>或选择快捷模板：</span>
                {quickTemplates.map(qt => (
                  <button key={qt.label} onClick={() => loadTemplate(qt.label === "议论文" ? "argumentative" : qt.label === "记叙文" ? "narrative" : qt.label === "说明文" ? "expository" : qt.label === "散文" ? "essay" : qt.label === "报告" ? "report" : "narrative")} className="btn-secondary" style={{ fontSize: 12, padding: "6px 12px", minHeight: 32 }}>
                    {qt.icon} {qt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Edges */}
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
              {edges.map(e => {
                const fn = nodes.find(n => n.id === e.from), tn = nodes.find(n => n.id === e.to);
                if (!fn || !tn) return null;
                return (
                  <g key={e.id} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={ev => { ev.stopPropagation(); selectEdge(e.id); }}>
                    <line x1={fn.position.x+80} y1={fn.position.y+18} x2={tn.position.x+80} y2={tn.position.y+18} stroke={selectedEdgeId===e.id?"var(--gold)":e.relation==="contradicts"?"var(--error)":"#555"} strokeWidth={selectedEdgeId===e.id?3:2} strokeDasharray={e.relation==="contradicts"?"6,3":"none"} />
                    <text x={(fn.position.x+tn.position.x)/2+80} y={(fn.position.y+tn.position.y)/2-4} fill="var(--text-tertiary)" fontSize={10} textAnchor="middle">{EDGE_LABELS[e.relation]}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          <div style={{ position: "absolute", transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
            {nodes.map(n => {
              const { allowed, reason } = canAddChild(n, nodes);
              const isSelected = selectedNodeId === n.id;
              return (
                <div key={n.id}>
                  <div className="arch-bubble"
                    onClick={e => handleBubbleClick(e, n.id)}
                    onDoubleClick={e => handleBubbleDoubleClick(e, n)}
                    onContextMenu={e => handleContextMenu(e, n.id)}
                    style={{
                      position: "absolute", left: n.position.x, top: n.position.y,
                      minWidth: 100, maxWidth: 180, padding: "6px 12px",
                      borderRadius: 14, background: isSelected ? "var(--bg-elevated)" : "var(--bg-secondary)",
                      border: `2px solid ${isSelected ? BUBBLE_COLORS[n.type] : connectFrom===n.id ? "var(--gold)" : "var(--border)"}`,
                      color: "var(--text-primary)", fontSize: 13, cursor: connectMode ? "crosshair" : "pointer",
                      zIndex: isSelected ? 10 : 1,
                      boxShadow: isSelected ? `0 0 16px ${BUBBLE_COLORS[n.type]}40` : "none",
                      userSelect: "none", overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                  >
                    {editingNode === n.id ? (
                      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <input className="input-field" value={editLabel} onChange={e => setEditLabel(e.target.value)} onKeyDown={e => { if (e.key==="Enter") saveEdit(); if (e.key==="Escape") setEditingNode(null); }} autoFocus style={{ fontSize: 13, padding: "4px 8px" }} />
                        <input className="input-field" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="备注" style={{ fontSize: 11, padding: "3px 6px" }} />
                        <button className="btn-primary" onClick={saveEdit} style={{ fontSize: 11, padding: "3px 8px", minHeight: 28 }}>保存</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: BUBBLE_COLORS[n.type], flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
                          {n.priority && <span style={{ fontSize: 9, color: PRIORITY_COLORS[n.priority], marginLeft: "auto" }}>{PRIORITY_LABELS[n.priority]}</span>}
                        </div>
                        {n.notes && <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.notes}</div>}
                        {n.targetWords && <div style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2 }}>目标 {n.targetWords}字</div>}
                        {n.reviewStatus && <span style={{ position: "absolute", top: -4, right: -4, fontSize: 8, color: n.reviewStatus==="red"?"var(--error)":"var(--warning)" }}>●</span>}
                      </>
                    )}
                  </div>

                  {/* [+] add child button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddChild(n.id); }}
                    title={!allowed ? reason : "添加子节点"}
                    style={{
                      position: "absolute", left: n.position.x + 170, top: n.position.y + 24,
                      width: 20, height: 20, borderRadius: "50%",
                      background: allowed ? "var(--gold)" : "#444",
                      color: allowed ? "var(--text-inverse)" : "#888",
                      border: "none", cursor: allowed ? "pointer" : "not-allowed",
                      fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 5, opacity: 0.7, transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>

          {/* Skip */}
          <button onClick={handleSkip} style={{ position: "absolute", bottom: 20, right: 20, background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer", zIndex: 5 }}>跳过 → 直接写作</button>

          {/* Review panel */}
          {reviewResult && (
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20, width: 240, maxHeight: 320, overflow: "auto", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>审查结果</span>
                <button onClick={() => setReviewResult(null)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: reviewResult.score >= 70 ? "var(--success)" : "var(--warning)", marginBottom: 10 }}>{reviewResult.score}/100</div>
              {reviewResult.issues.map((issue, i) => (
                <div key={i} style={{ padding: "5px 0", borderTop: "1px solid var(--border-light)", fontSize: 11, color: "var(--text-secondary)" }}>
                  <span style={{ color: issue.severity === "red" ? "var(--error)" : "var(--warning)", fontWeight: 600 }}>{issue.severity === "red" ? "🔴" : "🟡"}</span> {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Edge relation picker */}
          {edgeRelationPicker && (
            <div style={{ position: "absolute", left: edgeRelationPicker.x - 300, top: edgeRelationPicker.y - 60, zIndex: 30, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, display: "flex", gap: 2, flexWrap: "wrap", width: 200 }}>
              {(Object.keys(EDGE_LABELS) as EdgeRelation[]).map(r => (
                <button key={r} onClick={() => handleRelationPick(edgeRelationPicker.edgeId, r)} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}>{EDGE_LABELS[r]}</button>
              ))}
            </div>
          )}

          {/* Context menu */}
          {contextMenu && (
            <div style={{ position: "absolute", left: contextMenu.x - 300, top: contextMenu.y - 60, zIndex: 30, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, minWidth: 140, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              {["high", "medium", "low"].map(p => (
                <div key={p} onClick={() => { updateNode(contextMenu.nodeId, { priority: p as "high"|"medium"|"low" }); setContextMenu(null); }} style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{PRIORITY_LABELS[p as "high"|"medium"|"low"]}优先级</div>
              ))}
              <div onClick={() => { removeNode(contextMenu.nodeId); setContextMenu(null); }} style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--error)", borderRadius: 4, borderTop: "1px solid var(--border-light)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>删除节点</div>
            </div>
          )}
        </div>

        {/* AI Panel */}
        {showAIPanel && (
          <div style={{ width: 320, flexShrink: 0, background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-light)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)" }}>AI 对话</span>
              <button onClick={() => setShowAIPanel(false)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {aiMessages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "8px 12px", borderRadius: 10, background: m.role === "user" ? "rgba(212,168,83,0.1)" : "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: 12, lineHeight: 1.5 }}>{m.content}</div>
              ))}
              {aiPreview && (
                <div style={{ padding: 8, background: "rgba(76,175,80,0.1)", border: "1px solid var(--success)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>AI 生成了 {aiPreview.nodes.length} 个节点</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-primary" style={{ fontSize: 11, padding: "4px 10px", minHeight: 30 }} onClick={acceptAIPreview}>采纳</button>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 10px", minHeight: 30 }} onClick={() => setAiPreview(null)}>撤销</button>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={e => { e.preventDefault(); sendAIMessage(); }} style={{ padding: "8px 14px", borderTop: "1px solid var(--border-light)", display: "flex", gap: 6 }}>
              <input className="input-field" value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="描述写作想法..." style={{ flex: 1, fontSize: 12 }} />
              <button className="btn-primary" type="submit" disabled={aiLoading || !aiInput.trim()} style={{ padding: "6px 12px", minHeight: 36, fontSize: 12 }}>发送</button>
            </form>
          </div>
        )}
      </div>

      {/* Genre Confirm */}
      {genreConfirm && <GenreConfirmCard genres={genreConfirm.genres} onSelect={handleGenreSelect} onDismiss={() => setGenreConfirm(null)} />}

      {/* Template Modal */}
      {showTemplateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTemplateModal(false)}>
          <div style={{ width: 480, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "var(--gold)", fontSize: 16, marginBottom: 16 }}>选择模板</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["argumentative","📝议论文"],["narrative","📖记叙文"],["expository","📋说明文"],["essay","🌸散文"],["report","📊报告"]].map(([k, v]) => (
                <button key={k} className="btn-secondary" onClick={() => loadTemplate(k)} style={{ textAlign: "left", padding: 12, fontSize: 13 }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
