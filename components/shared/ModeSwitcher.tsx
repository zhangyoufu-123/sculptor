"use client";

type WritingMode = "human-led" | "ai-led" | "adversarial";

interface ModeSwitcherProps {
  mode: WritingMode;
  onChange: (mode: WritingMode) => void;
}

const MODES: { id: WritingMode; label: string; desc: string }[] = [
  { id: "human-led", label: "人写", desc: "你主导写作" },
  { id: "ai-led", label: "AI写", desc: "AI辅助创作" },
  { id: "adversarial", label: "对抗", desc: "AI质疑你的观点" },
];

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div style={{ display: "flex", gap: 2, background: "#1a1a1a", borderRadius: 8, padding: 2 }}>
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          title={m.desc}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "none",
            background: mode === m.id ? "#c4a565" : "transparent",
            color: mode === m.id ? "#0d0d0d" : "#888",
            fontSize: 11,
            fontWeight: mode === m.id ? 700 : 400,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
