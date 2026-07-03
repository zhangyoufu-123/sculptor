"use client";

import type { Verdict } from "@/types/analysis";

interface VerdictCardProps {
  verdict: Verdict;
  hidden_assumptions: string[];
  decision_risks: string[];
}

export default function VerdictCard({
  verdict,
  hidden_assumptions,
  decision_risks,
}: VerdictCardProps) {
  const color = scoreColor(verdict.score);
  const colorBg = scoreBg(verdict.score);
  const emoji = scoreEmoji(verdict.score);

  return (
    <div
      className="flex flex-col gap-4 p-5 border-t"
      style={{
        background: "#0d0d0d",
        borderColor: "#1f1f1f",
      }}
    >
      {/* Verdict Score Row */}
      <div className="flex items-center gap-4">
        {/* Score circle */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: colorBg,
            border: `3px solid ${color}`,
          }}
        >
          <span
            className="text-2xl font-bold"
            style={{
              color,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {verdict.score}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span
            className="text-xs uppercase tracking-wide font-semibold"
            style={{
              color: "#6b6b6b",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {emoji} Verdict
          </span>
          <span
            className="text-sm font-semibold"
            style={{
              color,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {verdict.label}
          </span>
          <span
            className="text-xs"
            style={{
              color: "#4a4a4a",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {verdictDescription(verdict.score)}
          </span>
        </div>
      </div>

      {/* Hidden assumptions */}
      {hidden_assumptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4
            className="text-xs uppercase tracking-wide font-semibold"
            style={{
              color: "#6b6b6b",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            🤔 Hidden Assumptions
          </h4>
          <ul className="flex flex-col gap-1.5">
            {hidden_assumptions.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed"
                style={{
                  color: "#a0a0a0",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#4a4a4a" }}>
                  ◇
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decision risks */}
      {decision_risks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4
            className="text-xs uppercase tracking-wide font-semibold"
            style={{
              color: "#6b6b6b",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            ⚠️ Decision Risks
          </h4>
          <ul className="flex flex-col gap-1.5">
            {decision_risks.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed"
                style={{
                  color: "#fca5a5",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreBg(score: number): string {
  if (score >= 70) return "rgba(34, 197, 94, 0.1)";
  if (score >= 40) return "rgba(245, 158, 11, 0.1)";
  return "rgba(239, 68, 68, 0.1)";
}

function scoreEmoji(score: number): string {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

function verdictDescription(score: number): string {
  if (score >= 80) return "Highly credible argument";
  if (score >= 70) return "Generally sound with minor gaps";
  if (score >= 55) return "Mixed - merits and concerns both present";
  if (score >= 40) return "Significant weaknesses identified";
  return "Argument has serious flaws";
}
