"use client";

import { useState } from "react";
import type { AgentTrace } from "@/types/analysis";

type Tab = "final" | "critique" | "initial";

interface AnalysisPanelProps {
  trace: AgentTrace | null;
  loading: boolean;
}

export default function AnalysisPanel({ trace, loading }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("final");

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "final", label: "Final Analysis", icon: "📊" },
    { key: "critique", label: "Self-Critique", icon: "🔍" },
    { key: "initial", label: "Raw Initial", icon: "📝" },
  ];

  if (loading) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4"
        style={{ background: "#0d0d0d" }}
      >
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin h-8 w-8"
            style={{ color: "#4A6CF7" }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p
            className="text-sm"
            style={{
              color: "#6b6b6b",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            Running adversarial analysis...
          </p>
          <div className="flex flex-col gap-1 items-center">
            <span
              className="text-xs"
              style={{
                color: "#4a4a4a",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Step 1: Extracting arguments
            </span>
            <span
              className="text-xs"
              style={{
                color: "#4a4a4a",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Step 2: Self-critique
            </span>
            <span
              className="text-xs"
              style={{
                color: "#4a4a4a",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Step 3: Final refinement
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!trace) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3"
        style={{ background: "#0d0d0d" }}
      >
        <span className="text-4xl">🔍</span>
        <p
          className="text-sm max-w-xs text-center"
          style={{
            color: "#6b6b6b",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Paste an article URL or text on the left to see the adversarial analysis here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ background: "#0d0d0d" }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: "#1f1f1f" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 px-3 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            style={{
              background: activeTab === tab.key ? "#1a1a1a" : "transparent",
              color: activeTab === tab.key ? "#e5e5e5" : "#6b6b6b",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #4A6CF7"
                  : "2px solid transparent",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "final" && <FinalTab trace={trace} />}
        {activeTab === "critique" && <CritiqueTab trace={trace} />}
        {activeTab === "initial" && <InitialTab trace={trace} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Final Analysis Tab                                                 */
/* ------------------------------------------------------------------ */

function FinalTab({ trace }: { trace: AgentTrace }) {
  const { final } = trace;

  return (
    <div className="flex flex-col gap-5">
      {/* Core claim */}
      <Section title="Core Claim">
        <p
          className="text-base leading-relaxed"
          style={{
            color: "#e5e5e5",
            fontFamily: "Charter, Georgia, 'Times New Roman', serif",
          }}
        >
          {final.core_claim}
        </p>
      </Section>

      {/* Bull case */}
      <Section title="🐂 Bull Case" accentColor="#22c55e">
        <ul className="flex flex-col gap-2">
          {final.bull_case.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed"
              style={{
                color: "#86efac",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span className="mt-0.5 flex-shrink-0 text-xs">+</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Bear case */}
      <Section title="🐻 Bear Case" accentColor="#ef4444">
        <ul className="flex flex-col gap-2">
          {final.bear_case.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed"
              style={{
                color: "#fca5a5",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span className="mt-0.5 flex-shrink-0 text-xs">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Verdict score */}
      <div
        className="rounded-xl p-5 flex flex-col items-center gap-2"
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
        }}
      >
        <span
          className="text-xs uppercase tracking-wide font-semibold"
          style={{
            color: "#6b6b6b",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Verdict Score
        </span>
        <span
          className="text-5xl font-bold"
          style={{
            color: scoreColor(final.verdict.score),
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {final.verdict.score}
        </span>
        <span
          className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
          style={{
            background: scoreBg(final.verdict.score),
            color: scoreColor(final.verdict.score),
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {final.verdict.label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Critique Tab                                                       */
/* ------------------------------------------------------------------ */

function CritiqueTab({ trace }: { trace: AgentTrace }) {
  const { critique } = trace;

  return (
    <div className="flex flex-col gap-5">
      {/* Logical issues */}
      <Section title="⚠️ Logical Issues">
        <ul className="flex flex-col gap-2">
          {critique.logical_issues.map((issue, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed"
              style={{
                color: "#fbbf24",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span className="mt-0.5 flex-shrink-0">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Missing evidence */}
      <Section title="📋 Missing Evidence">
        <ul className="flex flex-col gap-2">
          {critique.missing_evidence.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed"
              style={{
                color: "#93c5fd",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span className="mt-0.5 flex-shrink-0">○</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Confidence bar */}
      <Section title="🎯 Critique Confidence">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            <span style={{ color: "#6b6b6b" }}>Low</span>
            <span style={{ color: confidenceBarColor(critique.confidence), fontWeight: 600 }}>
              {critique.confidence}%
            </span>
            <span style={{ color: "#6b6b6b" }}>High</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ background: "#1f1f1f" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${critique.confidence}%`,
                background: confidenceBarColor(critique.confidence),
              }}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Raw Initial Tab                                                    */
/* ------------------------------------------------------------------ */

function InitialTab({ trace }: { trace: AgentTrace }) {
  const { initial } = trace;

  return (
    <div className="flex flex-col gap-5">
      {/* Core claim */}
      <Section title="Core Claim (Initial)">
        <p
          className="text-base leading-relaxed"
          style={{
            color: "#e5e5e5",
            fontFamily: "Charter, Georgia, 'Times New Roman', serif",
          }}
        >
          {initial.core_claim}
        </p>
      </Section>

      {/* Arguments */}
      <Section title="📌 Arguments">
        <ul className="flex flex-col gap-2">
          {initial.arguments.map((arg, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed"
              style={{
                color: "#a5b4fc",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span className="mt-0.5 flex-shrink-0 text-xs font-semibold" style={{ color: "#6b6b6b" }}>
                {i + 1}.
              </span>
              <span>{arg}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Assumptions */}
      <Section title="🤔 Assumptions">
        <ul className="flex flex-col gap-2">
          {initial.assumptions.map((assumption, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed"
              style={{
                color: "#c4b5fd",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <span className="mt-0.5 flex-shrink-0 text-xs">◇</span>
              <span>{assumption}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared components                                                  */
/* ------------------------------------------------------------------ */

function Section({
  title,
  accentColor,
  children,
}: {
  title: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3
        className="text-xs uppercase tracking-wide font-semibold"
        style={{
          color: accentColor || "#6b6b6b",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {title}
      </h3>
      <div
        className="rounded-lg p-4"
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Color helpers                                                      */
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

function confidenceBarColor(confidence: number): string {
  if (confidence >= 70) return "#22c55e";
  if (confidence >= 40) return "#f59e0b";
  return "#ef4444";
}
