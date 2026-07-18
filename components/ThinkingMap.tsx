/**
 * Thinking Map v2 — Interactive visual thinking canvas.
 *
 * Features:
 *  - Right-click context menu (confirm/challenge/branch/reconfirm)
 *  - Discussion badges on nodes (round count + colored status)
 *  - Floating toolbar (new node / start discussion)
 *  - Keyboard: Space = add node, Cmd+Enter = confirm, Cmd+Shift+C = challenge
 *  - Double-click node → focus discussion
 */

"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import ReactFlow, {
  Node, Edge, addEdge, Connection,
  useNodesState, useEdgesState,
  Controls, Background, MiniMap,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { useStore } from "@/lib/store";
import { useCanvasStore, type DiscussionThread } from "@/lib/canvasStore";

// ── Colors ──

const C = {
  gold: "#c9a95c",
  blue: "#63b3ed",
  green: "#68d391",
  orange: "#f59e0b",
  red: "#ef6f6c",
  bg: "var(--bg-primary, #0a0a0a)",
  panel: "var(--surface-panel, #1a1a1a)",
  border: "var(--border-subtle, #333)",
  text: "#ccc",
  textDim: "#888",
};

const NODE_COLORS: Record<string, { bg: string; border: string }> = {
  proposition: { bg: "rgba(201,169,92,0.12)", border: C.gold },
  assumption: { bg: "rgba(99,179,237,0.1)", border: C.blue },
  evidence: { bg: "rgba(104,211,145,0.1)", border: C.green },
  question: { bg: "rgba(245,159,11,0.1)", border: C.orange },
  position: { bg: "rgba(239,111,108,0.1)", border: C.red },
};

const STATUS_COLORS: Record<DiscussionThread["status"], string> = {
  pending: C.orange,
  confirmed: C.green,
  challenged: C.red,
  branched: C.blue,
};

// ── Custom Node with Discussion Badge ──

type ThoughtNodeData = {
  label: string;
  type: string;
  confidence?: number;
  discussionRounds?: number;
  discussionStatus?: DiscussionThread["status"];
};

function ThoughtNode({ data, selected }: NodeProps<ThoughtNodeData>) {
  const colors = NODE_COLORS[data.type] || NODE_COLORS.proposition;
  const statusColor = data.discussionStatus
    ? STATUS_COLORS[data.discussionStatus]
    : C.orange;

  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${selected ? colors.border : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12.5,
        color: C.text,
        fontFamily: "var(--font-ui, system-ui)",
        minWidth: 100,
        maxWidth: 200,
        cursor: "pointer",
        transition: "border 0.2s, box-shadow 0.2s",
        position: "relative",
        boxShadow: selected ? `0 0 12px ${colors.border}33` : "none",
      }}
    >
      {/* Type label */}
      <div
        style={{
          fontSize: 9.5,
          color: colors.border,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
          opacity: 0.8,
        }}
      >
        {data.type}
      </div>

      {/* Label */}
      <div style={{ lineHeight: 1.5, wordBreak: "break-word" }}>
        {data.label}
      </div>

      {/* Confidence bar */}
      {data.confidence !== undefined && (
        <div style={{ marginTop: 6, height: 3, background: "#2a2a2a", borderRadius: 2 }}>
          <div
            style={{
              width: `${data.confidence * 100}%`,
              height: "100%",
              background: colors.border,
              borderRadius: 2,
              transition: "width 0.5s",
            }}
          />
        </div>
      )}

      {/* Discussion badge */}
      {data.discussionRounds !== undefined && data.discussionRounds > 0 && (
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: statusColor,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 8px ${statusColor}44`,
          }}
        >
          {data.discussionRounds}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { thoughtNode: ThoughtNode };

// ── Initial Layout ──

function createInitialNodes(anchor: string): Node<ThoughtNodeData>[] {
  return [
    {
      id: "center",
      type: "thoughtNode",
      position: { x: 0, y: 0 },
      data: { label: anchor || "核心命题", type: "proposition", confidence: 0.7, discussionRounds: 0, discussionStatus: "pending" },
    },
  ];
}

function createInitialEdges(): Edge[] {
  return [];
}

// ── Context Menu Component ──

function ContextMenu({
  x, y, nodeId, onClose,
}: {
  x: number; y: number; nodeId: string; onClose: () => void;
}) {
  const { updateDiscussionStatus, addDiscussionRound, nodes: storeNodes } = useCanvasStore();
  const { proposition } = useStore();

  const triggerCLI = async (action: string) => {
    const node = storeNodes.find((n) => n.id === nodeId);
    const label = node?.label || proposition;
    updateDiscussionStatus(nodeId, action === "confirm" ? "confirmed" : action === "challenge" ? "challenged" : "branched");
    addDiscussionRound(nodeId, {
      direction: action as any,
      question: `[${{confirm:"确认","challenge":"挑战","branch":"分支"}[action] || action}] ${label}`,
      answer: "",
      timestamp: Date.now(),
    });

    // Call Runtime API
    try {
      await fetch("/api/discover/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: label,
          thinking: [label],
          ideas: [],
          history: [
            { role: "user", content: `${{confirm:"确认这个方向，继续深入","challenge":"反驳这个观点，寻找反例","branch":"从这个方向分支出新的讨论"}[action]}` },
          ],
        }),
      });
    } catch { /* silent */ }
    onClose();
  };

  const items = [
    { id: "confirm", label: "确认此方向", action: () => triggerCLI("confirm"), color: C.green },
    { id: "challenge", label: "反驳 / 挑战", action: () => triggerCLI("challenge"), color: C.red },
    { id: "reconfirm", label: "再次确认", action: () => triggerCLI("confirm"), color: C.green },
    { id: "branch", label: "分支讨论", action: () => triggerCLI("branch"), color: C.blue },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 1000,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "6px 0",
        minWidth: 160,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <div
          key={i}
          onClick={item.action}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            color: C.text,
            cursor: "pointer",
            fontFamily: "var(--font-ui, system-ui)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: "50%", background: item.color,
              display: "inline-block", flexShrink: 0,
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──

export default function ThinkingMap({ anchor = "", onSwitchToChat }: { anchor?: string; onSwitchToChat?: () => void }) {
  const { proposition } = useStore();
  const {
    nodes: storeNodes, addNode, discussions,
    contextMenu, showContextMenu, hideContextMenu, selectNode,
  } = useCanvasStore();

  const displayAnchor = anchor || proposition || "输入你的命题";

  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes(displayAnchor));
  const [edges, setEdges, onEdgesChange] = useEdgesState(createInitialEdges());
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Sync center node label
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === "center"
          ? { ...n, data: { ...n.data, label: displayAnchor } }
          : n
      )
    );
  }, [displayAnchor, setNodes]);

  // Sync discussion data to node badges
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const d = discussions[n.id];
        return {
          ...n,
          data: {
            ...n.data,
            discussionRounds: d?.rounds.length || 0,
            discussionStatus: d?.status || "pending",
          },
        };
      })
    );
  }, [discussions, setNodes]);

  // Click outside → close context menu
  const onPaneClick = useCallback(() => {
    hideContextMenu();
    selectNode(null);
  }, [hideContextMenu, selectNode]);

  // Node click → select
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      selectNode(node.id);
      hideContextMenu();
    },
    [selectNode, hideContextMenu]
  );

  // Node right-click → context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY, node.id);
    },
    [showContextMenu]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Space → add node at center
      if (e.key === " " && !e.metaKey && !e.ctrlKey && document.activeElement === document.body) {
        e.preventDefault();
        const id = `node-${Date.now()}`;
        addNode({ id, label: "新想法", type: "assumption", x: 0, y: 200, confidence: 0.5 });
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: "thoughtNode",
            position: { x: Math.random() * 200 - 100, y: 150 + Math.random() * 100 },
            data: { label: "新想法", type: "assumption", confidence: 0.3, discussionRounds: 0, discussionStatus: "pending" },
          },
        ]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [addNode, setNodes]);

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%", background: C.bg, position: "relative" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultViewport={{ x: 50, y: 100, zoom: 0.9 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background color="#1a1a1a" gap={24} />
        <Controls
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            bottom: 80,
          }}
        />
        <MiniMap
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            bottom: 80,
          }}
          nodeColor={(n) => {
            const data = n.data as ThoughtNodeData | undefined;
            if (!data) return "#555";
            return NODE_COLORS[data.type]?.border || "#555";
          }}
        />
      </ReactFlow>

      {/* Floating toolbar */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: "6px 8px",
          display: "flex",
          gap: 6,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          zIndex: 50,
        }}
      >
        <button
          onClick={() => {
            const id = `node-${Date.now()}`;
            addNode({ id, label: "新想法", type: "assumption", x: 0, y: 200, confidence: 0.5 });
            setNodes((nds) => [
              ...nds,
              {
                id,
                type: "thoughtNode",
                position: { x: Math.random() * 200 - 100, y: 150 + Math.random() * 100 },
                data: { label: "新想法", type: "assumption", confidence: 0.3, discussionRounds: 0, discussionStatus: "pending" },
              },
            ]);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: C.text,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-ui, system-ui)",
            padding: "8px 14px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize: 16 }}>+</span> 新节点
        </button>
        <div style={{ width: 1, background: C.border, margin: "4px 0" }} />
        <button
          onClick={onSwitchToChat}
          style={{
            background: "transparent",
            border: "none",
            color: C.textDim,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            padding: "8px 14px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize: 14 }}>💬</span> 切换讨论
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={hideContextMenu}
        />
      )}

      {/* Keyboard hints */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 16,
          fontSize: 10,
          color: C.textDim,
          fontFamily: "var(--font-ui)",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      >
        Space 添加节点 · 右键节点打开菜单 · 拖拽移动
      </div>
    </div>
  );
}
