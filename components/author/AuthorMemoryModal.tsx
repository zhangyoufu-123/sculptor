"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sculptor-thinking-memory";

interface AuthorMemoryModalProps {
  onClose: () => void;
}

export default function AuthorMemoryModal({ onClose }: AuthorMemoryModalProps) {
  const [rules, setRules] = useState("");
  const [patterns, setPatterns] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.rules === "string") setRules(parsed.rules);
        if (typeof parsed.patterns === "string") setPatterns(parsed.patterns);
      } catch {
        // legacy: plain string → treat as rules
        setRules(stored);
      }
    }
    setLoaded(true);
  }, []);

  const handleSaveRules = (value: string) => {
    setRules(value);
    const data = JSON.stringify({ rules: value, patterns });
    localStorage.setItem(STORAGE_KEY, data);
  };

  const handleSavePatterns = (value: string) => {
    setPatterns(value);
    const data = JSON.stringify({ rules, patterns: value });
    localStorage.setItem(STORAGE_KEY, data);
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
          flexDirection: "column", overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>思维偏好</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 16 }}>
          像 Cursor Rules 一样，写下你的写作规则和思考特点。每行一条。保存后 AI 会自动遵守。
        </div>

        {!loaded ? (
          <div style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: 24 }}>加载中...</div>
        ) : (
          <>
            {/* 写作规则 */}
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
              写作规则
            </label>
            <textarea
              value={rules}
              onChange={(e) => handleSaveRules(e.target.value)}
              placeholder={`避免口语
不要使用：首先、其次、最后
不要总结
引用APA格式`}
              style={{
                width: "100%", minHeight: 140, resize: "vertical",
                background: "var(--bg-input, var(--bg-primary))",
                border: "1px solid var(--border-light)", borderRadius: 8,
                padding: 12, fontSize: 13, fontFamily: "var(--font-mono, monospace)",
                color: "var(--text-primary)", lineHeight: 1.7,
                outline: "none",
              }}
              spellCheck={false}
            />

            {/* 思考特点 */}
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginTop: 16, marginBottom: 6, display: "block" }}>
              思考特点
            </label>
            <textarea
              value={patterns}
              onChange={(e) => handleSavePatterns(e.target.value)}
              placeholder={`例如：
喜欢先提出问题
喜欢用案例论证
避免绝对结论
经常引用历史
喜欢递进论证`}
              style={{
                width: "100%", minHeight: 140, resize: "vertical",
                background: "var(--bg-input, var(--bg-primary))",
                border: "1px solid var(--border-light)", borderRadius: 8,
                padding: 12, fontSize: 13, fontFamily: "var(--font-mono, monospace)",
                color: "var(--text-primary)", lineHeight: 1.7,
                outline: "none",
              }}
              spellCheck={false}
            />
          </>
        )}

        <div style={{ marginTop: 12, fontSize: 10, color: "var(--text-tertiary)", opacity: 0.5, textAlign: "center" }}>
          偏好已自动保存到本地 · 按键 &quot;sculptor-thinking-memory&quot;
        </div>
      </div>
    </div>
  );
}
