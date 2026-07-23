"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThemeSwitcher from "@/components/shared/ThemeSwitcher";

// ── localStorage keys ────────────────────────────────────────
const ANCHOR_KEY = "sculptor-anchor";
const THINKING_MEMORY_KEY = "sculptor-thinking-memory";
const DISCOVER_OUTLINE_KEY = "sculptor-discover-outline";
const LAST_CONTENT_KEY = "sculptor-last-content";

// ── Session shape ────────────────────────────────────────────
interface PreviousSession {
  anchor: string;
  domain: string | null;
  summary: string;
}

function hasPreviousSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const anchor = localStorage.getItem(ANCHOR_KEY);
    return !!anchor && anchor.trim().length > 0;
  } catch {
    return false;
  }
}

function loadPreviousSession(): PreviousSession | null {
  if (typeof window === "undefined") return null;
  try {
    const anchor = localStorage.getItem(ANCHOR_KEY);
    if (!anchor || anchor.trim().length === 0) return null;

    // Try to derive domain from thinking memory
    let domain: string | null = null;
    const memoryRaw = localStorage.getItem(THINKING_MEMORY_KEY);
    if (memoryRaw) {
      try {
        const memory = JSON.parse(memoryRaw);
        if (memory?.domain) domain = memory.domain;
        else if (memory?.patterns && Array.isArray(memory.patterns) && memory.patterns.length > 0) {
          // Extract domain from first pattern
          const first = memory.patterns[0];
          if (typeof first === "string") domain = first;
          else if (first?.domain) domain = first.domain;
        }
      } catch { /* ignore parse errors */ }
    }

    // Fallback: simple heuristic from anchor keywords
    if (!domain && anchor) {
      const lower = anchor.toLowerCase();
      if (lower.includes("ai") || lower.includes("人工智能") || lower.includes("产品")) domain = "AI 产品";
      else if (lower.includes("哲学") || lower.includes("意义") || lower.includes("存在")) domain = "哲学";
      else if (lower.includes("设计") || lower.includes("交互")) domain = "设计";
      else if (lower.includes("写作") || lower.includes("文章")) domain = "写作";
      else if (lower.includes("代码") || lower.includes("编程")) domain = "技术";
      else if (lower.includes("商业") || lower.includes("创业")) domain = "商业";
      else if (lower.includes("心理") || lower.includes("情绪")) domain = "心理";
      else domain = "思考";
    }

    // Build summary: what was accomplished
    const hasOutline = !!localStorage.getItem(DISCOVER_OUTLINE_KEY);
    const hasContent = !!localStorage.getItem(LAST_CONTENT_KEY);

    let summary = `上次锚点：「${anchor.slice(0, 40)}${anchor.length > 40 ? "…" : ""}」`;
    if (hasContent) {
      summary = "上次已完成初稿写作。";
    } else if (hasOutline) {
      summary = "上次已完成问题拆解与大纲。";
    }

    return { anchor: anchor.trim(), domain, summary };
  } catch {
    return null;
  }
}

function clearOldSessionData() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(THINKING_MEMORY_KEY);
    localStorage.removeItem(DISCOVER_OUTLINE_KEY);
    localStorage.removeItem(LAST_CONTENT_KEY);
  } catch { /* ignore */ }
}

// ── Greeting based on time of day ────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了。";
  if (hour < 10) return "早安。";
  if (hour < 14) return "中午好。";
  if (hour < 18) return "下午好。";
  return "晚上好。";
}

// ── Page component ───────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [spark, setSpark] = useState("");
  const [previous, setPrevious] = useState<PreviousSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const greeting = getGreeting();

  useEffect(() => {
    setMounted(true);
    setPrevious(loadPreviousSession());

    // Focus input with a gentle delay for animation
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = spark.trim();
    if (!trimmed) return;
    setSubmitting(true);

    try {
      localStorage.setItem(ANCHOR_KEY, trimmed);
      clearOldSessionData();
    } catch { /* localStorage unavailable — proceed anyway */ }

    router.push("/discover");
  }, [spark, router]);

  const handleContinue = useCallback(() => {
    router.push("/discover");
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Before hydration: blank warm surface ──────────────────
  if (!mounted) {
    return (
      <div
        style={{
          height: "100vh",
          background: "var(--surface-app)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-app)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-ui)",
        padding: "32px 24px",
        position: "relative",
      }}
    >
      {/* Inline keyframes — subtle, quiet entrance */}
      <style>{`
        @keyframes dashboardFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashboardFadeInLate {
          0% { opacity: 0; transform: translateY(8px); }
          60% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ThemeSwitcher — top-right corner, quiet */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 24,
        }}
      >
        <ThemeSwitcher />
      </div>

      {/* ── Main content column ─────────────────────────────── */}
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* ── Greeting ──────────────────────────────────────── */}
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 200,
            color: "var(--text-primary)",
            margin: "0 0 32px 0",
            letterSpacing: "0.04em",
            animation: "dashboardFadeIn 0.8s var(--ease-out) both",
            fontFamily: "var(--font-body)",
          }}
        >
          {greeting}
        </h1>

        {/* ── Previous session card ─────────────────────────── */}
        {previous && (
          <div
            style={{
              background: "var(--surface-panel)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              marginBottom: 32,
              textAlign: "left",
              animation: "dashboardFadeInLate 1.2s var(--ease-out) both",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
                margin: "0 0 8px 0",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              继续未完成的思考
            </p>

            <p
              style={{
                fontSize: "var(--text-md)",
                color: "var(--text-primary)",
                fontWeight: 500,
                margin: "0 0 6px 0",
                lineHeight: 1.5,
              }}
            >
              ● {previous.anchor}
            </p>

            {previous.summary && (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  margin: "0 0 12px 0",
                  lineHeight: 1.5,
                }}
              >
                {previous.summary}
              </p>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              {previous.domain && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-brand-600)",
                    background: "var(--color-brand-100)",
                    padding: "2px 10px",
                    borderRadius: "var(--radius-full)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {previous.domain}
                </span>
              )}

              <button
                onClick={handleContinue}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: "var(--color-brand-500)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: "6px 0",
                  fontFamily: "var(--font-ui)",
                  letterSpacing: "0.02em",
                  transition: "color var(--duration-fast) var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-brand-400)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-brand-500)";
                }}
              >
                继续 →
              </button>
            </div>
          </div>
        )}

        {/* ── Separator ─────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
            animation: "dashboardFadeInLate 1.2s var(--ease-out) both",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border-subtle)",
            }}
          />
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
              letterSpacing: "0.04em",
            }}
          >
            今天有什么新的想法？
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--border-subtle)",
            }}
          />
        </div>

        {/* ── Spark input ───────────────────────────────────── */}
        <div
          style={{
            animation: "dashboardFadeInLate 1.4s var(--ease-out) both",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={spark}
            onChange={(e) => setSpark(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="今天想写什么？"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "18px 20px",
              fontSize: "var(--text-md)",
              fontFamily: "var(--font-ui)",
              color: "var(--text-primary)",
              background: "var(--surface-panel)",
              border: "1.5px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              outline: "none",
              transition: "border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
              boxSizing: "border-box",
              textAlign: "center",
              opacity: submitting ? 0.5 : 1,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-brand-500)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,92,0.12)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || spark.trim().length === 0}
            style={{
              marginTop: 20,
              padding: "12px 36px",
              background:
                submitting || spark.trim().length === 0
                  ? "var(--border-default)"
                  : "var(--color-brand-500)",
              color:
                submitting || spark.trim().length === 0
                  ? "var(--text-tertiary)"
                  : "var(--text-on-brand)",
              border: "none",
              borderRadius: "var(--radius-lg)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              fontFamily: "var(--font-ui)",
              cursor: submitting || spark.trim().length === 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.03em",
              transition: "all var(--duration-fast) var(--ease-out)",
              boxShadow:
                submitting || spark.trim().length === 0
                  ? "none"
                  : "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              if (submitting || spark.trim().length === 0) return;
              e.currentTarget.style.background = "var(--color-brand-400)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
              if (submitting || spark.trim().length === 0) return;
              e.currentTarget.style.background = "var(--color-brand-500)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            {submitting ? "…" : "开始思考 →"}
          </button>

          {/* Example topics */}
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginBottom: 12 }}>
              或者试试这些话题
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {["AI会取代创造力吗", "老家的院子", "为什么越来越焦虑", "关于时间的思考", "写一个关于重逢的故事", "如何写出让人转发的文案"].map((topic) => (
                <span
                  key={topic}
                  onClick={() => { setSpark(topic); }}
                  style={{
                    padding: "6px 14px",
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-brand-500)";
                    e.currentTarget.style.color = "var(--color-brand-500)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
