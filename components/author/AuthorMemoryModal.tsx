"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sculptor-writing-rules";

interface AuthorMemoryModalProps {
  onClose: () => void;
}

export default function AuthorMemoryModal({ onClose }: AuthorMemoryModalProps) {
  const [rules, setRules] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setRules(stored);
    setLoaded(true);
  }, []);

  const handleSave = (value: string) => {
    setRules(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

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
          maxWidth: 520, width: "90%", maxHeight: "80vh", display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>写作规则</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
          像 Cursor Rules 一样，写下你的写作规则。每行一条。保存后 AI 会自动遵守。
        </div>

        {!loaded ? (
          <div style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: 24 }}>加载中...</div>
        ) : (
          <textarea
            value={rules}
            onChange={(e) => handleSave(e.target.value)}
            placeholder={`避免口语
不要使用：首先、其次、最后
不要总结
引用APA格式`}
            style={{
              width: "100%", minHeight: 240, resize: "vertical",
              background: "var(--bg-input, var(--bg-primary))",
              border: "1px solid var(--border-light)", borderRadius: 8,
              padding: 12, fontSize: 13, fontFamily: "var(--font-mono, monospace)",
              color: "var(--text-primary)", lineHeight: 1.7,
              outline: "none",
            }}
            spellCheck={false}
          />
        )}

        <div style={{ marginTop: 12, fontSize: 10, color: "var(--text-tertiary)", opacity: 0.5, textAlign: "center" }}>
          规则已自动保存到本地 · 按键 &quot;sculptor-writing-rules&quot;
        </div>
      </div>
    </div>
  );
}
