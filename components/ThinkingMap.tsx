/**
 * Thinking Map — React Flow canvas for visual thinking.
 *
 * Nodes represent: assumptions, evidence, questions, positions.
 * Edges represent: supports, challenges, refines, contradicts.
 * Interactions: click to focus, drag to rearrange, right-click for commands.
 */

"use client";

import { useCallback, useState, useMemo } from "react";
import ReactFlow, {
  Node, Edge, addEdge, Connection,
  useNodesState, useEdgesState,
  Controls, Background, MiniMap,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { useStore } from "@/lib/store";

// ── Node Types ──

type ThoughtNodeData = {
  label: string;
  type: "proposition" | "assumption" | "evidence" | "question" | "position";
  confidence?: number;
};

const NODE_COLORS: Record<ThoughtNodeData["type"], { bg: string; border: string }> = {
  proposition: { bg: "rgba(201,169,92,0.15)", border: "#c9a95c" },
  assumption: { bg: "rgba(99,179,237,0.12)", border: "#63b3ed" },
  evidence: { bg: "rgba(104,211,145,0.12)", border: "#68d391" },
  question: { bg: "rgba(245,159,11,0.12)", border: "#f59e0b" },
  position: { bg: "rgba(239,111,108,0.12)", border: "#ef6f6c" },
};

function ThoughtNode({ data, selected }: NodeProps<ThoughtNodeData>) {
  const colors = NODE_COLORS[data.type] || NODE_COLORS.proposition;
  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${selected ? colors.border : "rgba(255,255,255,0.1)"}`,
        borderRadius: 8,
        padding: "10px 16px",
        fontSize: 13,
        color: "#eee",
        fontFamily: "var(--font-ui, system-ui)",
        minWidth: 120,
        maxWidth: 220,
        cursor: "pointer",
        transition: "border 0.2s",
      }}
    >
      <div style={{ fontSize: 10, color: "#999", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {data.type}
      </div>
      <div style={{ lineHeight: 1.4 }}>{data.label}</div>
      {data.confidence !== undefined && (
        <div style={{ marginTop: 6, height: 3, background: "#333", borderRadius: 2 }}>
          <div style={{ width: `${data.confidence * 100}%`, height: "100%", background: colors.border, borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}

const nodeTypes = { thoughtNode: ThoughtNode };

// ── Initial Layout ──

function createInitialNodes(text: string): Node<ThoughtNodeData>[] {
  return [
    {
      id: "center",
      type: "thoughtNode",
      position: { x: 0, y: 0 },
      data: { label: text || "核心命题", type: "proposition", confidence: 0.7 },
    },
    {
      id: "q1",
      type: "thoughtNode",
      position: { x: -250, y: -120 },
      data: { label: "为什么是这个问题？", type: "question" },
    },
    {
      id: "q2",
      type: "thoughtNode",
      position: { x: 250, y: -120 },
      data: { label: "这个问题属于哪个领域？", type: "question" },
    },
    {
      id: "a1",
      type: "thoughtNode",
      position: { x: -200, y: 120 },
      data: { label: "等待讨论...", type: "assumption", confidence: 0.3 },
    },
    {
      id: "a2",
      type: "thoughtNode",
      position: { x: 200, y: 120 },
      data: { label: "等待讨论...", type: "assumption", confidence: 0.3 },
    },
  ];
}

function createInitialEdges(): Edge[] {
  return [
    { id: "e-center-q1", source: "center", target: "q1", animated: true, style: { stroke: "#555" } },
    { id: "e-center-q2", source: "center", target: "q2", animated: true, style: { stroke: "#555" } },
    { id: "e-q1-a1", source: "q1", target: "a1", style: { stroke: "#444" } },
    { id: "e-q2-a2", source: "q2", target: "a2", style: { stroke: "#444" } },
  ];
}

// ── Component ──

export default function ThinkingMap({ anchor = "" }: { anchor?: string }) {
  const { proposition, assumptions } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes(anchor || proposition));
  const [edges, setEdges, onEdgesChange] = useEdgesState(createInitialEdges());

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // When anchor changes, reset the center node
  const displayAnchor = anchor || proposition || "输入你的命题";
  const centerNode = nodes.find((n) => n.id === "center");
  if (centerNode && centerNode.data.label !== displayAnchor) {
    centerNode.data.label = displayAnchor;
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg-primary, #0a0a0a)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultViewport={{ x: 50, y: 150, zoom: 0.9 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222" gap={20} />
        <Controls
          style={{
            background: "var(--surface-panel, #1a1a1a)",
            border: "1px solid var(--border-subtle, #333)",
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: "var(--surface-panel, #1a1a1a)",
            border: "1px solid var(--border-subtle, #333)",
            borderRadius: 8,
          }}
          nodeColor={(n) => {
            const data = n.data as ThoughtNodeData | undefined;
            if (!data) return "#555";
            return NODE_COLORS[data.type]?.border || "#555";
          }}
        />
      </ReactFlow>
    </div>
  );
}
