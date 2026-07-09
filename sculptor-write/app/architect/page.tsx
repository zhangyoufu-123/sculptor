"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOutlineEditor } from "@/hooks/useOutlineEditor";
import { useArchitectAutocomplete } from "@/hooks/useArchitectAutocomplete";
import OutlineEditor from "@/components/architect/OutlineEditor";
import VisualPanel from "@/components/architect/VisualPanel";
import ChatPanel from "@/components/architect/ChatPanel";
import GenreConfirmCard from "@/components/architect/GenreConfirmCard";
import ThemeSwitcher from "@/components/shared/ThemeSwitcher";
import { saveArchitecture, loadArchitecture } from "@/lib/local-store";
import type { ArchNode, NodeType } from "@/types/architect";

interface ChatMsg {
  id: string; role: "user" | "assistant"; content: string;
  type?: string; options?: { label: string; value: string }[];
  suggestionNodes?: ArchNode[]; suggestionEdges?: { id: string; from: string; to: string; relation: string }[];
  suggestion?: { type: string; message: string; node_id?: string; auto_fix_available?: boolean };
  suggestionDismissed?: boolean;
  clarified?: boolean; // v5.2: ClarifyCard already answered
}

interface GenreOption {
  name: string; description: string; icon: string;
}

export default function ArchitectPage() {
  const router = useRouter();

  const savedArch = typeof window !== "undefined" ? loadArchitecture() : null;
  const editor = useOutlineEditor(savedArch?.nodes || []);
  const { state } = editor;

  useEffect(() => {
    if (state.nodes.length > 0) saveArchitecture(state.nodes);
  }, [state.nodes]);

  useEffect(() => {
    if (savedArch?.nodes?.length) setShowInput(false);
  }, []);

  const ac = useArchitectAutocomplete();
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");

  const [genreConfirm, setGenreConfirm] = useState<{
    genres: GenreOption[]; userInput: string; loading: boolean;
  } | null>(null);

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [cload, setCload] = useState(false);
  const [copen, setCopen] = useState(true);
  const [showInput, setShowInput] = useState(true);
  const [initInput, setInitInput] = useState("");
  const snapsRef = useRef<{ nodes: ArchNode[]; id: string }[]>([]);

  // v5.1: Progress tracking for architecture generation
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [progressStage, setProgressStage] = useState("");

  const sendChat = async (text: string) => {
    const um: ChatMsg = { id: "u" + Date.now(), role: "user", content: text };
    const nm = [...msgs, um];
    setMsgs(nm);
    setCload(true);
    snapsRef.current.push({ nodes: [...state.nodes], id: um.id });

    try {
      const r = await fetch("/api/architect/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: nm.map((m) => ({ role: m.role, content: m.content })),
          currentArchitecture: { nodes: state.nodes.map((n) => ({ id: n.id, type: n.type, label: n.title, position: { x: 0, y: 0 }, children: n.children })), edges: [] },
          selectedNodeId: state.focusId,
        }),
      });

      if (r.ok && r.body) {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let pendingNodes: ArchNode[] | null = null;
        const incNodes: ArchNode[] = []; // v5.1: incremental nodes for progressive rendering
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
              if (ev.type === "done") {
                if (pendingNodes) {
                  editor.replaceAll(pendingNodes);
                  editor.flashNodes(pendingNodes.map((n) => n.id));
                  pendingNodes = null;
                }
                break;
              }
              // v5.1: Progress events
              if (ev.type === "progress") {
                setProgressStage(ev.stage || "");
                setProgressMsg(ev.message || "");
                setProgressPct(ev.progress || 0);
                continue;
              }
              // v5.2: Incremental node events — derive parent from children
              if (ev.type === "node" && ev.node) {
                const ln = ev.node;
                const archNode: ArchNode = {
                  id: ln.id, type: (ln.type as NodeType) || "argument",
                  title: ln.label || "未命名", summary: ln.notes,
                  writingTip: ln.writingTip || undefined,
                  parent: null, children: ln.children || [],
                  order: incNodes.length, isExpanded: true,
                };
                // Find existing parent for this node among incNodes
                for (const existing of incNodes) {
                  if (existing.children.includes(ln.id)) {
                    archNode.parent = existing.id;
                    break;
                  }
                }
                incNodes.push(archNode);
                // Also derive parent of existing nodes that are children of this new node
                for (const existing of incNodes) {
                  if (ln.children?.includes(existing.id) && !existing.parent) {
                    existing.parent = ln.id;
                  }
                }
                // Incrementally update the editor
                editor.replaceAll([...incNodes]);
                continue;
              }
              const am: ChatMsg = { id: "a" + Date.now() + Math.random().toString(36).slice(2, 6), role: "assistant", content: ev.message || "", type: ev.type, options: ev.options };
              if (ev.suggestion) am.suggestion = ev.suggestion;
              if (ev.type === "confirmation" && ev.nodes) {
                // v5.2: Derive parent from children arrays, NOT from edges
                // Edges represent sequential flow; children represent tree hierarchy
                pendingNodes = ev.nodes.map((ln: { id: string; type: string; label: string; children: string[]; notes?: string; writingTip?: string }, i: number) => {
                  return { id: ln.id, type: (ln.type as NodeType) || "argument", title: ln.label || "未命名", summary: ln.notes, writingTip: ln.writingTip, parent: null, children: ln.children || [], order: i, isExpanded: true };
                });
                // Set parent from children relationships
                for (const node of pendingNodes) {
                  for (const childId of node.children) {
                    const child = pendingNodes.find((n) => n.id === childId);
                    if (child && !child.parent) child.parent = node.id;
                  }
                }
              }
              if (ev.type === "suggestion" && ev.nodes) {
                am.suggestionNodes = ev.nodes.map((ln: { id: string; type: string; label: string; children: string[]; notes?: string }, i: number) => {
                  return { id: ln.id, type: (ln.type as NodeType) || "argument", title: ln.label || "未命名", summary: ln.notes, parent: null, children: ln.children || [], order: i, isExpanded: true };
                });
                // Set parent from children for suggestion nodes too
                if (am.suggestionNodes) {
                  for (const node of am.suggestionNodes) {
                    for (const childId of node.children) {
                      const child = am.suggestionNodes.find((n) => n.id === childId);
                      if (child && !child.parent) child.parent = node.id;
                    }
                  }
                }
              }
              setMsgs((p) => [...p, am]);
            } catch { /* skip */ }
          }
        }
      }
    } catch { /* silent */ }
    setCload(false);
  };

  const rollback = (mid: string) => {
    const snap = snapsRef.current.find((s) => s.id === mid);
    if (snap) editor.replaceAll(snap.nodes);
  };

  const acceptSug = (sn: ArchNode[], _se: unknown[]) => {
    editor.replaceAll(sn);
    editor.flashNodes(sn.map((n) => n.id));
  };

  const doAutoFix = async (msgId: string, suggestion: ChatMsg["suggestion"]) => {
    if (!suggestion?.node_id || !suggestion?.type) return;
    setMsgs((prev) => prev.map((m) => m.id === msgId ? { ...m, suggestionDismissed: true } : m));
    setCload(true);
    try {
      const r = await fetch("/api/architect/auto-fix", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType: suggestion.type, nodeId: suggestion.node_id, currentArchitecture: { nodes: state.nodes.map((n) => ({ id: n.id, type: n.type, label: n.title, position: { x: 0, y: 0 }, children: n.children })), edges: [] } }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.new_nodes?.length) {
          const newNodes = [...state.nodes];
          for (const nn of d.new_nodes) {
            newNodes.push({ id: nn.id, type: (nn.type as NodeType) || "evidence", title: nn.label || "新节点", parent: d.new_edges?.[0]?.from || null, children: [], order: newNodes.length, isExpanded: true });
          }
          editor.replaceAll(newNodes);
          setMsgs((prev) => [...prev, { id: "a" + Date.now(), role: "assistant", content: d.message || "修复完成", type: "confirmation" }]);
        }
      }
    } catch { /* */ }
    setCload(false);
  };

  const doInit = async (text?: string) => {
    const m = (text || initInput).trim();
    if (!m) return;
    setShowInput(false);
    setGenreConfirm({ genres: [], userInput: m, loading: true });
    try {
      const r = await fetch("/api/architect/confirm-genre", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: m }),
      });
      if (r.ok) {
        const d = await r.json();
        setGenreConfirm({ genres: d.genres || [], userInput: m, loading: false });
      } else {
        setGenreConfirm(null);
        sendChat(m);
      }
    } catch {
      setGenreConfirm(null);
      sendChat(m);
    }
  };

  const onGenreSelect = (genre: string) => {
    const input = genreConfirm?.userInput || "";
    setGenreConfirm(null);
    sendChat(`[文体：${genre}] ${input}`);
  };

  const hasNodes = state.nodes.length > 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", fontFamily: "var(--font-ui)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>Sculptor Architect</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeSwitcher />
          <button className="btn-primary" onClick={() => router.push("/write")} disabled={!hasNodes} style={{ fontSize: 13, padding: "8px 20px", minHeight: 36 }}>开始写作</button>
        </div>
      </div>

      {/* v5.1: Progress bar for architecture generation */}
      {progressStage && (
        <div style={{
          height: 3, background: "var(--bg-tertiary)",
          borderBottom: "1px solid var(--border-light)",
          position: "relative", zIndex: 5,
        }}>
          <div style={{
            height: "100%",
            background: `linear-gradient(90deg, var(--gold), var(--color-accent-warm))`,
            width: `${Math.max(progressPct, 2)}%`,
            transition: "width 0.3s ease",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>
      )}
      {progressMsg && (
        <div style={{
          padding: "4px 16px", fontSize: 12, color: "var(--text-tertiary)",
          background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: "var(--gold)", animation: "highlight-pulse 1.5s infinite",
          }} />
          {progressMsg}
          {progressPct > 0 && progressPct < 100 && (
            <span style={{ marginLeft: "auto", opacity: 0.6 }}>{progressPct}%</span>
          )}
        </div>
      )}

      {showInput && !hasNodes && !genreConfirm && (
        <div style={{ position: "absolute", inset: 0, top: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, background: "var(--bg-primary)" }}>
          <h2 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>你想写什么？</h2>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>描述你的写作意图，AI 会先帮你确定文体，再搭建架构</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input className="input-field" value={initInput} onChange={(e) => setInitInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doInit(); }} placeholder="例如：我想论证社交媒体对青少年的心理健康弊大于利..." style={{ width: 420, fontSize: 14, padding: "12px 16px" }} autoFocus />
            <button className="btn-primary" onClick={() => doInit()} disabled={cload || !initInput.trim()} style={{ minWidth: 80 }}>{cload ? "···" : "开始"}</button>
          </div>
          <button onClick={() => { setShowInput(false); }} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer", opacity: 0.6 }}>跳过 → 直接写作</button>
        </div>
      )}

      {genreConfirm && (
        <GenreConfirmCard genres={genreConfirm.genres} onSelect={onGenreSelect} onDismiss={() => { const input = genreConfirm.userInput; setGenreConfirm(null); sendChat(input); }} />
      )}

      {genreConfirm?.loading && (
        <div style={{ position: "absolute", inset: 0, top: 52, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "var(--bg-primary)" }}>
          <span style={{ color: "var(--text-tertiary)", fontSize: 14 }}>正在分析你的写作意图...</span>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ChatPanel messages={msgs} onSend={sendChat} onRollback={rollback} onAcceptSuggestion={acceptSug} onIgnoreSuggestion={(msgId) => { setMsgs((prev) => prev.map((m) => m.id === msgId ? { ...m, suggestionDismissed: true } : m)); }} onClarifySelect={(v: string) => { setMsgs((prev) => prev.map((m) => m.type === "clarification" ? { ...m, clarified: true } : m)); sendChat(v); }} onAutoFix={doAutoFix} loading={cload || !!genreConfirm?.loading} collapsed={!copen} onToggle={() => setCopen((c) => !c)} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
          <OutlineEditor state={state} moveFocus={editor.moveFocus} focusParent={editor.focusParent} focusChild={editor.focusChild} addNodeAfter={editor.addNodeAfter} addChildNode={editor.addChildNode}
            startEditing={(id) => { const node = state.nodes.find((n) => n.id === id); if (node) { setEditTitle(node.title); setEditSummary(node.summary || ""); } editor.startEditing(id); }}
            saveEdit={(id, title, summary) => { editor.saveEdit(id, title, summary); setEditTitle(""); setEditSummary(""); }}
            cancelEdit={() => { editor.cancelEdit(); setEditTitle(""); setEditSummary(""); }}
            removeNode={editor.removeNode} shiftNode={editor.shiftNode} indentNode={editor.indentNode} unindentNode={editor.unindentNode}
            toggleNode={editor.toggleNode} changeType={editor.changeType} doExpandAll={editor.doExpandAll} doCollapseLevel={editor.doCollapseLevel}
            setEditingId={editor.setEditingId} setFocusId={editor.setFocusId} editTitle={editTitle} editSummary={editSummary}
            onEditTitleChange={setEditTitle} onEditSummaryChange={setEditSummary}
            acVisible={ac.visible} acSuggestion={ac.firstSuggestion} acAccept={ac.accept} acDismiss={ac.dismiss} />
        </div>
        <VisualPanel nodes={state.nodes} mode={state.visualMode} onModeChange={editor.setVisualMode} onNodeClick={(id) => { editor.setFocusId(id); setTimeout(() => { document.querySelector(`[data-node-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50); }} />
      </div>
    </div>
  );
}
