"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useArchitectStore } from "@/store/architect-store";
import ArchitectToolbar from "@/components/architect/ArchitectToolbar";
import GenreConfirmCard from "@/components/architect/GenreConfirmCard";
import ChatPanel from "@/components/architect/ChatPanel";
import { autoLayout, canAddChild } from "@/lib/ai/architect-layout";
import type { ArchitectNode, ArchitectEdge, EdgeRelation, BubbleType, ReviewIssue } from "@/types/architect";
import { BUBBLE_COLORS, EDGE_LABELS, BUBBLE_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types/architect";

let nodeCounter = 30;

interface ChatMsg {
  id: string; role: "user" | "assistant"; content: string;
  type?: string; options?: { label: string; value: string }[];
  suggestionNodes?: ArchitectNode[]; suggestionEdges?: ArchitectEdge[];
}
interface DragState { nodeId: string; startX: number; startY: number; origX: number; origY: number; }

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
  const selId = useArchitectStore((s) => s.selectedNodeId);
  const setNodes = useArchitectStore((s) => s.setNodes);
  const setEdges = useArchitectStore((s) => s.setEdges);
  const selEdge = useArchitectStore((s) => s.selectedEdgeId);
  const pickEdge = useArchitectStore((s) => s.selectEdge);

  const [scale, setScale] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panR = useRef({ x: 0, y: 0 });
  const [cmode, setCmode] = useState(false);
  const [cfrom, setCfrom] = useState<string | null>(null);
  const [review, setReview] = useState<{ issues: ReviewIssue[]; score: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editL, setEditL] = useState("");
  const [editN, setEditN] = useState("");
  const [ctx, setCtx] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [epick, setEpick] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  const [tpl, setTpl] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [layout, setLayout] = useState<{ manual: boolean; positions: Record<string, { x: number; y: number }> }>({ manual: false, positions: {} });

  // Chat
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [cload, setCload] = useState(false);
  const [copen, setCopen] = useState(true);
  const [showIn, setShowIn] = useState(true);
  const [initIn, setInitIn] = useState("");
  const [gconfirm, setGconfirm] = useState<{ genres: { name: string; description: string; icon: string }[] } | null>(null);
  const [gload, setGload] = useState(false);
  const snaps = useRef<Record<string, { n: ArchitectNode[]; e: ArchitectEdge[] }>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const snap = (mid: string) => { snaps.current[mid] = { n: [...nodes], e: [...edges] }; };

  // ── Initial submit ────────────────────────────
  const doInit = async (text?: string) => {
    const m = (text || initIn).trim();
    if (!m) return;
    setGload(true);
    const genres = ["议论文", "记叙文", "散文", "说明文", "报告", "游记", "书评", "影评", "新闻稿"];
    const ex = genres.find((g) => m.includes(g));
    if (ex) {
      await genArch(ex, m);
      setGload(false);
      setShowIn(false);
      return;
    }
    try {
      const r = await fetch("/api/architect/confirm-genre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: m }),
      });
      if (r.ok) {
        const d = await r.json();
        setGconfirm(d);
      }
    } catch {
      // silent
    }
    setGload(false);
  };

  const pickG = async (genre: string) => {
    setGconfirm(null);
    setShowIn(false);
    await genArch(genre, initIn);
  };

  const genArch = async (type: string, summary: string) => {
    try {
      const r = await fetch("/api/architect/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: type, userInput: summary, conversationSummary: summary }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.nodes && d.nodes.length > 0) {
          setNodes(autoLayout(d.nodes));
          setEdges(d.edges || []);
          return;
        }
      }
    } catch {
      // fallback
    }
    const map: Record<string, string> = { "议论文": "argumentative", "记叙文": "narrative", "说明文": "expository", "散文": "essay", "报告": "report", "游记": "narrative" };
    try {
      const r = await fetch("/templates/" + (map[type] || "essay") + ".json");
      if (r.ok) {
        const d = await r.json();
        setNodes(d.defaultNodes);
        setEdges(d.defaultEdges);
      }
    } catch {
      // silent
    }
  };

  // ── Chat ──────────────────────────────────────────
  const sendChat = async (text: string) => {
    const um: ChatMsg = { id: "u" + Date.now(), role: "user", content: text };
    const nm = [...msgs, um];
    setMsgs(nm);
    setCload(true);
    try {
      const r = await fetch("/api/architect/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: nm.map((m) => ({ role: m.role, content: m.content })),
          currentArchitecture: { nodes, edges },
          selectedNodeId: selId,
        }),
      });
      if (r.ok && r.body) {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === "done") break;
              const am: ChatMsg = { id: "a" + Date.now(), role: "assistant", content: ev.message || "", type: ev.type, options: ev.options };
              if (ev.nodes && ev.type !== "clarification") {
                snap(am.id);
                setNodes(autoLayout(ev.nodes));
                setEdges(ev.edges || []);
                if (ev.type === "suggestion") {
                  am.suggestionNodes = ev.nodes;
                  am.suggestionEdges = ev.edges;
                }
              }
              setMsgs((p) => [...p, am]);
            } catch {
              // skip
            }
          }
        }
      }
    } catch {
      // silent
    } finally {
      setCload(false);
    }
  };

  const rollback = (mid: string) => {
    const s = snaps.current[mid];
    if (s) {
      setNodes(s.n);
      setEdges(s.e);
    }
  };

  const acceptSug = (sn: ArchitectNode[], se: ArchitectEdge[]) => {
    setNodes(sn);
    setEdges(se);
    snap("acc" + Date.now());
  };

  const clPick = (v: string) => sendChat(v);

  // ── Canvas ──────────────────────────────────────────
  const mDown = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t === e.currentTarget || t.closest("svg")) {
      setPanning(true);
      panR.current = { x: e.clientX - off.x, y: e.clientY - off.y };
      selectNode(null);
      pickEdge(null);
      setCtx(null);
    }
  };

  const mMove = (e: React.MouseEvent) => {
    if (panning) {
      setOff({ x: e.clientX - panR.current.x, y: e.clientY - panR.current.y });
    }
    if (drag) {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      updateNode(drag.nodeId, { position: { x: drag.origX + dx, y: drag.origY + dy } });
    }
  };

  const mUp = () => {
    setPanning(false);
    if (drag) {
      const n = nodes.find((x) => x.id === drag.nodeId);
      if (n) {
        setLayout((p) => ({
          manual: true,
          positions: { ...p.positions, [drag.nodeId]: n.position },
        }));
      }
    }
    setDrag(null);
  };

  const mWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.3, Math.min(2, s - e.deltaY * 0.001)));
  };

  const dblClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".arch-bubble")) return;
    const cx = copen ? 368 : 48;
    const x = (e.clientX - cx) / scale - off.x / scale;
    const y = (e.clientY - 100) / scale - off.y / scale;
    addNode({
      id: "n" + ++nodeCounter,
      label: "新节点",
      type: "argument",
      position: { x, y },
      children: [],
    });
  };

  const addNd = (type: string) => {
    addNode({
      id: "n" + ++nodeCounter,
      label: BUBBLE_LABELS[type as BubbleType] || type,
      type: type as BubbleType,
      position: { x: 400 + Math.random() * 200, y: 200 + Math.random() * 300 },
      children: [],
    });
  };

  const addCh = (pid: string) => {
    const p = nodes.find((n) => n.id === pid);
    if (!p) return;
    const { allowed, reason } = canAddChild(p, nodes);
    if (!allowed) {
      alert(reason);
      return;
    }
    const cid = "n" + ++nodeCounter;
    const px = p.position.x + 160;
    const py = p.position.y + 100 + (p.children ? p.children.length : 0) * 60;
    addNode({ id: cid, label: "子节点", type: "evidence", position: { x: px, y: py }, children: [] });
    updateNode(pid, { children: [...(p.children || []), cid] });
  };

  const del = () => {
    if (selId) removeNode(selId);
    if (selEdge) removeEdge(selEdge);
    selectNode(null);
    pickEdge(null);
  };

  const bClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (cmode && cfrom && cfrom !== id) {
      const eid = "e" + Date.now();
      addEdge({ id: eid, from: cfrom, to: id, relation: "supports" });
      setEpick({ x: e.clientX, y: e.clientY, edgeId: eid });
      setCfrom(null);
      return;
    }
    if (cmode) {
      setCfrom(id);
      return;
    }
    selectNode(id);
    pickEdge(null);
  };

  const bDragStart = (e: React.MouseEvent, node: ArchitectNode) => {
    if (cmode) return;
    e.stopPropagation();
    e.preventDefault();
    selectNode(node.id);
    setDrag({
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.position.x,
      origY: node.position.y,
    });
  };

  const bDbl = (e: React.MouseEvent, node: ArchitectNode) => {
    e.stopPropagation();
    setEditing(node.id);
    setEditL(node.label);
    setEditN(node.notes || "");
  };

  const ctxM = (e: React.MouseEvent, nid: string) => {
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, nodeId: nid });
    selectNode(nid);
  };

  const doSave = () => {
    if (editing && editL.trim()) {
      updateNode(editing, { label: editL.trim(), notes: editN.trim() || undefined });
    }
    setEditing(null);
  };

  const relPick = (eid: string, rel: EdgeRelation) => {
    const e = edges.find((x) => x.id === eid);
    if (e) {
      removeEdge(eid);
      addEdge({ ...e, relation: rel });
    }
    setEpick(null);
    pickEdge(null);
  };

  const doReview = async () => {
    if (nodes.length === 0) return;
    try {
      const r = await fetch("/api/architect/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      if (r.ok) {
        const d = await r.json();
        setReview({ issues: d.issues || [], score: d.overallScore || 0 });
      }
    } catch {
      // silent
    }
  };

  const loadTpl = async (type: string) => {
    try {
      const r = await fetch("/templates/" + type + ".json");
      if (r.ok) {
        const d = await r.json();
        setNodes(d.defaultNodes);
        setEdges(d.defaultEdges);
      }
    } catch {
      // silent
    } finally {
      setTpl(false);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Delete" && (selId || selEdge)) del();
      if (e.key === "Escape") {
        setEditing(null);
        setCtx(null);
        setCmode(false);
        setCfrom(null);
        setGconfirm(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selId, selEdge]);

  const qts = [
    { l: "议论文", i: "📝" },
    { l: "记叙文", i: "📖" },
    { l: "散文", i: "🌸" },
    { l: "说明文", i: "📋" },
    { l: "报告", i: "📊" },
    { l: "游记", i: "✈️" },
  ];

  const cx = copen ? 368 : 48;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-ui)", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>Sculptor Architect</span>
        <button className="btn-primary" onClick={() => router.push("/write")} disabled={nodes.length === 0} style={{ fontSize: 13, padding: "8px 20px", minHeight: 36 }}>
          开始写作
        </button>
      </div>

      {/* Toolbar */}
      <ArchitectToolbar
        onAddNode={addNd}
        onConnectMode={() => setCmode((c) => !c)}
        onDelete={del}
        onAIPanel={() => setCopen((c) => !c)}
        onAIExpand={() => {}}
        onReview={doReview}
        onTemplates={() => setTpl(true)}
        onImport={() => {}}
        onZoomIn={() => setScale((s) => Math.min(2, s + 0.2))}
        onZoomOut={() => setScale((s) => Math.max(0.3, s - 0.2))}
        onFit={() => { setScale(1); setOff({ x: 0, y: 0 }); }}
        connectMode={cmode}
        canDelete={!!(selId || selEdge)}
      />

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Chat Panel */}
        <ChatPanel
          messages={msgs}
          onSend={sendChat}
          onRollback={rollback}
          onAcceptSuggestion={acceptSug}
          onIgnoreSuggestion={() => {}}
          onClarifySelect={clPick}
          loading={cload}
          collapsed={!copen}
          onToggle={() => setCopen((c) => !c)}
        />

        {/* Canvas */}
        <div
          style={{
            flex: 1, position: "relative", overflow: "hidden", background: "var(--bg-primary)",
            cursor: panning ? "grabbing" : cmode ? "crosshair" : "grab",
          }}
          onMouseDown={mDown}
          onMouseMove={mMove}
          onMouseUp={mUp}
          onMouseLeave={mUp}
          onWheel={mWheel}
          onDoubleClick={dblClick}
        >
          {/* Initial input overlay */}
          {showIn && nodes.length === 0 && !gconfirm && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, background: "var(--bg-primary)" }}>
              <h2 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>你想写什么？</h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>描述想法，AI 帮你搭建文章骨架</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input className="input-field" value={initIn} onChange={(e) => setInitIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doInit(); }} placeholder="例如：我想写一篇关于城市孤独感的散文..." style={{ width: 420, fontSize: 14, padding: "12px 16px" }} autoFocus />
                <button className="btn-primary" onClick={() => doInit()} disabled={gload || !initIn.trim()} style={{ minWidth: 80 }}>
                  {gload ? "..." : "开始"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 500 }}>
                <span style={{ color: "var(--text-tertiary)", fontSize: 11, width: "100%", textAlign: "center", marginBottom: 4 }}>快捷模板：</span>
                {qts.map((q) => (
                  <button
                    key={q.l}
                    onClick={() => loadTpl(q.l === "议论文" ? "argumentative" : q.l === "记叙文" ? "narrative" : q.l === "说明文" ? "expository" : q.l === "散文" ? "essay" : q.l === "报告" ? "report" : "narrative")}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: "6px 12px", minHeight: 32 }}
                  >
                    {q.i} {q.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Edges (SVG) */}
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            <g transform={"translate(" + off.x + "," + off.y + ") scale(" + scale + ")"}>
              {edges.map((e) => {
                const fn = nodes.find((n) => n.id === e.from);
                const tn = nodes.find((n) => n.id === e.to);
                if (!fn || !tn) return null;
                const isSelected = selEdge === e.id;
                const isRed = e.relation === "contradicts";
                return (
                  <g key={e.id} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); pickEdge(e.id); }}>
                    <line
                      x1={fn.position.x + 80} y1={fn.position.y + 18}
                      x2={tn.position.x + 80} y2={tn.position.y + 18}
                      stroke={isSelected ? "var(--gold)" : isRed ? "var(--error)" : "#555"}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={isRed ? "6,3" : "none"}
                    />
                    <text
                      x={(fn.position.x + tn.position.x) / 2 + 80}
                      y={(fn.position.y + tn.position.y) / 2 - 4}
                      fill="var(--text-tertiary)"
                      fontSize={10}
                      textAnchor="middle"
                    >
                      {EDGE_LABELS[e.relation]}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          <div style={{ position: "absolute", transform: "translate(" + off.x + "px," + off.y + "px) scale(" + scale + ")", transformOrigin: "0 0" }}>
            {nodes.map((n) => {
              const { allowed, reason } = canAddChild(n, nodes);
              const isSel = selId === n.id;
              const isFlash = flash === n.id;
              const color = BUBBLE_COLORS[n.type];

              return (
                <div key={n.id}>
                  {/* Bubble */}
                  <div
                    className="arch-bubble"
                    onClick={(e) => bClick(e, n.id)}
                    onMouseDown={(e) => bDragStart(e, n)}
                    onDoubleClick={(e) => bDbl(e, n)}
                    onContextMenu={(e) => ctxM(e, n.id)}
                    style={{
                      position: "absolute",
                      left: n.position.x,
                      top: n.position.y,
                      minWidth: 100,
                      maxWidth: 180,
                      padding: "6px 12px",
                      borderRadius: 14,
                      background: isSel ? "var(--bg-elevated)" : "var(--bg-secondary)",
                      border: "2px solid " + (isFlash ? "var(--gold)" : isSel ? color : cfrom === n.id ? "var(--gold)" : "var(--border)"),
                      color: "var(--text-primary)",
                      fontSize: 13,
                      cursor: cmode ? "crosshair" : "grab",
                      zIndex: isSel ? 10 : 1,
                      boxShadow: isSel ? "0 0 16px " + color + "40" : isFlash ? "0 0 20px var(--gold-glow)" : "none",
                      userSelect: "none",
                      overflow: "hidden",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {editing === n.id ? (
                      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <input className="input-field" value={editL} onChange={(e) => setEditL(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doSave(); if (e.key === "Escape") setEditing(null); }} autoFocus style={{ fontSize: 13, padding: "4px 8px" }} />
                        <input className="input-field" value={editN} onChange={(e) => setEditN(e.target.value)} placeholder="备注" style={{ fontSize: 11, padding: "3px 6px" }} />
                        <button className="btn-primary" onClick={doSave} style={{ fontSize: 11, padding: "3px 8px", minHeight: 28 }}>
                          保存
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</span>
                          {n.priority && (
                            <span style={{ fontSize: 9, color: PRIORITY_COLORS[n.priority], marginLeft: "auto" }}>
                              {PRIORITY_LABELS[n.priority]}
                            </span>
                          )}
                        </div>
                        {n.notes && (
                          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.notes}
                          </div>
                        )}
                        {n.reviewStatus && (
                          <span style={{ position: "absolute", top: -4, right: -4, fontSize: 8, color: n.reviewStatus === "red" ? "var(--error)" : "var(--warning)" }}>
                            ●
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* [+] add child button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); addCh(n.id); }}
                    title={!allowed ? reason : "添加子节点"}
                    style={{
                      position: "absolute",
                      left: n.position.x + 170,
                      top: n.position.y + 24,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: allowed ? "var(--gold)" : "#444",
                      color: allowed ? "var(--text-inverse)" : "#888",
                      border: "none",
                      cursor: allowed ? "pointer" : "not-allowed",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 5,
                      opacity: 0.7,
                    }}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>

          {/* Skip */}
          <button onClick={() => router.push("/write")} style={{ position: "absolute", bottom: 20, right: 20, background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer", zIndex: 5 }}>
            跳过 → 直接写作
          </button>

          {/* Review panel */}
          {review && (
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20, width: 240, maxHeight: 320, overflow: "auto", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>审查</span>
                <button onClick={() => setReview(null)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: review.score >= 70 ? "var(--success)" : "var(--warning)", marginBottom: 10 }}>{review.score}/100</div>
              {review.issues.map((issue, i) => (
                <div key={i} style={{ padding: "5px 0", borderTop: "1px solid var(--border-light)", fontSize: 11, color: "var(--text-secondary)" }}>
                  <span style={{ color: issue.severity === "red" ? "var(--error)" : "var(--warning)", fontWeight: 600 }}>
                    {issue.severity === "red" ? "🔴" : "🟡"}
                  </span>{" "}
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Edge relation picker */}
          {epick && (
            <div style={{ position: "absolute", left: epick.x - cx - 50, top: epick.y - 60, zIndex: 30, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, display: "flex", gap: 2, flexWrap: "wrap", width: 200 }}>
              {(Object.keys(EDGE_LABELS) as EdgeRelation[]).map((r) => (
                <button key={r} onClick={() => relPick(epick.edgeId, r)} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}>
                  {EDGE_LABELS[r]}
                </button>
              ))}
            </div>
          )}

          {/* Context menu */}
          {ctx && (
            <div style={{ position: "absolute", left: ctx.x - cx - 50, top: ctx.y - 60, zIndex: 30, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, minWidth: 140, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              {["high", "medium", "low"].map((p) => (
                <div
                  key={p}
                  onClick={() => {
                    updateNode(ctx.nodeId, { priority: p as "high" | "medium" | "low" });
                    setCtx(null);
                  }}
                  style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", borderRadius: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {PRIORITY_LABELS[p as "high" | "medium" | "low"]}优先级
                </div>
              ))}
              <div
                onClick={() => {
                  removeNode(ctx.nodeId);
                  setCtx(null);
                }}
                style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--error)", borderRadius: 4, borderTop: "1px solid var(--border-light)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tertiary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                删除节点
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Genre confirm */}
      {gconfirm && <GenreConfirmCard genres={gconfirm.genres} onSelect={pickG} onDismiss={() => setGconfirm(null)} />}

      {/* Template modal */}
      {tpl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setTpl(false)}>
          <div style={{ width: 480, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "var(--gold)", fontSize: 16, marginBottom: 16 }}>模板</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([
                ["argumentative", "📝 议论文"],
                ["narrative", "📖 记叙文"],
                ["expository", "📋 说明文"],
                ["essay", "🌸 散文"],
                ["report", "📊 报告"],
              ] as [string, string][]).map(([k, v]) => (
                <button key={k} className="btn-secondary" onClick={() => loadTpl(k)} style={{ textAlign: "left", padding: 12, fontSize: 13 }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
