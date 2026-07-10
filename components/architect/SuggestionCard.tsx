"use client";

export default function SuggestionCard({ nodeCount, onAccept, onIgnore }: {
  nodeCount: number;
  onAccept: () => void;
  onIgnore: () => void;
}) {
  return (
    <div style={{
      marginTop: 6, padding: "8px 10px", borderRadius: 8,
      background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.2)",
    }}>
      <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
        AI 建议添加 {nodeCount} 个节点
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onAccept} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--success)", color: "#fff", fontSize: 11, cursor: "pointer" }}>采纳</button>
        <button onClick={onIgnore} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}>忽略</button>
      </div>
    </div>
  );
}
