"use client";

interface GenreOption {
  name: string;
  description: string;
  icon: string;
}

interface GenreConfirmCardProps {
  genres: GenreOption[];
  onSelect: (genre: string) => void;
  onDismiss: () => void;
}

export default function GenreConfirmCard({ genres, onSelect, onDismiss }: GenreConfirmCardProps) {
  if (genres.length === 0) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onDismiss}>
      <div style={{
        width: 420, background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: 14, padding: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: "var(--gold)", fontSize: 16, marginBottom: 6 }}>选择文体</h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginBottom: 16 }}>你想用哪种文体来写？</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {genres.map((g, i) => (
            <button
              key={i}
              onClick={() => onSelect(g.name)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10,
                border: "1px solid var(--border-light)", background: "var(--bg-tertiary)",
                color: "var(--text-primary)", cursor: "pointer", textAlign: "left",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-light)"}
            >
              <span style={{ fontSize: 24 }}>{g.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{g.description}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onDismiss}
          style={{
            marginTop: 14, width: "100%", padding: 8,
            background: "none", border: "none", color: "var(--text-tertiary)",
            cursor: "pointer", fontSize: 12,
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}
