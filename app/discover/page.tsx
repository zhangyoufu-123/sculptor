"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  affirmed: boolean;
}

interface Insight {
  text: string;
  source: string;
  confirmed: boolean;
}

// ── LocalStorage helpers ─────────────────────────────────────

const LS_ANCHOR = "sculptor-anchor";
const LS_IDEAS = "sculptor-ideas";
const LS_OUTLINE = "sculptor-discover-outline";

function loadAnchor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_ANCHOR) || "";
}

function saveAnchor(val: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_ANCHOR, val);
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

// ── Styles ───────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    fontFamily: "var(--font-ui)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 24px 80px",
  },
  container: {
    width: "100%",
    maxWidth: 680,
  },
  // ── Anchor Bar ──
  anchorBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderRadius: "var(--radius-lg)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 32,
  },
  anchorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1.5,
  },
  anchorInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    border: "none",
    background: "transparent",
    outline: "none",
    fontFamily: "var(--font-ui)",
    lineHeight: 1.5,
    padding: 0,
  },
  editHint: {
    fontSize: 11,
    color: "var(--text-tertiary)",
    opacity: 0.6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 13,
    color: "var(--text-tertiary)",
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: "var(--font-ui)",
    marginBottom: 20,
    padding: "4px 0",
    opacity: 0.7,
    transition: "opacity 150ms",
  },
  // ── Section labels ──
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
    opacity: 0.7,
  },
  // ── Thinking cards ──
  thinkingSection: {
    marginBottom: 40,
  },
  questionCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "16px 20px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 8,
    transition: "background 150ms, border-color 150ms",
    cursor: "default",
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: "var(--text-primary)",
    lineHeight: 1.6,
    fontWeight: 400,
  },
  questionActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
    paddingTop: 2,
  },
  actionBtn: {
    padding: "4px 12px",
    fontSize: 12,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-default)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    transition: "all 150ms",
    whiteSpace: "nowrap",
  },
  affirmedBtn: {
    padding: "4px 12px",
    fontSize: 12,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--gold)",
    background: "rgba(201, 169, 92, 0.1)",
    color: "var(--gold)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    transition: "all 150ms",
    whiteSpace: "nowrap",
  },
  thinkingInput: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--text-primary)",
    border: "1px dashed var(--border-default)",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    outline: "none",
    fontFamily: "var(--font-ui)",
    marginTop: 8,
    transition: "border-color 150ms",
  },
  // ── Insight cards ──
  insightSection: {
    marginBottom: 40,
  },
  insightCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "16px 20px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    borderLeft: "3px solid var(--gold)",
    marginBottom: 8,
  },
  insightText: {
    fontSize: 15,
    color: "var(--text-primary)",
    lineHeight: 1.6,
    fontWeight: 500,
  },
  insightSource: {
    fontSize: 11,
    color: "var(--text-tertiary)",
    opacity: 0.6,
  },
  insightActions: {
    display: "flex",
    gap: 8,
  },
  insightConfirmBtn: {
    padding: "4px 14px",
    fontSize: 12,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--gold)",
    background: "var(--gold)",
    color: "var(--text-on-brand)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    transition: "all 150ms",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  insightSkipBtn: {
    padding: "4px 14px",
    fontSize: 12,
    borderRadius: "var(--radius-sm)",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--text-tertiary)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    transition: "all 150ms",
    whiteSpace: "nowrap",
    opacity: 0.7,
  },
  insightConfirmedCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "16px 20px",
    borderRadius: "var(--radius-md)",
    background: "rgba(201, 169, 92, 0.04)",
    border: "1px solid var(--gold)",
    borderLeft: "3px solid var(--gold)",
    marginBottom: 8,
  },
  insightDiscoverBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    padding: "10px 24px",
    background: "transparent",
    color: "var(--gold)",
    border: "1px solid var(--gold)",
    borderRadius: "var(--radius-lg)",
    fontFamily: "var(--font-ui)",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms",
  },
  // ── Ideas section ──
  ideasSection: {
    marginBottom: 40,
  },
  ideasRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  ideaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 12px",
    borderRadius: "var(--radius-full)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    fontSize: 13,
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    transition: "all 150ms",
  },
  ideaAdd: {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "5px 12px",
    borderRadius: "var(--radius-full)",
    border: "1px dashed var(--border-default)",
    background: "transparent",
    fontSize: 13,
    color: "var(--text-tertiary)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    transition: "all 150ms",
  },
  ideaInput: {
    padding: "5px 12px",
    fontSize: 13,
    borderRadius: "var(--radius-full)",
    border: "1px solid var(--gold)",
    background: "var(--bg-secondary)",
    outline: "none",
    fontFamily: "var(--font-ui)",
    color: "var(--text-primary)",
    minWidth: 120,
  },
  // ── Bottom actions ──
  bottomActions: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    paddingTop: 20,
    borderTop: "1px solid var(--border-subtle)",
  },
  generateBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    padding: "12px 32px",
    background: "var(--gold)",
    color: "var(--text-on-brand)",
    border: "none",
    borderRadius: "var(--radius-lg)",
    fontFamily: "var(--font-ui)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "all 150ms",
    boxShadow: "0 2px 8px rgba(201,169,92,0.25)",
  },
  generateBtnDisabled: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    padding: "12px 32px",
    background: "var(--bg-tertiary)",
    color: "var(--text-tertiary)",
    border: "none",
    borderRadius: "var(--radius-lg)",
    fontFamily: "var(--font-ui)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "not-allowed",
    letterSpacing: "0.02em",
    opacity: 0.6,
  },
  generatingText: {
    fontSize: 13,
    color: "var(--text-tertiary)",
    alignSelf: "center",
    marginTop: 8,
  },
  // ── Empty / Loading ──
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "var(--text-tertiary)",
    fontSize: 14,
    lineHeight: 1.7,
  },
  loadingCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 20px",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 8,
    fontSize: 14,
    color: "var(--text-tertiary)",
  },
  refreshLink: {
    fontSize: 13,
    color: "var(--gold)",
    cursor: "pointer",
    background: "none",
    border: "none",
    fontFamily: "var(--font-ui)",
    padding: 0,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
};

// ── Component ────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter();

  // ── State ──
  const [anchor, setAnchor] = useState("");
  const [editingAnchor, setEditingAnchor] = useState(false);
  const [anchorDraft, setAnchorDraft] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideaInput, setIdeaInput] = useState("");
  const [addingIdea, setAddingIdea] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userInput, setUserInput] = useState("");

  // ── Insight state ──
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightFetched, setInsightFetched] = useState(false);

  const anchorRef = useRef(anchor);

  // ── Load on mount ──
  useEffect(() => {
    const a = loadAnchor();
    if (a) {
      setAnchor(a);
      anchorRef.current = a;
      fetchQuestions(a);
    }
    setIdeas(loadIdeas());
  }, []);

  // ── Persist ideas ──
  useEffect(() => {
    saveIdeas(ideas);
  }, [ideas]);

  // ── Fetch Socratic questions ──
  const fetchQuestions = useCallback(async (topic: string, history?: { role: string; content: string }[]) => {
    setLoadingQuestions(true);
    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor: topic, history }),
      });
      if (r.ok) {
        const d = await r.json();
        const qs: Question[] = (d.questions || []).map((t: string, i: number) => ({
          id: `q${Date.now()}-${i}`,
          text: t,
          affirmed: false,
        }));
        setQuestions(qs);
      }
    } catch {
      // silent
    }
    setLoadingQuestions(false);
  }, []);

  // ── Anchor editing ──
  const startEditAnchor = () => {
    setAnchorDraft(anchor);
    setEditingAnchor(true);
  };

  const commitAnchor = () => {
    const trimmed = anchorDraft.trim();
    if (trimmed && trimmed !== anchor) {
      setAnchor(trimmed);
      anchorRef.current = trimmed;
      saveAnchor(trimmed);
      setQuestions([]);
      fetchQuestions(trimmed);
    }
    setEditingAnchor(false);
  };

  // ── Question actions ──
  const affirmQuestion = (q: Question) => {
    setQuestions((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, affirmed: !x.affirmed } : x))
    );
    // Add affirmed question to thinking history + ideas
    if (!q.affirmed) {
      setIdeas((prev) => {
        if (prev.includes(q.text)) return prev;
        return [...prev, q.text];
      });
    } else {
      setIdeas((prev) => prev.filter((i) => i !== q.text));
    }
  };

  const refreshQuestion = async (q: Question) => {
    // Replace this question with a new one
    setLoadingQuestions(true);
    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: anchorRef.current,
          history: [
            { role: "user", content: `我正在思考: ${anchorRef.current}` },
            ...questions
              .filter((x) => x.id !== q.id)
              .map((x) => ({ role: "assistant" as const, content: x.text })),
            { role: "user", content: "换一个问题" },
          ],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const newText = d.questions?.[0] || "换个角度想想，这个问题的前提是什么？";
        setQuestions((prev) =>
          prev.map((x) =>
            x.id === q.id ? { ...x, text: newText, affirmed: false } : x
          )
        );
      }
    } catch {
      // silent
    }
    setLoadingQuestions(false);
  };

  // ── Submit user's own thinking ──
  const submitUserThinking = () => {
    const trimmed = userInput.trim();
    if (!trimmed) return;
    const newQ: Question = {
      id: `u${Date.now()}`,
      text: trimmed,
      affirmed: true,
    };
    setQuestions((prev) => [...prev, newQ]);
    setUserInput("");
    // Also add to ideas
    setIdeas((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  };

  // ── Ideas ──
  const addIdea = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (ideas.includes(trimmed)) return;
    setIdeas((prev) => [...prev, trimmed]);
    setIdeaInput("");
    setAddingIdea(false);
  };

  const removeIdea = (idx: number) => {
    setIdeas((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Insights ──
  const fetchInsights = async () => {
    setLoadingInsights(true);
    setInsightFetched(false);
    try {
      const r = await fetch("/api/discover/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: anchorRef.current,
          thinking: thinkingItems,
          ideas,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const items: Insight[] = (d.insights || []).map(
          (ins: { text: string; source: string }) => ({
            text: ins.text,
            source: ins.source,
            confirmed: false,
          })
        );
        setInsights(items);
        setInsightFetched(true);
      }
    } catch {
      // silent
    }
    setLoadingInsights(false);
  };

  const confirmInsight = (idx: number) => {
    setInsights((prev) =>
      prev.map((ins, i) => (i === idx ? { ...ins, confirmed: !ins.confirmed } : ins))
    );
  };

  const skipInsight = (idx: number) => {
    setInsights((prev) => prev.filter((_, i) => i !== idx));
  };

  const confirmedInsights = insights.filter((ins) => ins.confirmed);

  // ── Generate outline ──
  const thinkingItems = questions
    .filter((q) => q.affirmed)
    .map((q) => q.text);

  const canGenerate = thinkingItems.length >= 3 && confirmedInsights.length >= 2;

  const generateOutline = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/discover/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: anchorRef.current,
          thinking: [
            ...thinkingItems,
            ...confirmedInsights.map((ins) => ins.text),
          ],
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
  };

  // ── Reset anchor ──
  const resetAnchor = () => {
    setAnchor("");
    anchorRef.current = "";
    saveAnchor("");
    setQuestions([]);
    setIdeas([]);
    saveIdeas([]);
  };

  // ── No anchor yet ──
  if (!anchor) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.emptyState as React.CSSProperties}>
            <p style={{ marginBottom: 16, fontSize: 15 }}>
              你想探索什么话题？
            </p>
            <p style={{ color: "var(--text-tertiary)", opacity: 0.7, fontSize: 13 }}>
              输入一个你想深入思考的问题或话题，
              <br />
              AI 会以苏格拉底式提问帮助你发现真正想表达的东西。
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
              <input
                className="input-field"
                value={anchorDraft}
                onChange={(e) => setAnchorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && anchorDraft.trim()) {
                    setAnchor(anchorDraft.trim());
                    anchorRef.current = anchorDraft.trim();
                    saveAnchor(anchorDraft.trim());
                    fetchQuestions(anchorDraft.trim());
                  }
                }}
                placeholder="例如：为什么AI产品越来越像聊天机器人？"
                style={{ width: 360, fontSize: 14, padding: "12px 16px" }}
                autoFocus
              />
              <button
                className="btn-primary"
                onClick={() => {
                  const t = anchorDraft.trim();
                  if (!t) return;
                  setAnchor(t);
                  anchorRef.current = t;
                  saveAnchor(t);
                  fetchQuestions(t);
                }}
                disabled={!anchorDraft.trim()}
                style={{ minWidth: 80 }}
              >
                开始
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active workspace ──
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Return to anchor */}
        <button
          style={styles.backLink}
          onClick={resetAnchor}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.7";
          }}
        >
          换个想法
        </button>

        {/* ── ANCHOR BAR ── */}
        <div style={styles.anchorBar}>
          {editingAnchor ? (
            <input
              style={styles.anchorInput}
              value={anchorDraft}
              onChange={(e) => setAnchorDraft(e.target.value)}
              onBlur={commitAnchor}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitAnchor();
                if (e.key === "Escape") setEditingAnchor(false);
              }}
              autoFocus
            />
          ) : (
            <span style={styles.anchorText}>{anchor}</span>
          )}
          <span
            style={{ ...styles.editHint, userSelect: "none" }}
            onClick={startEditAnchor}
          >
            {editingAnchor ? "确认" : "编辑"}
          </span>
        </div>

        {/* ── THINKING SECTION ── */}
        <div style={styles.thinkingSection}>
          <div style={styles.sectionLabel}>思考</div>

          {loadingQuestions && questions.length === 0 && (
            <>
              <div style={styles.loadingCard}>
                <span>正在生成思考问题</span>
                <span style={{ opacity: 0.5 }}>···</span>
              </div>
            </>
          )}

          {questions.map((q) => (
            <div
              key={q.id}
              style={{
                ...styles.questionCard,
                ...(q.affirmed
                  ? {
                      borderColor: "var(--gold)",
                      background: "rgba(201, 169, 92, 0.04)",
                    }
                  : {}),
              }}
              onMouseEnter={(e) => {
                if (!q.affirmed) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.borderColor = "var(--border-default)";
                }
              }}
              onMouseLeave={(e) => {
                if (!q.affirmed) {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }
              }}
            >
              <span style={styles.questionText}>{q.text}</span>
              <div style={styles.questionActions}>
                <button
                  style={q.affirmed ? styles.affirmedBtn : styles.actionBtn}
                  onClick={() => affirmQuestion(q)}
                  onMouseEnter={(e) => {
                    if (!q.affirmed) {
                      e.currentTarget.style.borderColor = "var(--gold)";
                      e.currentTarget.style.color = "var(--gold)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!q.affirmed) {
                      e.currentTarget.style.borderColor = "var(--border-default)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  {q.affirmed ? "已确定" : "这个方向"}
                </button>
                <button
                  style={styles.actionBtn}
                  onClick={() => refreshQuestion(q)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  换一个问题
                </button>
              </div>
            </div>
          ))}

          {/* Refresh all questions */}
          {questions.length > 0 && !loadingQuestions && (
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <button
                style={styles.refreshLink}
                onClick={() => fetchQuestions(anchorRef.current)}
              >
                刷新所有问题
              </button>
            </div>
          )}

          {/* User input for own thinking */}
          <div style={{ marginTop: 16 }}>
            <input
              style={styles.thinkingInput}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitUserThinking();
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--gold)";
                e.currentTarget.style.borderStyle = "solid";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.borderStyle = "dashed";
              }}
              placeholder="写下你的想法，或回应上面的问题..."
            />
          </div>
        </div>

        {/* ── INSIGHT SECTION ── */}
        {thinkingItems.length >= 3 && (
          <div style={styles.insightSection}>
            <div style={styles.sectionLabel}>提炼核心观点</div>

            {!insightFetched && !loadingInsights && (
              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <button
                  style={styles.insightDiscoverBtn}
                  onClick={fetchInsights}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(201,169,92,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  发现我的观点
                </button>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    opacity: 0.6,
                    marginTop: 8,
                  }}
                >
                  AI 会从你确定的思考中提炼核心论述
                </div>
              </div>
            )}

            {loadingInsights && (
              <div style={styles.loadingCard}>
                <span>正在提炼你的核心观点</span>
                <span style={{ opacity: 0.5 }}>···</span>
              </div>
            )}

            {insightFetched &&
              insights.map((ins, i) => (
                <div
                  key={i}
                  style={
                    ins.confirmed
                      ? styles.insightConfirmedCard
                      : styles.insightCard
                  }
                >
                  <div style={styles.insightText}>{ins.text}</div>
                  <div style={styles.insightSource}>
                    来源：{ins.source}
                  </div>
                  {!ins.confirmed && (
                    <div style={styles.insightActions}>
                      <button
                        style={styles.insightConfirmBtn}
                        onClick={() => confirmInsight(i)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--gold-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "var(--gold)";
                        }}
                      >
                        确认
                      </button>
                      <button
                        style={styles.insightSkipBtn}
                        onClick={() => skipInsight(i)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.7";
                          e.currentTarget.style.color = "var(--text-tertiary)";
                        }}
                      >
                        略过
                      </button>
                    </div>
                  )}
                  {ins.confirmed && (
                    <div style={styles.insightActions}>
                      <button
                        style={{
                          ...styles.insightConfirmBtn,
                          background: "transparent",
                          color: "var(--gold)",
                          border: "1px solid var(--gold)",
                        }}
                        onClick={() => confirmInsight(i)}
                      >
                        已确认 · 取消
                      </button>
                    </div>
                  )}
                </div>
              ))}

            {insightFetched && insights.length === 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-tertiary)",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                暂时无法提炼观点，请尝试确定更多思考方向
              </div>
            )}
          </div>
        )}

        {/* ── IDEAS SECTION ── */}
        <div style={styles.ideasSection}>
          <div style={styles.sectionLabel}>素材与想法</div>
          <div style={styles.ideasRow}>
            {ideas.map((idea, i) => (
              <span
                key={`${idea}-${i}`}
                style={styles.ideaPill}
                onClick={() => removeIdea(i)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-error-light)";
                  e.currentTarget.style.borderColor = "var(--color-error)";
                  e.currentTarget.style.color = "var(--color-error)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
                title="点击移除"
              >
                × {idea}
              </span>
            ))}
            {addingIdea ? (
              <input
                style={styles.ideaInput}
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addIdea(ideaInput);
                  if (e.key === "Escape") {
                    setAddingIdea(false);
                    setIdeaInput("");
                  }
                }}
                onBlur={() => {
                  if (ideaInput.trim()) addIdea(ideaInput);
                  else {
                    setAddingIdea(false);
                    setIdeaInput("");
                  }
                }}
                placeholder="输入关键词..."
                autoFocus
              />
            ) : (
              <button
                style={styles.ideaAdd}
                onClick={() => setAddingIdea(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold)";
                  e.currentTarget.style.color = "var(--gold)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                + 添加
              </button>
            )}
          </div>
        </div>

        {/* ── BOTTOM ACTIONS ── */}
        <div style={styles.bottomActions}>
          <button
            style={canGenerate ? styles.generateBtn : styles.generateBtnDisabled}
            onClick={generateOutline}
            disabled={!canGenerate || generating}
            onMouseEnter={(e) => {
              if (canGenerate && !generating) {
                e.currentTarget.style.background = "var(--gold-hover)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(201,169,92,0.35)";
              }
            }}
            onMouseLeave={(e) => {
              if (canGenerate && !generating) {
                e.currentTarget.style.background = "var(--gold)";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(201,169,92,0.25)";
              }
            }}
          >
            {generating ? "生成中···" : "生成文章结构"}
          </button>
        </div>
        {!canGenerate && questions.length > 0 && (
          <div style={styles.generatingText}>
            {thinkingItems.length < 3
              ? "需要至少确定 3 个思考方向"
              : confirmedInsights.length < 2
              ? "需要至少确认 2 个核心观点后才能生成文章结构"
              : ""}
          </div>
        )}
        {generating && (
          <div style={styles.generatingText}>
            正在根据你的思考和素材生成文章结构...
          </div>
        )}
      </div>
    </div>
  );
}
