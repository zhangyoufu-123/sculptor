"use client";

interface ClarifyCardProps {
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}

export default function ClarifyCard({ options, onSelect }: ClarifyCardProps) {
  return (
    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, paddingLeft: 8 }}>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onSelect(opt.value)}
          style={{
            padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-light)",
            background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 11,
            cursor: "pointer", textAlign: "left", transition: "all 0.1s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
