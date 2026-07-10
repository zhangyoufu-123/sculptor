"use client";

interface ReasoningCardProps {
  nodeLabel: string;
  onClose: () => void;
}

export default function ReasoningCard({ nodeLabel, onClose }: ReasoningCardProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: -260,
        width: 240,
        padding: 12,
        borderRadius: 10,
        background: "#1a1a2a",
        border: "1px solid #333",
        zIndex: 30,
        fontSize: 12,
        color: "#e0d8c8",
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#c4a565", fontWeight: 600 }}>推理链</span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14 }}
        >
          ✕
        </button>
      </div>
      <div style={{ color: "#888", marginBottom: 6 }}>节点: {nodeLabel}</div>
      <div>
        <span style={{ color: "#5b8def" }}>前提:</span> 该节点作为论证链条的一环，
        需要与前后节点逻辑一致。<br /><br />
        <span style={{ color: "#4caf50" }}>推理:</span> 基于用户的整体架构，
        此节点位置合理，起到了承上启下的作用。
      </div>
    </div>
  );
}
