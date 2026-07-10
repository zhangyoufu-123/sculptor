"use client";

import { useCallback, useRef, useState } from "react";
import { useArchitectStore } from "@/store/architect-store";
import type { ArchitectNode, ArchitectEdge, BubbleType } from "@/types/architect";
import { BUBBLE_COLORS, BUBBLE_LABELS } from "@/types/architect";
import ArchitectBubble from "./ArchitectBubble";
import SchemeTabs from "./SchemeTabs";
import ReviewPanel from "./ReviewPanel";

let nodeCounter = 10;

export default function ArchitectCanvas() {
  const nodes = useArchitectStore((s) => s.nodes);
  const edges = useArchitectStore((s) => s.edges);
  const addNode = useArchitectStore((s) => s.addNode);
  const updateNode = useArchitectStore((s) => s.updateNode);
  const selectedNodeId = useArchitectStore((s) => s.selectedNodeId);
  const selectNode = useArchitectStore((s) => s.selectNode);
  const setDragging = useArchitectStore((s) => s.setDragging);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.3, Math.min(2, s + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      selectNode(null);
    }
  }, [offset, selectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    const id = `n${++nodeCounter}`;
    addNode({
      id,
      label: "新节点",
      type: "argument" as BubbleType,
      position: { x, y },
      children: [],
    });
  }, [offset, scale, addNode]);

  // Draw edge lines
  const edgeLines = edges.map((edge) => {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return null;
    return (
      <line
        key={edge.id}
        x1={fromNode.position.x + 80}
        y1={fromNode.position.y + 25}
        x2={toNode.position.x + 80}
        y2={toNode.position.y + 25}
        stroke="#444"
        strokeWidth={2}
        strokeDasharray={edge.relation === "contradicts" ? "5,5" : "none"}
      />
    );
  });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <SchemeTabs />
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0a0a0a" }}>
        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{
            width: "100%",
            height: "100%",
            cursor: isPanning ? "grabbing" : "grab",
            position: "relative",
          }}
        >
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
              {edgeLines}
            </g>
          </svg>

          <div
            style={{
              transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              position: "absolute",
            }}
          >
            {nodes.map((node) => (
              <ArchitectBubble
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => selectNode(node.id)}
                onMove={(x, y) => updateNode(node.id, { position: { x, y } })}
              />
            ))}
          </div>
        </div>

        <ReviewPanel />
      </div>
    </div>
  );
}
