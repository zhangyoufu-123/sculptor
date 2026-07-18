"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const LS_ANCHOR = "sculptor-anchor";
const LS_IDEAS = "sculptor-ideas";
const LS_OUTLINE = "sculptor-discover-outline";

function loadAnchor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_ANCHOR) || "";
}
function loadIdeas(): string[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(LS_IDEAS); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveIdeas(ideas: string[]) { if (typeof window !== "undefined") localStorage.setItem(LS_IDEAS, JSON.stringify(ideas)); }
function saveOutline(o: unknown) { if (typeof window !== "undefined") localStorage.setItem(LS_OUTLINE, JSON.stringify(o)); }

const STAGES = ["topic", "problem", "position", "evidence", "outline"] as const;
const STAGE_LABELS: Record<string, string> = {
  topic: "主题", problem: "问题", position: "立场", evidence: "证据", outline: "大纲",
};
function stageIndex(s: string) { const i = STAGES.indexOf(s as any); return i < 0 ? 0 : i; }

// Warm color palette
const C = {
  bg: "#faf8f5",
  panel: "#fff",
  border: "#e8e0d5",
  gold: "#c9a95c",
  text: "#2c2416",
  textSecondary: "#6b5e4a",
  textTertiary: "#9b8e7a",
  font: "var(--font-ui, system-ui)",
  fontBody: "var(--font-body, Georgia, serif)",
};

export default function DiscoverPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"chat" | "canvas">("canvas");

  const [anchor, setAnchor] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mentorResponse, setMentorResponse] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [affirmedThinking, setAffirmedThinking] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [engineStage, setEngineStage] = useState("topic");
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [pipelineContext, setPipelineContext] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  // Blueprint state
  const [blueprint, setBlueprint] = useState<any>(null);
  const [completeness, setCompleteness] = useState(0);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [outlineReady, setOutlineReady] = useState(false);
  const anchorRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const a = loadAnchor();
    if (a) { setAnchor(a); anchorRef.current = a; setIdeas(loadIdeas()); startSession(a); }
    else { setInitialLoading(false); }
  }, []);

  useEffect(() => { saveIdeas(ideas); }, [ideas]);
  useEffect(() => {
    if (mentorResponse && !loading && !initialLoading) inputRef.current?.focus();
  }, [mentorResponse, loading, initialLoading]);

  const startSession = useCallback(async (topic: string) => {
    setInitialLoading(true);
    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor: topic, thinking: [], ideas: [], history: [] }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.response) setMentorResponse(d.response);
        if (d.blueprint) {
          setBlueprint(d.blueprint);
          setCompleteness(d.completeness || 0);
          setActiveSlot(d.activeSlot);
          setOutlineReady(d.outlineReady || false);
        }
        if (d.phase && STAGES.includes(d.phase as any)) setEngineStage(d.phase);
        if (d.evidenceCount) setEvidenceCount(d.evidenceCount);
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 800));
    setInitialLoading(false);
  }, []);

  const confirmDirection = useCallback(async () => {
    const answer = userAnswer.trim();
    const questionText = mentorResponse;
    if (!questionText) return;
    const newAffirmed = [...affirmedThinking, questionText];
    setAffirmedThinking(newAffirmed);
    if (answer) { setIdeas((p) => p.includes(answer) ? p : [...p, answer]); }
    setUserAnswer("");
    setLoading(true);
    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor: anchorRef.current, thinking: newAffirmed, ideas, history: [{ role: "assistant", content: questionText }, { role: "user", content: answer || "继续" }] }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.response) setMentorResponse(d.response);
        if (d.phase && STAGES.includes(d.phase as any)) setEngineStage(d.phase);
        if (d.evidenceCount) setEvidenceCount(d.evidenceCount);
      }
    } catch {}
    setLoading(false);
  }, [mentorResponse, userAnswer, affirmedThinking, ideas]);

  const switchQuestion = useCallback(async () => {
    if (!mentorResponse) return;
    setLoading(true);
    try {
      const r = await fetch("/api/discover/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor: anchorRef.current, thinking: affirmedThinking, ideas, history: [{ role: "assistant", content: mentorResponse }, { role: "user", content: "换一个问题" }] }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.response) setMentorResponse(d.response);
      }
    } catch {}
    setLoading(false);
  }, [mentorResponse, affirmedThinking, ideas]);

  const generateOutline = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/discover/outline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor: anchorRef.current, thinking: affirmedThinking, ideas }),
      });
      if (r.ok) { const d = await r.json(); saveOutline(d.outline); router.push("/write"); }
    } catch {}
    setGenerating(false);
  }, [generating, affirmedThinking, ideas, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmDirection(); }
  }, [confirmDirection]);

  const currentStageIdx = stageIndex(engineStage);

  if (!mounted) return <div style={{ minHeight: "100vh", background: C.bg }} />;

  if (!anchor && !initialLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: C.font }}>
        <p style={{ color: C.textSecondary, marginBottom: 16 }}>请先从首页输入你想思考的话题</p>
        <button onClick={() => router.push("/")} style={{ padding: "10px 24px", background: C.gold, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: C.font }}>回到首页</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: C.font }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.panel, gap: 12 }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: C.textTertiary, cursor: "pointer", fontSize: 13, fontFamily: C.font }}>← 换想法</button>
        <span style={{ fontSize: 11, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Thinking Progress</span>
        <div style={{ flex: 1 }} />
        {/* View toggle */}
        <button onClick={() => setViewMode("canvas")} style={{ padding: "4px 12px", fontSize: 12, background: viewMode === "canvas" ? C.gold : "transparent", color: viewMode === "canvas" ? "#fff" : C.textSecondary, border: viewMode === "canvas" ? "none" : `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontFamily: C.font }}>画布</button>
        <button onClick={() => setViewMode("chat")} style={{ padding: "4px 12px", fontSize: 12, background: viewMode === "chat" ? C.gold : "transparent", color: viewMode === "chat" ? "#fff" : C.textSecondary, border: viewMode === "chat" ? "none" : `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontFamily: C.font }}>讨论</button>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 12 }}>
        {STAGES.map((stage, idx) => {
          const isCurrent = idx === currentStageIdx;
          const isPast = idx < currentStageIdx;
          return (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ width: "100%", height: 3, background: isPast ? C.gold : isCurrent ? C.gold : "#e0d8c8", borderRadius: 2, opacity: isCurrent || isPast ? 1 : 0.3 }} />
              <span style={{ fontSize: 10, color: isCurrent ? C.gold : C.textTertiary, whiteSpace: "nowrap", fontWeight: isCurrent ? 600 : 400 }}>{STAGE_LABELS[stage]}</span>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ display: "flex", maxWidth: 960, margin: "0 auto", padding: "20px", gap: 24 }}>
        {/* Left: Discussion */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {/* Anchor */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>命题</p>
          <p style={{ fontSize: 20, color: C.text, fontWeight: 600, margin: 0, fontFamily: C.fontBody }}>{anchor}</p>
        </div>

        {viewMode === "canvas" ? (
          /* Canvas view — accumulated thinking */
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, minHeight: 200 }}>
            <p style={{ fontSize: 12, color: C.textTertiary, marginBottom: 16 }}>思考地图</p>
            {affirmedThinking.length === 0 ? (
              <p style={{ fontSize: 14, color: C.textTertiary, fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
                确认一些方向后，这里会生长出你的思考地图。
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {affirmedThinking.map((item, i) => (
                  <div key={i} style={{
                    background: "#faf6ed", border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "10px 16px", fontSize: 13, color: C.text, maxWidth: 300,
                    position: "relative",
                  }}>
                    <span style={{ fontSize: 10, color: C.gold, position: "absolute", top: -8, left: 12, background: C.panel, padding: "0 6px" }}>节点 {i + 1}</span>
                    {item.length > 60 ? item.slice(0, 60) + "…" : item}
                  </div>
                ))}
              </div>
            )}
            {evidenceCount > 0 && (
              <p style={{ fontSize: 11, color: C.textTertiary, marginTop: 16 }}>📋 {evidenceCount} 条参考证据</p>
            )}
          </div>
        ) : (
          /* Chat view — mentor discussion */
          <>
            {initialLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textTertiary }}>
                <p style={{ fontSize: 15, fontFamily: C.fontBody }}>教授正在理解…</p>
              </div>
            ) : loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textTertiary }}>
                <p style={{ fontSize: 15 }}>教授正在思考…</p>
              </div>
            ) : mentorResponse ? (
              <>
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
                  {mentorResponse.split("\n").map((line, i) => (
                    <p key={i} style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: line.trim() ? 8 : 16, fontFamily: C.fontBody }}>
                      {line || "\u00A0"}
                    </p>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input
                    ref={inputRef}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入你的回答，Enter 确认…"
                    style={{
                      flex: 1, padding: "12px 16px", fontSize: 14,
                      border: `1px solid ${C.border}`, borderRadius: 8,
                      background: C.panel, color: C.text, fontFamily: C.font,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={confirmDirection}
                    style={{ padding: "12px 20px", background: C.gold, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: C.font, fontWeight: 500 }}
                  >确认</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={switchQuestion} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textSecondary, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: C.font }}>换一个问题</button>
                  {affirmedThinking.length >= 2 && (
                    <button onClick={generateOutline} disabled={generating} style={{ background: "none", border: `1px solid ${C.gold}`, color: C.gold, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: C.font, fontWeight: 500 }}>
                      {generating ? "生成中…" : "生成大纲 →"}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </>
        )}

        {/* Sidebar: affirmed + ideas */}
        <div style={{ marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          {affirmedThinking.length > 0 && (
            <>
              <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>已确认的方向</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {affirmedThinking.map((item, i) => (
                  <span key={i} style={{ background: "#faf6ed", border: `1px solid ${C.border}`, padding: "4px 12px", borderRadius: 20, fontSize: 12, color: C.textSecondary }}>{item.length > 30 ? item.slice(0, 30) + "…" : item}</span>
                ))}
              </div>
            </>
          )}
          {ideas.length > 0 && (
            <>
              <p style={{ fontSize: 11, color: C.textTertiary, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>素材与想法</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ideas.map((idea, i) => (
                  <span key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, padding: "4px 12px", borderRadius: 20, fontSize: 12, color: C.textSecondary }}>{idea}</span>
                ))}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Right: Blueprint progress */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, position: "sticky", top: 20 }}>
            <p style={{ fontSize: 11, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>写作蓝图</p>

            {/* Progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textSecondary }}>完成度</span>
                <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{completeness}%</span>
              </div>
              <div style={{ height: 4, background: "#e0d8c8", borderRadius: 2 }}>
                <div style={{ width: `${completeness}%`, height: "100%", background: C.gold, borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>

            {/* Slot list */}
            {blueprint?.slots?.map((slot: any) => {
              const isActive = slot.key === activeSlot;
              const isStable = slot.status === "stable";
              return (
                <div key={slot.key} style={{
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.border}`,
                  opacity: isActive ? 1 : isStable ? 0.8 : 0.4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{isStable ? "✓" : isActive ? "●" : "○"}</span>
                    <span style={{
                      fontSize: 12,
                      color: isActive ? C.gold : isStable ? C.text : C.textTertiary,
                      fontWeight: isActive ? 600 : 400,
                    }}>
                      {slot.label}
                    </span>
                    {isStable && (
                      <span style={{ fontSize: 10, color: C.gold, marginLeft: "auto" }}>
                        {Math.round(slot.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {!blueprint && (
              <p style={{ fontSize: 12, color: C.textTertiary, fontStyle: "italic" }}>
                开始讨论后，这里会显示你的写作蓝图——每个部分完成时都会自动更新。
              </p>
            )}

            {/* Outline ready button */}
            {outlineReady && (
              <button
                onClick={generateOutline}
                style={{
                  marginTop: 16, width: "100%", padding: "10px 0",
                  background: C.gold, color: "#fff", border: "none",
                  borderRadius: 8, cursor: "pointer", fontSize: 14,
                  fontFamily: C.font, fontWeight: 600,
                  animation: "pulse 2s infinite",
                }}
              >
                生成大纲 ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
