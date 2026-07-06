"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useArchitectStore } from "@/store/architect-store";
import type { AlignMessage, ArchitectScheme, ReviewIssue } from "@/types/architect";
import { BUBBLE_COLORS, EDGE_LABELS } from "@/types/architect";

export default function ArchitectPage() {
  const router = useRouter();
  const nodes = useArchitectStore((s) => s.nodes);
  const edges = useArchitectStore((s) => s.edges);
  const addScheme = useArchitectStore((s) => s.addScheme);
  const setActiveScheme = useArchitectStore((s) => s.setActiveScheme);
  const addNode = useArchitectStore((s) => s.addNode);
  const updateNode = useArchitectStore((s) => s.updateNode);
  const removeNode = useArchitectStore((s) => s.removeNode);
  const selectNode = useArchitectStore((s) => s.selectNode);
  const selectedNodeId = useArchitectStore((s) => s.selectedNodeId);
  const setNodes = useArchitectStore((s) => s.setNodes);
  const setEdges = useArchitectStore((s) => s.setEdges);

  const [phase, setPhase] = useState<"align" | "generating" | "canvas">("align");
  const [messages, setMessages] = useState<AlignMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [conversationSummary, setConversationSummary] = useState("");
  const [reviewResult, setReviewResult] = useState<{ issues: ReviewIssue[]; score: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  let nodeCounter = useRef(20);

  // ── Align: send message ────────────────────────────────────
  const sendAlign = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const msgs: AlignMessage[] = [...messages, { role: "user", content: text }];
    setMessages(msgs); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/architect/align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: text, conversationHistory: msgs.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) throw new Error("Align failed");
      const data = await res.json();
      if (data.type === "template") {
        setTemplateType(data.templateType);
        setMessages([...msgs, { role: "ai", content: `推荐模板: ${data.templateType}。正在生成架构...` }]);
        setConversationSummary(msgs.map(m => m.content).join(" | "));
        setTimeout(() => { setPhase("generating"); generateArch(data.templateType, msgs.map(m => m.content).join(" | ")); }, 500);
      } else {
        setMessages([...msgs, { role: "ai", content: data.content }]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [messages, loading]);

  // ── Generate architecture ──────────────────────────────────
  const generateArch = useCallback(async (type: string, summary: string) => {
    try {
      const res = await fetch("/api/architect/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: type, userInput: summary, conversationSummary: summary }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes?.length > 0) {
          const scheme: ArchitectScheme = { id: "scheme-1", name: "方案 A", nodes: data.nodes, edges: data.edges || [], isActive: true };
          addScheme(scheme); setActiveScheme("scheme-1");
          setPhase("canvas"); return;
        }
      }
      // Fallback: load template
      const map: Record<string, string> = { argumentative: "argumentative", narrative: "narrative", expository: "expository", essay: "essay", report: "report" };
      const tpl = await fetch(`/templates/${map[type] || "essay"}.json`);
      if (tpl.ok) {
        const d = await tpl.json();
        const scheme: ArchitectScheme = { id: "scheme-1", name: "方案 A", nodes: d.defaultNodes, edges: d.defaultEdges, isActive: true };
        addScheme(scheme); setActiveScheme("scheme-1");
      }
    } catch { /* */ }
    setPhase("canvas");
  }, [addScheme, setActiveScheme]);

  // ── Review ─────────────────────────────────────────────────
  const handleReview = useCallback(async () => {
    if (nodes.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/architect/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nodes, edges }) });
      if (res.ok) { const d = await res.json(); setReviewResult({ issues: d.issues || [], score: d.overallScore || 0 }); }
    } catch { /* */ } finally { setLoading(false); }
  }, [nodes, edges]);

  // ── Canvas: mouse handlers ─────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true); panRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y, ox: offset.x, oy: offset.y };
      selectNode(null);
    }
  }, [offset, selectNode]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) setOffset({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y });
    if (dragging) updateNode(dragging, { position: { x: (e.clientX - 200) / scale - offset.x / scale, y: (e.clientY - 100) / scale - offset.y / scale } });
  }, [isPanning, dragging, scale, offset, updateNode]);

  const handleCanvasMouseUp = useCallback(() => { setIsPanning(false); setDragging(null); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setScale(s => Math.max(0.3, Math.min(2, s - e.deltaY * 0.001))); }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".arch-bubble")) return;
    const nid = `n${++nodeCounter.current}`;
    addNode({ id: nid, label: "新节点", type: "argument", position: { x: (e.clientX - 200) / scale - offset.x / scale, y: (e.clientY - 80) / scale - offset.y / scale }, children: [] });
  }, [scale, offset, addNode]);

  const handleStartWriting = () => router.push("/");

  // ═══════════════════════════════════════════════════════════

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-ui)" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>Sculptor Architect</span>
          {templateType && <span style={{ fontSize: 12, color: "var(--text-tertiary)", background: "var(--bg-tertiary)", padding: "3px 10px", borderRadius: 10 }}>{templateType}</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => { setReviewResult(null); handleReview(); }} disabled={nodes.length === 0 || loading} style={{ fontSize: 12, padding: "6px 14px", minHeight: 36 }} aria-label="逻辑审查">
            {loading ? "审查中..." : "🔍 逻辑审查"}
          </button>
          <button className="btn-secondary" onClick={() => { setPhase("align"); setMessages([]); }} style={{ fontSize: 12, padding: "6px 14px", minHeight: 36 }}>
            重新对话
          </button>
          <button className="btn-primary" onClick={handleStartWriting} disabled={nodes.length === 0} style={{ fontSize: 13, padding: "6px 18px", minHeight: 36 }}>
            开始写作
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Align sidebar */}
        {phase === "align" && (
          <div style={{ width: 380, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)" }}>意向对齐</span>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>告诉我你的写作意图，我会帮你搭建文章骨架</p>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.length === 0 && (
                <button className="btn-primary" onClick={() => sendAlign("我想写一篇文章")} style={{ marginBottom: 8 }}>开始对话</button>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? "rgba(212,168,83,0.1)" : "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5, border: m.role === "user" ? "1px solid rgba(212,168,83,0.2)" : "1px solid var(--border-light)" }}>
                  {m.content}
                </div>
              ))}
              {loading && <div style={{ color: "var(--text-tertiary)", fontSize: 12, padding: 8 }}>思考中...</div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); sendAlign(input); }} style={{ padding: "10px 18px", borderTop: "1px solid var(--border-light)", display: "flex", gap: 8 }}>
              <input ref={inputRef} className="input-field" value={input} onChange={e => setInput(e.target.value)} placeholder="描述你的写作想法..." disabled={loading} style={{ flex: 1 }} />
              <button className="btn-primary" type="submit" disabled={loading || !input.trim()} style={{ minWidth: 60, padding: "8px 16px", minHeight: 44 }}>发送</button>
            </form>
          </div>
        )}

        {/* Canvas */}
        <div
          style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--bg-primary)", cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          {phase === "generating" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", fontSize: 16, zIndex: 10 }}>
              <div className="skeleton" style={{ width: 200, height: 20 }} />
            </div>
          )}

          {/* Edges (SVG) */}
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
              {edges.map(e => {
                const fn = nodes.find(n => n.id === e.from);
                const tn = nodes.find(n => n.id === e.to);
                if (!fn || !tn) return null;
                const sx = fn.position.x + 80, sy = fn.position.y + 20;
                const ex = tn.position.x + 80, ey = tn.position.y + 20;
                return (
                  <g key={e.id}>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={e.relation === "contradicts" ? "var(--error)" : e.relation === "supports" ? "var(--success)" : "#555"} strokeWidth={2} strokeDasharray={e.relation === "contradicts" ? "6,3" : "none"} />
                    <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 6} fill="var(--text-tertiary)" fontSize={10} textAnchor="middle">{EDGE_LABELS[e.relation] || e.relation}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          <div style={{ position: "absolute", transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
            {nodes.map(n => (
              <div
                key={n.id}
                className="arch-bubble"
                onMouseDown={e => { e.stopPropagation(); selectNode(n.id); setDragging(n.id); }}
                style={{
                  position: "absolute", left: n.position.x, top: n.position.y,
                  minWidth: 100, maxWidth: 180, padding: "8px 14px",
                  borderRadius: 16, background: "var(--bg-elevated)",
                  border: `2px solid ${selectedNodeId === n.id ? BUBBLE_COLORS[n.type] : "var(--border)"}`,
                  color: "var(--text-primary)", fontSize: 13, cursor: "grab",
                  zIndex: selectedNodeId === n.id ? 10 : 1,
                  boxShadow: selectedNodeId === n.id ? `0 0 16px ${BUBBLE_COLORS[n.type]}40` : "none",
                  userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              >
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: BUBBLE_COLORS[n.type], marginRight: 6 }} />
                {n.label}
                {reviewResult?.issues.find(i => i.nodeId === n.id) && (
                  <span style={{ marginLeft: 4, fontSize: 10, color: reviewResult.issues.find(i => i.nodeId === n.id)!.severity === "red" ? "var(--error)" : "var(--warning)" }}>
                    {reviewResult.issues.find(i => i.nodeId === n.id)!.severity === "red" ? "●" : "●"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Review panel */}
          {reviewResult && (
            <div style={{ position: "absolute", top: 12, right: 12, zIndex: 20, width: 240, maxHeight: 320, overflow: "auto", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>审查结果</span>
                <button className="btn-icon" onClick={() => setReviewResult(null)} style={{ width: 24, height: 24 }} aria-label="关闭">✕</button>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: reviewResult.score >= 70 ? "var(--success)" : "var(--warning)", marginBottom: 10 }}>{reviewResult.score}/100</div>
              {reviewResult.issues.map((issue, i) => (
                <div key={i} style={{ padding: "6px 0", borderTop: "1px solid var(--border-light)", fontSize: 11 }}>
                  <span style={{ color: issue.severity === "red" ? "var(--error)" : "var(--warning)", fontWeight: 600 }}>
                    {issue.severity === "red" ? "🔴" : "🟡"} {issue.message}
                  </span>
                  {issue.suggestion && <div style={{ color: "var(--text-tertiary)", marginTop: 2 }}>{issue.suggestion}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
