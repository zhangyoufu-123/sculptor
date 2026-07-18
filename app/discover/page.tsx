"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────

interface EngineState {
  stage: string; // "topic" | "problem" | "position" | "evidence" | "outline"
  nextAction?: string;
}

interface PipelineData {
  evidenceCount: number;
  context?: string;
}

// ── LocalStorage helpers ─────────────────────────────────────

const LS_ANCHOR = "sculptor-anchor";
const LS_IDEAS = "sculptor-ideas";
const LS_OUTLINE = "sculptor-discover-outline";

function loadAnchor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_ANCHOR) || "";
}

function loadIdeas(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_IDEAS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIdeas(ideas: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_IDEAS, JSON.stringify(ideas));
}

function saveOutline(outline: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_OUTLINE, JSON.stringify(outline));
}

// ── Stage helpers ────────────────────────────────────────────

const STAGES = ["topic", "problem", "position", "evidence", "outline"] as const;
const STAGE_LABELS: Record<string, string> = {
  topic: "Topic",
  problem: "Problem",
  position: "Position",
  evidence: "Evidence",
  outline: "Outline",
};

function stageIndex(stage: string): number {
  const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
  return idx === -1 ? 0 : idx;
}

// ── Styles ───────────────────────────────────────────────────

const C = {
  // Colors
  gold: "#c9a95c",
  goldBg: "rgba(201,169,92,0.08)",
  goldBorder: "rgba(201,169,92,0.3)",
  bgPrimary: "var(--bg-primary, #0f0f0f)",
  bgSecondary: "var(--bg-secondary, #1a1a1a)",
  bgTertiary: "var(--bg-tertiary, #242424)",
  textPrimary: "var(--text-primary, #f0f0f0)",
  textSecondary: "var(--text-secondary, #a0a0a0)",
  textTertiary: "var(--text-tertiary, #666)",
  borderSubtle: "var(--border-subtle, #2a2a2a)",
  borderDefault: "var(--border-default, #333)",
  fontUi: "var(--font-ui, system-ui, -apple-system, sans-serif)",
};

const styles: Record<string, React.CSSProperties> = {
  // ── Page shell ──
  page: {
    minHeight: "100vh",
    background: C.bgPrimary,
    fontFamily: C.fontUi,
    display: "flex",
    justifyContent: "center",
    padding: 0,
  },
  layout: {
    display: "flex",
    width: "100%",
    maxWidth: 960,
    minHeight: "100vh",
  },
  // ── Main column ──
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "40px 48px 80px",
    minWidth: 0,
  },
  // ── Top bar ──
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 14,
    color: C.textTertiary,
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: C.fontUi,
    padding: "4px 0",
    opacity: 0.7,
    transition: "opacity 150ms",
  },
  topLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: C.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    opacity: 0.5,
  },
  // ── Progress bar ──
  progressSection: {
    marginBottom: 32,
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: C.textTertiary,
    width: 64,
    textAlign: "right" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    opacity: 0.5,
    flexShrink: 0,
  },
  progressLabelActive: {
    fontSize: 11,
    fontWeight: 600,
    color: C.gold,
    width: 64,
    textAlign: "right" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    flexShrink: 0,
  },
  progressBarOuter: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: C.borderSubtle,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    borderRadius: 2,
    background: C.gold,
    transition: "width 600ms ease",
  },
  progressBarInnerPartial: {
    height: "100%",
    borderRadius: 2,
    background: C.goldBorder,
    transition: "width 600ms ease",
  },
  // ── Anchor section ──
  anchorSection: {
    marginBottom: 32,
  },
  anchorLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: C.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 8,
    opacity: 0.6,
  },
  anchorText: {
    fontSize: 22,
    fontWeight: 700,
    color: C.textPrimary,
    lineHeight: 1.4,
    letterSpacing: "0.01em",
  },
  // ── Divider ──
  divider: {
    height: 1,
    background: C.borderSubtle,
    margin: "24px 0",
    border: "none",
  },
  // ── Loading state ──
  loadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "48px 24px",
    color: C.textTertiary,
    fontSize: 15,
    animation: "none",
  },
  // ── Question display ──
  questionSection: {
    marginBottom: 32,
    minHeight: 120,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 500,
    color: C.textPrimary,
    lineHeight: 1.7,
    letterSpacing: "0.01em",
  },
  // ── Input ──
  inputSection: {
    marginBottom: 20,
  },
  answerInput: {
    width: "100%",
    padding: "14px 18px",
    fontSize: 15,
    color: C.textPrimary,
    background: C.bgSecondary,
    border: `1px solid ${C.borderSubtle}`,
    borderRadius: 10,
    outline: "none",
    fontFamily: C.fontUi,
    lineHeight: 1.5,
    transition: "border-color 200ms, box-shadow 200ms",
    boxSizing: "border-box" as const,
  },
  // ── Action buttons ──
  actions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  confirmBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "10px 28px",
    background: C.gold,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontFamily: C.fontUi,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "all 150ms",
    boxShadow: "0 2px 8px rgba(201,169,92,0.25)",
  },
  switchBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "10px 24px",
    background: "transparent",
    color: C.textSecondary,
    border: `1px solid ${C.borderDefault}`,
    borderRadius: 10,
    fontFamily: C.fontUi,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms",
  },
  // ── Outline button ──
  outlineSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTop: `1px solid ${C.borderSubtle}`,
  },
  outlineBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    padding: "12px 36px",
    background: C.gold,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontFamily: C.fontUi,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "all 150ms",
    boxShadow: "0 2px 12px rgba(201,169,92,0.3)",
    width: "100%",
  },
  outlineHint: {
    fontSize: 12,
    color: C.textTertiary,
    textAlign: "center" as const,
    marginTop: 8,
    opacity: 0.7,
  },
  generatingText: {
    fontSize: 13,
    color: C.textTertiary,
    textAlign: "center" as const,
    marginTop: 12,
  },
  // ── Right sidebar: Thinking Board ──
  sidebar: {
    width: 280,
    flexShrink: 0,
    borderLeft: `1px solid ${C.borderSubtle}`,
    padding: "40px 24px 80px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: C.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    opacity: 0.5,
  },
  sidebarDivider: {
    height: 1,
    background: C.borderSubtle,
    border: "none",
    margin: 0,
  },
  affirmedList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  affirmedItem: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 1.5,
    padding: "10px 14px",
    borderRadius: 8,
    background: C.bgSecondary,
    border: `1px solid ${C.borderSubtle}`,
    borderLeft: `3px solid ${C.gold}`,
  },
  affirmedEmpty: {
    fontSize: 13,
    color: C.textTertiary,
    fontStyle: "italic" as const,
    opacity: 0.6,
  },
  evidenceToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: C.textTertiary,
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: C.fontUi,
    padding: "4px 0",
    opacity: 0.7,
    transition: "opacity 150ms",
  },
  evidencePanel: {
    padding: "10px 14px",
    borderRadius: 8,
    background: C.bgSecondary,
    border: `1px solid ${C.borderSubtle}`,
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    maxHeight: 200,
    overflowY: "auto" as const,
  },
  // ── No anchor fallback ──
  fallbackPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: C.bgPrimary,
    fontFamily: C.fontUi,
    gap: 16,
  },
  fallbackText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  fallbackBtn: {
    padding: "10px 24px",
    background: C.gold,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: C.fontUi,
    fontWeight: 500,
  },
};

// ── Component ────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();

  // ── State ──
  const [anchor, setAnchor] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  // v2: Free-form Mentor response, not structured LRRCQ fields
  const [mentorResponse, setMentorResponse] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [affirmedThinking, setAffirmedThinking] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [engineStage, setEngineStage] = useState("topic");
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [pipelineContext, setPipelineContext] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);

  const anchorRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load on mount ──
  useEffect(() => {
    const a = loadAnchor();
    if (a) {
      setAnchor(a);
      anchorRef.current = a;
      const savedIdeas = loadIdeas();
      setIdeas(savedIdeas);
      // Begin the mentor session
      startSession(a, savedIdeas);
    } else {
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist ideas ──
  useEffect(() => {
    saveIdeas(ideas);
  }, [ideas]);

  // ── Focus input when question appears ──
  useEffect(() => {
    if (mentorResponse && !loading && !initialLoading) {
      inputRef.current?.focus();
    }
  }, [mentorResponse, loading, initialLoading]);

  // ── Start mentor session ──
  const startSession = useCallback(
    async (topic: string, savedIdeas: string[]) => {
      setInitialLoading(true);
      try {
        const r = await fetch("/api/discover/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anchor: topic,
            thinking: [],
            ideas: savedIdeas,
            history: [],
          }),
        });
        if (r.ok) {
          const d = await r.json();
          // v2: Parse free-form Mentor response
          if (d.response) {
            setMentorResponse(d.response);
          } else if (d.lrrcq) {
            // Fallback for old format
            setMentorResponse(d.lrrcq.restate + "\n\n" + d.lrrcq.respond + "\n\n" + d.lrrcq.question);
          } else {
            setMentorResponse(d.questions?.[0] || "");
          }
          // Parse evidence and phase from new format
          if (d.evidenceCount) setEvidenceCount(d.evidenceCount);
          if (d.phase && STAGES.includes(d.phase)) setEngineStage(d.phase);
          if (d.evidence?.length) {
            setPipelineContext(d.evidence.map((e: any) => `[${e.isFact ? "事实" : "推理"}] ${e.source}`).join("\n"));
          }
          if (d.engine?.understanding?.stage) {
            setEngineStage(d.engine.understanding.stage);
          }
          if (d.pipeline) {
            setEvidenceCount(d.pipeline.evidenceCount || 0);
            if (d.pipeline.context) setPipelineContext(d.pipeline.context);
          }
        }
      } catch {
        // silent
      }
      // Small delay so the user sees "教授正在理解..." briefly
      await new Promise((r) => setTimeout(r, 800));
      setInitialLoading(false);
    },
    []
  );

  // ── Confirm current direction ──
  const confirmDirection = useCallback(async () => {
    const answer = userAnswer.trim();
    const questionText = mentorResponse;
    if (!questionText) return;

    // Add question to affirmed thinking
    const newAffirmed = [...affirmedThinking, questionText];
    setAffirmedThinking(newAffirmed);
    if (answer) {
      setIdeas((prev) => {
        if (prev.includes(answer)) return prev;
        return [...prev, answer];
      });
    }
    setUserAnswer("");
    setLoading(true);

    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: anchorRef.current,
          thinking: newAffirmed,
          ideas: answer ? [...ideas, answer] : ideas,
          history: [
            { role: "assistant", content: questionText },
            { role: "user", content: answer || "我确定这个方向" },
          ],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.response) {
          setMentorResponse(d.response);
        } else if (d.lrrcq) {
          setMentorResponse(d.lrrcq.restate + "\n\n" + d.lrrcq.respond + "\n\n" + d.lrrcq.question);
        } else {
          setMentorResponse(d.questions?.[0] || "");
        }
        if (d.evidenceCount) setEvidenceCount(d.evidenceCount);
        if (d.phase && STAGES.includes(d.phase)) setEngineStage(d.phase);
        if (d.evidence?.length) {
          setPipelineContext(d.evidence.map((e: any) => `[${e.isFact ? "事实" : "推理"}] ${e.source}`).join("\n"));
        }
        if (d.engine?.understanding?.stage) {
          setEngineStage(d.engine.understanding.stage);
        }
        if (d.pipeline) {
          setEvidenceCount(d.pipeline.evidenceCount || 0);
          if (d.pipeline.context) setPipelineContext(d.pipeline.context);
        }
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [mentorResponse, userAnswer, affirmedThinking, ideas]);

  // ── Switch question ──
  const switchQuestion = useCallback(async () => {
    if (!mentorResponse) return;
    setLoading(true);

    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: anchorRef.current,
          thinking: affirmedThinking,
          ideas,
          history: [
            { role: "assistant", content: mentorResponse },
            { role: "user", content: "换一个问题" },
          ],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const q = d.questions?.[0] || "";
        if (q) setCurrentQuestion(q);
        if (d.engine?.understanding?.stage) {
          setEngineStage(d.engine.understanding.stage);
        }
        if (d.pipeline) {
          setEvidenceCount(d.pipeline.evidenceCount || 0);
          if (d.pipeline.context) setPipelineContext(d.pipeline.context);
        }
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [mentorResponse, affirmedThinking, ideas]);

  // ── Generate outline ──
  const generateOutline = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/discover/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: anchorRef.current,
          thinking: affirmedThinking,
          ideas,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        saveOutline(d.outline);
        router.push("/write");
      }
    } catch {
      // silent
    }
    setGenerating(false);
  }, [generating, affirmedThinking, ideas, router]);

  // ── Reset ──
  const resetAnchor = () => {
    localStorage.removeItem("sculptor-anchor");
    router.push("/");
  };

  // ── Enter key handler ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      confirmDirection();
    }
  };

  // ── Stage progress computation ──
  const currentStageIdx = stageIndex(engineStage);

  // ── No anchor ──
  if (!anchor && !initialLoading) {
    return (
      <div style={styles.fallbackPage}>
        <p style={styles.fallbackText}>
          请先从首页输入你想思考的话题
        </p>
        <button
          style={styles.fallbackBtn}
          onClick={() => router.push("/")}
        >
          回到首页
        </button>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        {/* ── MAIN COLUMN ── */}
        <div style={styles.main}>
          {/* Top bar */}
          <div style={styles.topBar}>
            <button
              style={styles.backBtn}
              onClick={resetAnchor}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
            >
              ← 换个想法
            </button>
            <span style={styles.topLabel}>Thinking Progress</span>
          </div>

          {/* Progress bars */}
          <div style={styles.progressSection}>
            {STAGES.map((stage, idx) => {
              const isCurrent = idx === currentStageIdx;
              const isPast = idx < currentStageIdx;
              const isFuture = idx > currentStageIdx;
              const labelStyle =
                isCurrent || isPast
                  ? styles.progressLabelActive
                  : styles.progressLabel;
              const barInnerStyle =
                isPast
                  ? { ...styles.progressBarInner, width: "100%" }
                  : isCurrent
                  ? { ...styles.progressBarInnerPartial, width: "40%" }
                  : { ...styles.progressBarInner, width: "0%" };

              return (
                <div key={stage} style={styles.progressRow}>
                  <span style={labelStyle}>{STAGE_LABELS[stage]}</span>
                  <div style={styles.progressBarOuter}>
                    <div style={barInnerStyle} />
                  </div>
                </div>
              );
            })}
          </div>

          <hr style={styles.divider} />

          {/* Anchor */}
          <div style={styles.anchorSection}>
            <div style={styles.anchorLabel}>今天的命题</div>
            <div style={styles.anchorText}>{anchor}</div>
          </div>

          <hr style={styles.divider} />

          {/* Loading state */}
          {initialLoading && (
            <div style={styles.loadingBox}>
              <span>教授正在理解...</span>
            </div>
          )}

          {/* Loading next question */}
          {loading && !initialLoading && (
            <div style={styles.loadingBox}>
              <span>教授正在思考...</span>
            </div>
          )}

          {/* v2: Free-form Mentor response */}
          {!initialLoading && !loading && mentorResponse && (
            <>
              <div style={styles.questionSection}>
                {mentorResponse.split("\n").map((line, i) => (
                  <p key={i} style={{
                    fontSize: 15, color: C.textPrimary, lineHeight: 1.8,
                    marginBottom: line.trim() ? 8 : 16,
                    whiteSpace: "pre-wrap",
                  }}>
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>

              {/* Answer input */}
              <div style={styles.inputSection}>
                <input
                  ref={inputRef}
                  style={styles.answerInput}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = C.gold;
                    e.currentTarget.style.boxShadow =
                      "0 0 0 2px rgba(201,169,92,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = C.borderSubtle;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="输入你的回答，按 Enter 确认..."
                />
              </div>

              {/* Action buttons */}
              <div style={styles.actions}>
                <button
                  style={styles.confirmBtn}
                  onClick={confirmDirection}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--gold-hover, #b8994a)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.gold;
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  确认这个方向
                </button>
                <button
                  style={styles.switchBtn}
                  onClick={switchQuestion}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.gold;
                    e.currentTarget.style.color = C.gold;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.borderDefault;
                    e.currentTarget.style.color = C.textSecondary;
                  }}
                >
                  换一个问题
                </button>
              </div>
            </>
          )}

          {/* Generate outline button — shown after 3+ affirmed */}
          {affirmedThinking.length >= 3 && !initialLoading && (
            <div style={styles.outlineSection}>
              <button
                style={styles.outlineBtn}
                onClick={generateOutline}
                disabled={generating}
                onMouseEnter={(e) => {
                  if (!generating) {
                    e.currentTarget.style.background = "var(--gold-hover, #b8994a)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 20px rgba(201,169,92,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!generating) {
                    e.currentTarget.style.background = C.gold;
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow =
                      "0 2px 12px rgba(201,169,92,0.3)";
                  }
                }}
              >
                {generating ? "生成中···" : "生成大纲"}
              </button>
              {!generating && (
                <div style={styles.outlineHint}>
                  已确定 {affirmedThinking.length} 个方向，可以生成文章结构
                </div>
              )}
              {generating && (
                <div style={styles.generatingText}>
                  正在根据你的思考生成文章结构...
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR: Thinking Board ── */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>目前形成：</div>
          <hr style={styles.sidebarDivider} />

          {affirmedThinking.length === 0 ? (
            <div style={styles.affirmedEmpty}>
              等待你确认第一个方向...
            </div>
          ) : (
            <div style={styles.affirmedList}>
              {affirmedThinking.map((item, i) => (
                <div key={i} style={styles.affirmedItem}>
                  {item}
                </div>
              ))}
            </div>
          )}

          <hr style={styles.sidebarDivider} />

          {/* Evidence count */}
          <div>
            <button
              style={styles.evidenceToggle}
              onClick={() => setShowEvidence(!showEvidence)}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
            >
              <span>参考来源 ({evidenceCount} 条)</span>
              <span style={{ fontSize: 10 }}>
                {showEvidence ? "▾" : "▸"}
              </span>
            </button>
            {showEvidence && pipelineContext && (
              <div style={styles.evidencePanel}>
                {pipelineContext.length > 300
                  ? pipelineContext.slice(0, 300) + "…"
                  : pipelineContext}
              </div>
            )}
            {showEvidence && !pipelineContext && (
              <div style={{ ...styles.evidencePanel, fontStyle: "italic", opacity: 0.6 }}>
                暂无参考来源详情
              </div>
            )}
          </div>

          {/* Ideas tags */}
          {ideas.length > 0 && (
            <>
              <hr style={styles.sidebarDivider} />
              <div style={styles.sidebarTitle}>素材与想法</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ideas.map((idea, i) => (
                  <span
                    key={`${idea}-${i}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-full, 20px)",
                      background: C.bgSecondary,
                      border: `1px solid ${C.borderSubtle}`,
                      fontSize: 12,
                      color: C.textSecondary,
                      fontFamily: C.fontUi,
                    }}
                  >
                    {idea}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
