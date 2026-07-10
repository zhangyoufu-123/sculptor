"use client";

import { useEffect, useState } from "react";

interface AuthorMemoryModalProps {
  onClose: () => void;
}

export default function AuthorMemoryModal({ onClose }: AuthorMemoryModalProps) {
  const [memory, setMemory] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/author/memory")
      .then((r) => r.json())
      .then((data) => {
        setMemory(data.memory || data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "var(--surface-overlay, rgba(0,0,0,0.4))",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-elevated)", borderRadius: 12,
          border: "1px solid var(--gold)", padding: 24,
          maxWidth: 480, width: "90%", maxHeight: "80vh", overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>🧠 作者记忆</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: 24 }}>加载中...</div>
        ) : memory ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <MemorySection title="偏好" items={memory.preferences as string[]} color="var(--gold)" />
            <MemorySection title="厌恶" items={memory.dislikes as string[]} color="var(--error)" />
            <MemorySection title="习惯" items={memory.habits as string[]} color="var(--color-accent-warm)" />
            {Array.isArray(memory.forbiddenExpressions) && (memory.forbiddenExpressions as string[]).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--error)", marginBottom: 4 }}>🚫 禁用表达</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(memory.forbiddenExpressions as string[]).map((e, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "rgba(224,85,85,0.1)", color: "var(--error)" }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: 24 }}>
            暂无作者记忆数据
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 10, color: "var(--text-tertiary)", opacity: 0.5, textAlign: "center" }}>
          AI 会根据你的作者记忆调整写作风格
        </div>
      </div>
    </div>
  );
}

function MemorySection({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 2 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
