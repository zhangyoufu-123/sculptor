"use client";

import { useEffect, useState } from "react";

interface ReflectionData {
  questionEvolution: string;
  patterns: string[];
  stats: {
    wordCount: number;
    sectionCount: number;
  };
}

interface ReflectionProps {
  anchor: string;
  outline: any[];
  content: string;
}

export default function Reflection({ anchor, outline, content }: ReflectionProps) {
  const [data, setData] = useState<ReflectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchReflection() {
      try {
        setLoading(true);
        const res = await fetch("/api/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anchor, outline, content }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "请求失败" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json.reflection);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "未知错误");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReflection();
    return () => { cancelled = true; };
  }, [anchor, outline, content]);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-elevated)",
    borderRadius: 12,
    border: "1px solid var(--border-light)",
    padding: 24,
    maxWidth: 640,
    width: "100%",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--gold, #c9a96e)",
    marginBottom: 8,
    marginTop: 20,
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: 14,
    color: "var(--text-primary)",
    lineHeight: 1.8,
  };

  const pillContainerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  };

  const pillStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-secondary)",
    background: "var(--bg-input, var(--bg-primary))",
    border: "1px solid var(--border-light)",
    borderRadius: 20,
    padding: "6px 14px",
    lineHeight: 1.5,
  };

  const statCardStyle: React.CSSProperties = {
    display: "flex",
    gap: 24,
  };

  const statItemStyle: React.CSSProperties = {
    textAlign: "center",
    background: "var(--bg-input, var(--bg-primary))",
    borderRadius: 8,
    padding: "16px 24px",
    flex: 1,
    border: "1px solid var(--border-light)",
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--gold, #c9a96e)",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-tertiary)",
    marginTop: 4,
  };

  const buttonRowStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    marginTop: 24,
    justifyContent: "center",
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: "10px 24px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    background: "var(--gold, #c9a96e)",
    color: "var(--bg-primary, #fff)",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 24px",
    borderRadius: 8,
    border: "1px solid var(--border-light)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    background: "transparent",
    color: "var(--text-secondary)",
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
        回望
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
        你的思维路径回顾
      </div>

      {loading && (
        <div style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: 32 }}>
          正在回望你的思考过程...
        </div>
      )}

      {error && (
        <div style={{ color: "var(--text-error, #e74c3c)", fontSize: 13, textAlign: "center", padding: 16 }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* 问题演变 */}
          <div style={sectionTitleStyle}>问题演变</div>
          <div style={bodyStyle}>{data.questionEvolution}</div>

          {/* 思维模式 */}
          <div style={sectionTitleStyle}>思维模式</div>
          <div style={pillContainerStyle}>
            {data.patterns.map((p, i) => (
              <span key={i} style={pillStyle}>{p}</span>
            ))}
          </div>

          {/* 统计 */}
          <div style={sectionTitleStyle}>统计</div>
          <div style={statCardStyle}>
            <div style={statItemStyle}>
              <div style={statValueStyle}>{data.stats.wordCount.toLocaleString()}</div>
              <div style={statLabelStyle}>总字数</div>
            </div>
            <div style={statItemStyle}>
              <div style={statValueStyle}>{data.stats.sectionCount}</div>
              <div style={statLabelStyle}>段落数</div>
            </div>
          </div>
        </>
      )}

      {/* 操作按钮 */}
      <div style={buttonRowStyle}>
        <a href="/write" style={{ ...primaryButtonStyle, textDecoration: "none", display: "inline-block" }}>
          继续写作
        </a>
        <a href="/" style={{ ...secondaryButtonStyle, textDecoration: "none", display: "inline-block" }}>
          开始新思考
        </a>
      </div>
    </div>
  );
}
