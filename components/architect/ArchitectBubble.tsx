"use client";

import { useRef, useCallback, useState } from "react";
import type { ArchitectNode } from "@/types/architect";
import { BUBBLE_COLORS } from "@/types/architect";

interface ArchitectBubbleProps {
  node: ArchitectNode;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}

export default function ArchitectBubble({ node, isSelected, onSelect, onMove }: ArchitectBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const nodeStart = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  const color = BUBBLE_COLORS[node.type];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    nodeStart.current = { x: node.position.x, y: node.position.y };
  }, [onSelect, node.position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    onMove(nodeStart.current.x + dx, nodeStart.current.y + dy);
  }, [isDragging, onMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={bubbleRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        minWidth: 100,
        maxWidth: 200,
        padding: "8px 14px",
        borderRadius: 20,
        background: "#141414",
        border: `2px solid ${isSelected ? color : "#333"}`,
        color: "#e0d8c8",
        fontSize: 13,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        zIndex: isSelected ? 10 : 1,
        boxShadow: isSelected ? `0 0 12px ${color}40` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          marginRight: 6,
          verticalAlign: "middle",
        }}
      />
      {node.label}
      {node.reviewStatus && (
        <span
          style={{
            marginLeft: 6,
            fontSize: 10,
            color: node.reviewStatus === "red" ? "#e74c3c" : node.reviewStatus === "yellow" ? "#f39c12" : "#4caf50",
          }}
        >
          {node.reviewStatus === "red" ? "●" : node.reviewStatus === "yellow" ? "●" : "●"}
        </span>
      )}
    </div>
  );
}
