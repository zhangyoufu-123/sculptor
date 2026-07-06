"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useArchitectStore } from "@/store/architect-store";
import ArchitectToolbar from "@/components/architect/ArchitectToolbar";
import type { AlignMessage, ArchitectNode, ArchitectEdge, EdgeRelation, BubbleType, ReviewIssue } from "@/types/architect";
import { BUBBLE_COLORS, EDGE_LABELS, BUBBLE_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types/architect";

let nodeCounter = 30;

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
  const [templateLoading, setTemplateLoading] = useState(false);

  // ── Canvas handlers ─────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest("svg")) {
      setIsPanning(true);
      panRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      selectNode(null); selectEdge(null); setContextMenu(null);
    }
  }, [offset, selectNode, selectEdge]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) setOffset({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);
  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setScale(s => Math.max(0.3, Math.min(2, s - e.deltaY * 0.001))); }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".arch-bubble")) return;
    const x = (e.clientX - 280) / scale - offset.x / scale;
    const y = (e.clientY - 80) / scale - offset.y / scale;
    const id = `n${++nodeCounter}`;
    addNode({ id, label: "新节点", type: "argument", position: { x, y }, children: [] });
  }, [scale, offset, addNode]);

  // ── Node operations ─────────────────────────────────────────
  const handleAddNode = (type: string) => {
    const id = `n${++nodeCounter}`;
    addNode({ id, label: BUBBLE_LABELS[type as BubbleType] || type, type: type as BubbleType, position: { x: 400 + Math.random() * 200, y: 200 + Math.random() * 300 }, children: [] });
  };

  const handleDelete = () => {
    if (selectedNodeId) removeNode(selectedNodeId);
    if (selectedEdgeId) removeEdge(selectedEdgeId);
    selectNode(null); selectEdge(null);
  };

  const handleBubbleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connectMode && connectFrom) {
      if (connectFrom !== id) {
        const edgeId = `e${Date.now()}`;
        addEdge({ id: edgeId, from: connectFrom, to: id, relation: "supports" });
        setEdgeRelationPicker({ x: e.clientX, y: e.clientY, edgeId });
      }
      setConnectFrom(null);
      return;
    }
    if (connectMode) {
      setConnectFrom(id);
      return;
    }
    selectNode(id);
    selectEdge(null);
  };

  const handleBubbleDoubleClick = (e: React.MouseEvent, node: ArchitectNode) => {
    e.stopPropagation();
    setEditingNode(node.id);
    setEditLabel(node.label);
    setEditNotes(node.notes || "");
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    selectNode(nodeId);
  };

  const saveEdit = () => {
    if (editingNode && editLabel.trim()) {
      updateNode(editingNode, { label: editLabel.trim(), notes: editNotes.trim() || undefined });
    }
    setEditingNode(null);
  };

  // ── Edge relation picker ────────────────────────────────────
  const handleRelationPick = (edgeId: string, relation: EdgeRelation) => {
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      removeEdge(edgeId);
      addEdge({ ...edge, relation });
    }
    setEdgeRelationPicker(null);
    selectEdge(null);
  };

  // ── AI Panel ────────────────────────────────────────────────
  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const msgs = [...aiMessages, { role: "user" as const, content: aiInput }];
    setAiMessages(msgs); setAiInput(""); setAiLoading(true);
    try {
      const res = await fetch("/api/architect/align", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: aiInput, conversationHistory: msgs.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (res.ok) {
        const d = await res.json();
        setAiMessages([...msgs, { role: "ai", content: d.content || "好的，我来生成架构" }]);
        // If we have enough context, generate preview architecture
        if (msgs.length >= 1) {
          const genRes = await fetch("/api/architect/generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateType: "essay", userInput: aiInput, conversationSummary: msgs.map(m => m.content).join(" | ") }),
          });
          if (genRes.ok) {
            const genData = await genRes.json();
            if (genData.nodes) setAiPreview({ nodes: genData.nodes, edges: genData.edges || [] });
          }
        }
      }
    } catch { /* */ } finally { setAiLoading(false); }
  };

  const acceptAIPreview = () => {
    if (aiPreview) {
      setNodes(aiPreview.nodes.map(n => ({ ...n, children: n.children || [] })));
      setEdges(aiPreview.edges);
      setAiPreview(null);
    }
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
    setTemplateLoading(true);
    try {
      const res = await fetch(`/templates/${type}.json`);
      if (res.ok) {
        const d = await res.json();
        setNodes(d.defaultNodes); setEdges(d.defaultEdges);
      }
    } catch { /* */ } finally { setTemplateLoading(false); setShowTemplateModal(false); }
  };

  const handleStartWriting = () => router.push("/");
  const handleSkip = () => router.push("/write");

  // ── Keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Delete" && (selectedNodeId || selectedEdgeId)) handleDelete();
      if (e.key === "Escape") { setEditingNode(null); setContextMenu(null); setConnectMode(false); setConnectFrom(null); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [selectedNodeId, selectedEdgeId]);

  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-ui)", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>Sculptor Architect</span>
        <button className="btn-primary" onClick={handleStartWriting} disabled={nodes.length === 0} style={{ fontSize: 13, padding: "8px 20px", minHeight: 36 }}>
          开始写作
        </button>
      </div>

      {/* Toolbar */}
      <ArchitectToolbar
        onAddNode={handleAddNode}
        onConnectMode={() => setConnectMode(c => !c)}
        onDelete={handleDelete}
        onAIPanel={() => setShowAIPanel(p => !p)}
        onAIExpand={() => {}}
        onReview={handleReview}
        onTemplates={() => setShowTemplateModal(true)}
        onImport={() => {}}
        onZoomIn={() => setScale(s => Math.min(2, s + 0.2))}
        onZoomOut={() => setScale(s => Math.max(0.3, s - 0.2))}
        onFit={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
        connectMode={connectMode}
        canDelete={!!(selectedNodeId || selectedEdgeId)}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas */}
        <div
          style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--bg-primary)", cursor: isPanning ? "grabbing" : connectMode ? "crosshair" : "grab" }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onDoubleClick={handleDoubleClick}
        >
          {/* Edges */}
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
              {edges.map(e => {
                const fn = nodes.find(n => n.id === e.from), tn = nodes.find(n => n.id === e.to);
                if (!fn || !tn) return null;
                const sx = fn.position.x + 80, sy = fn.position.y + 18;
                const ex = tn.position.x + 80, ey = tn.position.y + 18;
                return (
                  <g key={e.id} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); selectEdge(e.id); }}>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={selectedEdgeId === e.id ? "var(--gold)" : e.relation === "contradicts" ? "var(--error)" : "#555"} strokeWidth={selectedEdgeId === e.id ? 3 : 2} strokeDasharray={e.relation === "contradicts" ? "6,3" : "none"} />
                    <text x={(sx+ex)/2} y={(sy+ey)/2-6} fill="var(--text-tertiary)" fontSize={10} textAnchor="middle">{EDGE_LABELS[e.relation]}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          <div style={{ position: "absolute", transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
            {nodes.map(n => (
              <div key={n.id} className="arch-bubble"
                onClick={e => handleBubbleClick(e, n.id)}
                onDoubleClick={e => handleBubbleDoubleClick(e, n)}
                onContextMenu={e => handleContextMenu(e, n.id)}
                style={{
                  position: "absolute", left: n.position.x, top: n.position.y,
                  minWidth: 100, maxWidth: 180, padding: "6px 12px",
                  borderRadius: 14, background: selectedNodeId === n.id ? "var(--bg-elevated)" : "var(--bg-secondary)",
                  border: `2px solid ${selectedNodeId === n.id ? BUBBLE_COLORS[n.type] : connectFrom === n.id ? "var(--gold)" : "var(--border)"}`,
                  color: "var(--text-primary)", fontSize: 13, cursor: connectMode ? "crosshair" : "pointer",
                  zIndex: selectedNodeId === n.id ? 10 : 1,
                  boxShadow: selectedNodeId === n.id ? `0 0 16px ${BUBBLE_COLORS[n.type]}40` : "none",
                  userSelect: "none", overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                {editingNode === n.id ? (
                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <input className="input-field" value={editLabel} onChange={e => setEditLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingNode(null); }} autoFocus style={{ fontSize: 13, padding: "4px 8px" }} />
                    <input className="input-field" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="备注（可选）" style={{ fontSize: 11, padding: "3px 6px" }} />
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
                    {n.reviewStatus && <span style={{ position: "absolute", top: -4, right: -4, fontSize: 8, color: n.reviewStatus === "red" ? "var(--error)" : "var(--warning)" }}>●</span>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Skip button */}
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
                  {issue.suggestion && <div style={{ color: "var(--text-tertiary)", marginTop: 2 }}>→ {issue.suggestion}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Edge relation picker */}
          {edgeRelationPicker && (
            <div style={{ position: "absolute", left: edgeRelationPicker.x - 280, top: edgeRelationPicker.y - 60, zIndex: 30, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, display: "flex", gap: 2, flexWrap: "wrap", width: 200 }}>
              {(Object.keys(EDGE_LABELS) as EdgeRelation[]).map(r => (
                <button key={r} onClick={() => handleRelationPick(edgeRelationPicker.edgeId, r)} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}>{EDGE_LABELS[r]}</button>
              ))}
            </div>
          )}

          {/* Context menu */}
          {contextMenu && (
            <div style={{ position: "absolute", left: contextMenu.x - 280, top: contextMenu.y - 60, zIndex: 30, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, minWidth: 140, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              {["high", "medium", "low"].map(p => (
                <div key={p} onClick={() => { updateNode(contextMenu.nodeId, { priority: p as "high" | "medium" | "low" }); setContextMenu(null); }} style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", borderRadius: 4, transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {PRIORITY_LABELS[p as "high"|"medium"|"low"]}优先级
                </div>
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
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "8px 12px", borderRadius: 10, background: m.role === "user" ? "rgba(212,168,83,0.1)" : "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: 12, lineHeight: 1.5, border: m.role === "user" ? "1px solid rgba(212,168,83,0.2)" : "1px solid var(--border-light)" }}>
                  {m.content}
                </div>
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
              <input className="input-field" value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="描述你的写作想法..." style={{ flex: 1, fontSize: 12 }} />
              <button className="btn-primary" type="submit" disabled={aiLoading || !aiInput.trim()} style={{ padding: "6px 12px", minHeight: 36, fontSize: 12, minWidth: 50 }}>发送</button>
            </form>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTemplateModal(false)}>
          <div style={{ width: 480, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "var(--gold)", fontSize: 16, marginBottom: 16 }}>选择模板</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["argumentative", "narrative", "expository", "essay", "report", "custom"].map(t => (
                <button key={t} className="btn-secondary" onClick={() => loadTemplate(t)} style={{ textAlign: "left", padding: "12px", fontSize: 13, flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 600 }}>{BUBBLE_LABELS[t as BubbleType] || t}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t === "essay" ? "散文" : t === "report" ? "报告" : t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
