"use client";

const COMMANDS = [
  { label: "展开这个节点", icon: "↕" },
  { label: "换一种结构", icon: "🔄" },
  { label: "逻辑检查", icon: "🔍" },
  { label: "添加论据", icon: "➕" },
];

export default function QuickCommands({ onCommand }: { onCommand: (text: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 14px", flexWrap: "wrap" }}>
      {COMMANDS.map(c => (
        <button
          key={c.label}
          onClick={() => onCommand(c.label)}
          style={{
            padding: "3px 8px", borderRadius: 12, border: "1px solid var(--border-light)",
            background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 11,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          {c.icon} {c.label}
        </button>
      ))}
    </div>
  );
}
