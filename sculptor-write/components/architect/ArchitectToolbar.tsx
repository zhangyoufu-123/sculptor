"use client";

interface ArchitectToolbarProps {
  onAddNode: (type: string) => void;
  onConnectMode: () => void;
  onDelete: () => void;
  onAIPanel: () => void;
  onAIExpand: () => void;
  onReview: () => void;
  onTemplates: () => void;
  onImport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  connectMode: boolean;
  canDelete: boolean;
}

export default function ArchitectToolbar({
  onAddNode, onConnectMode, onDelete, onAIPanel, onAIExpand,
  onReview, onTemplates, onImport, onZoomIn, onZoomOut, onFit,
  connectMode, canDelete,
}: ArchitectToolbarProps) {
  const btn = (label: string, icon: string, onClick: () => void, active = false, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 6, border: "none",
        background: active ? "rgba(212,168,83,0.15)" : "transparent",
        color: active ? "var(--gold)" : disabled ? "var(--text-tertiary)" : "var(--text-secondary)",
        fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-primary)"; }}}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = active ? "rgba(212,168,83,0.15)" : "transparent"; e.currentTarget.style.color = active ? "var(--gold)" : "var(--text-secondary)"; }}}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const sep = <span style={{ width: 1, height: 20, background: "var(--border-light)", margin: "0 2px" }} />;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "8px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)", flexWrap: "wrap" }}>
      {/* Node ops */}
      {btn("添加论点", "⊕", () => onAddNode("argument"))}
      {btn("添加论据", "⊞", () => onAddNode("evidence"))}
      {btn("添加案例", "◉", () => onAddNode("evidence"))}
      {btn("添加反方", "⊖", () => onAddNode("counterargument"))}
      {btn("添加意象", "✦", () => onAddNode("imagery"))}
      {sep}
      {btn("连线模式", "↗", onConnectMode, connectMode)}
      {btn("删除", "⌫", onDelete, false, !canDelete)}
      {sep}
      {/* AI */}
      {btn("AI对话", "💬", onAIPanel)}
      {btn("AI补充", "🧠", onAIExpand, false, !canDelete)}
      {btn("逻辑审查", "🔍", onReview)}
      {sep}
      {/* Templates */}
      {btn("模板库", "📋", onTemplates)}
      {btn("导入", "📂", onImport)}
      {sep}
      {/* View */}
      {btn("放大", "➕", onZoomIn)}
      {btn("缩小", "➖", onZoomOut)}
      {btn("适应", "⊡", onFit)}
    </div>
  );
}
