"use client";

import { useMemo, useState } from "react";
import type { EchoWallState, InspirationItem } from "@/hooks/useEchoWall";

// ── Codex-inspired design tokens (warm-tone adaptation) ────
// Backgrounds: layered cards with subtle elevation
// Typography: Source Serif 4 for reading, system UI for controls
// Accents: gold gradient accents, warm glows
// Spacing: generous padding, 8px grid

interface EchoWallProps {
  state: EchoWallState;
  onDismissInspiration?: (id: string) => void;
  onAcceptInspiration?: (id: string) => void;
  onFeedback?: (type: "diagnosis" | "inspiration", id: string, helpful: boolean) => void;
  nodeCount?: number;
  wordCount?: number;
}

export default function EchoWall({
  state,
  onDismissInspiration,
  onAcceptInspiration,
  onFeedback,
  nodeCount = 0,
  wordCount = 0,
}: EchoWallProps) {
  const {
    currentParagraph,
    paragraphCount,
    isPaused,
    pauseDuration,
    diagnosis,
    diagnosisLoading,
    inspirations,
    selectedText,
    selectionAnalysis,
    selectionLoading,
  } = state;

  // Determine which diagnosis to show
  const activeDiagnosis = selectionAnalysis || diagnosis;
  const isLoading = selectionLoading || diagnosisLoading;

  return (
    <div style={containerStyle}>
      {/* ── Header ──────────────────────────────────────── */}
      <Header
        isPaused={isPaused}
        pauseDuration={pauseDuration}
      />

      {/* ── Scrollable content ──────────────────────────── */}
      <div style={scrollStyle}>
        {/* Status bar */}
        <StatusBar
          currentParagraph={currentParagraph}
          paragraphCount={paragraphCount}
          selectedText={selectedText}
        />

        {/* Diagnosis card */}
        <DiagnosisCard
          diagnosis={activeDiagnosis}
          loading={isLoading}
          onFeedback={onFeedback ? (helpful: boolean) => onFeedback("diagnosis", `diag-${activeDiagnosis?.updatedAt || 0}`, helpful) : undefined}
        />

        {/* Inspiration stream */}
        <InspirationStream
          inspirations={inspirations}
          onDismiss={onDismissInspiration}
          onAccept={onAcceptInspiration}
          onFeedback={onFeedback ? (id: string, helpful: boolean) => onFeedback("inspiration", id, helpful) : undefined}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <Footer nodeCount={nodeCount} wordCount={wordCount} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function Header({ isPaused, pauseDuration }: { isPaused: boolean; pauseDuration: number }) {
  return (
    <div style={headerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Status dot */}
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isPaused
              ? "var(--gold)"
              : "var(--success, #4caf50)",
            boxShadow: isPaused
              ? "0 0 8px var(--gold)"
              : "0 0 6px var(--success, #4caf50)",
            transition: "all 0.4s ease",
            animation: isPaused ? "glow-breathe 2s infinite" : "none",
          }}
        />
        <span style={headerTitleStyle}>
          {isPaused
            ? `等待中 · ${pauseDuration}s`
            : "阅读中"}
        </span>
      </div>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", opacity: 0.5 }}>
        回声壁
      </span>
    </div>
  );
}

function StatusBar({
  currentParagraph,
  paragraphCount,
  selectedText,
}: {
  currentParagraph: { text: string; index: number } | null;
  paragraphCount: number;
  selectedText: string | null;
}) {
  if (selectedText) {
    return (
      <div style={statusBarStyle}>
        <span style={statusIconStyle}>✂</span>
        <span style={statusTextStyle}>
          已选中 {selectedText.length} 字 · 深度分析中
        </span>
      </div>
    );
  }

  if (!currentParagraph) {
    return (
      <div style={statusBarStyle}>
        <span style={statusIconStyle}>✎</span>
        <span style={statusTextStyle}>
          开始书写，回声壁会在这里回应你
        </span>
      </div>
    );
  }

  const preview =
    currentParagraph.text.length > 40
      ? currentParagraph.text.slice(0, 40) + "…"
      : currentParagraph.text;

  return (
    <div style={statusBarStyle}>
      <span style={statusIconStyle}>¶</span>
      <span style={statusTextStyle}>
        第 {currentParagraph.index + 1}/{paragraphCount} 段 · {preview}
      </span>
    </div>
  );
}

function DiagnosisCard({
  diagnosis,
  loading,
  onFeedback,
}: {
  diagnosis: { mirrorPlayback: string; readerQuestion: string; microAlerts: string[]; updatedAt: number } | null;
  loading: boolean;
  onFeedback?: (helpful: boolean) => void;
}) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  if (loading) {
    return (
      <div style={cardStyle}>
        <Skeleton width="70%" />
        <div style={{ height: 8 }} />
        <Skeleton width="90%" />
        <div style={{ height: 8 }} />
        <Skeleton width="50%" />
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div style={cardStyle}>
        <div style={emptyCardStyle}>
          <span style={{ fontSize: 24, marginBottom: 8, opacity: 0.6 }}>📖</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6, textAlign: "center" }}>
            写完一个段落后
            <br />
            回声壁会自动为你分析
          </span>
        </div>
      </div>
    );
  }

  const timeAgo = Math.floor((Date.now() - diagnosis.updatedAt) / 1000);
  const timeLabel = timeAgo < 60 ? `${timeAgo}秒前` : `${Math.floor(timeAgo / 60)}分前`;

  return (
    <div style={cardStyle}>
      {/* Mirror playback */}
      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>
          <span>📖 镜面回放</span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", opacity: 0.5 }}>{timeLabel}</span>
        </div>
        <p style={mirrorTextStyle}>{diagnosis.mirrorPlayback}</p>
      </div>

      {/* Reader question */}
      <div style={{ ...sectionStyle, borderTop: "1px solid var(--border-light)" }}>
        <div style={sectionLabelStyle}>
          <span>👁 读者视角</span>
        </div>
        <p style={readerTextStyle}>{diagnosis.readerQuestion}</p>
      </div>

      {/* Micro alerts */}
      {diagnosis.microAlerts.length > 0 && (
        <div style={{ ...sectionStyle, borderTop: "1px solid var(--border-light)" }}>
          <div style={sectionLabelStyle}>
            <span>⚡ 微提醒</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {diagnosis.microAlerts.map((alert, i) => (
              <span key={i} style={alertStyle}>
                {alert}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Feedback buttons */}
      {onFeedback && (
        <div style={{ ...sectionStyle, borderTop: "1px solid var(--border-light)", display: "flex", justifyContent: "flex-end", gap: 4 }}>
          {feedbackGiven ? (
            <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontStyle: "italic" }}>感谢反馈</span>
          ) : (
            <>
              <button onClick={() => { onFeedback(true); setFeedbackGiven(true); }} style={feedbackBtnStyle} title="有帮助">👍</button>
              <button onClick={() => { onFeedback(false); setFeedbackGiven(true); }} style={feedbackBtnStyle} title="没帮助">👎</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InspirationStream({
  inspirations,
  onDismiss,
  onAccept,
  onFeedback,
}: {
  inspirations: InspirationItem[];
  onDismiss?: (id: string) => void;
  onAccept?: (id: string) => void;
  onFeedback?: (id: string, helpful: boolean) => void;
}) {
  // Sort by priority: high first, then medium, then low
  const sorted = useMemo(
    () =>
      [...inspirations].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }),
    [inspirations]
  );

  if (sorted.length === 0) {
    return (
      <div style={streamContainerStyle}>
        <div style={streamLabelStyle}>💡 灵感流</div>
        <div style={emptyStreamStyle}>
          <span style={{ fontSize: 20, opacity: 0.4, marginBottom: 4 }}>✨</span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
            停笔 3 秒
            <br />
            灵感自动浮现
          </span>
        </div>
      </div>
    );
  }

  const typeIcons: Record<string, string> = {
    alert: "🔔",
    suggestion: "💡",
    knowledge: "📚",
    continuation: "✨",
  };

  return (
    <div style={streamContainerStyle}>
      <div style={streamLabelStyle}>
        💡 灵感流
        <span style={{ fontSize: 10, color: "var(--text-tertiary)", opacity: 0.5, marginLeft: 4 }}>
          {sorted.length} 条
        </span>
      </div>

      {sorted.map((item) => (
        <div
          key={item.id}
          style={{
            ...inspirationItemStyle,
            borderColor:
              item.priority === "high"
                ? "rgba(201,169,92,0.3)"
                : "var(--border-light)",
            background:
              item.priority === "high"
                ? "rgba(201,169,92,0.04)"
                : "transparent",
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, marginTop: 1, flexShrink: 0 }}>
              {typeIcons[item.type] || "·"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={inspirationContentStyle}>{item.content}</div>
              {item.source && (
                <div style={inspirationSourceStyle}>{item.source}</div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center" }}>
            {item.actionable && onAccept && (
              <button
                onClick={() => onAccept(item.id)}
                style={acceptBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--gold)";
                  e.currentTarget.style.color = "#1a1a1a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--gold)";
                }}
              >
                采纳
              </button>
            )}
            {onFeedback && (
              <>
                <button onClick={() => onFeedback(item.id, true)} style={feedbackBtnStyle} title="有帮助">👍</button>
                <button onClick={() => onFeedback(item.id, false)} style={feedbackBtnStyle} title="没帮助">👎</button>
              </>
            )}
            {onDismiss && (
              <button onClick={() => onDismiss(item.id)} style={dismissBtnStyle}>
                忽略
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Footer({ nodeCount, wordCount }: { nodeCount: number; wordCount: number }) {
  return (
    <div style={footerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <FooterStat label="节点" value={nodeCount} />
        <FooterStat label="字数" value={wordCount.toLocaleString()} />
      </div>
      <span style={{ fontSize: 10, color: "var(--text-tertiary)", opacity: 0.3 }}>
        Sculptor EchoWall v6
      </span>
    </div>
  );
}

function FooterStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function Skeleton({ width }: { width: string }) {
  return (
    <div
      style={{
        width,
        height: 10,
        borderRadius: 4,
        background: "var(--bg-tertiary)",
        animation: "skeleton-pulse 1.5s infinite",
      }}
    />
  );
}

// ── Styles ──────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  width: 320,
  minWidth: 280,
  height: "100%",
  background: "var(--bg-secondary)",
  borderLeft: "1px solid var(--border-light)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  fontFamily: "var(--font-ui)",
  userSelect: "none",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid var(--border-light)",
  background: "var(--bg-tertiary)",
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-secondary)",
  letterSpacing: "0.3px",
};

const scrollStyle: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

// ── Status bar ─────────────────────────────────────────────

const statusBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 6,
  background: "var(--bg-primary)",
  border: "1px solid var(--border-light)",
};

const statusIconStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.6,
};

const statusTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

// ── Cards ──────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  borderRadius: 10,
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
  overflow: "hidden",
  transition: "all 0.4s ease",
};

const emptyCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
};

const sectionStyle: React.CSSProperties = {
  padding: "10px 12px",
};

const sectionLabelStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  marginBottom: 6,
  letterSpacing: "0.3px",
};

const mirrorTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  lineHeight: 1.6,
  margin: 0,
  fontFamily: "'Source Serif 4', serif",
};

const readerTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--gold)",
  lineHeight: 1.6,
  margin: 0,
  fontFamily: "'Source Serif 4', serif",
  fontStyle: "italic",
};

const alertStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--color-accent-warm, #d4956b)",
  lineHeight: 1.5,
};

// ── Inspiration stream ─────────────────────────────────────

const streamContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const streamLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  padding: "0 2px",
};

const emptyStreamStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "20px 16px",
  borderRadius: 8,
  background: "var(--bg-primary)",
  border: "1px dashed var(--border-light)",
};

const inspirationItemStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid",
  transition: "all 0.15s ease",
};

const inspirationContentStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-secondary)",
  lineHeight: 1.55,
};

const inspirationSourceStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--text-tertiary)",
  opacity: 0.6,
  marginTop: 3,
};

const acceptBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid var(--gold)",
  background: "transparent",
  color: "var(--gold)",
  fontSize: 10,
  cursor: "pointer",
  fontWeight: 600,
  transition: "all 0.15s ease",
};

const dismissBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid var(--border-light)",
  background: "transparent",
  color: "var(--text-tertiary)",
  fontSize: 10,
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const feedbackBtnStyle: React.CSSProperties = {
  padding: "1px 4px",
  borderRadius: 3,
  border: "none",
  background: "transparent",
  fontSize: 12,
  cursor: "pointer",
  opacity: 0.5,
  transition: "opacity 0.15s ease",
};

// ── Footer ────────────────────────────────────────────────

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 14px",
  borderTop: "1px solid var(--border-light)",
  background: "var(--bg-tertiary)",
};
