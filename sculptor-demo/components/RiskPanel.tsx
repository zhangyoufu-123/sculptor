"use client";

import type { AgentTrace, UIStatus } from "@/types/analysis";

interface RiskPanelProps {
  result: AgentTrace | null;
  status: UIStatus;
}

function scoreColor(score: number): {
  bg: string;
  border: string;
  text: string;
  label: string;
  bar: string;
} {
  if (score < 40) {
    return { bg: "bg-red-900/30", border: "border-red-500", text: "text-red-400", label: "High Risk", bar: "bg-red-500" };
  }
  if (score < 70) {
    return { bg: "bg-yellow-900/30", border: "border-yellow-500", text: "text-yellow-400", label: "Moderate Risk", bar: "bg-yellow-500" };
  }
  return { bg: "bg-green-900/30", border: "border-green-500", text: "text-green-400", label: "Low Risk", bar: "bg-green-500" };
}

export default function RiskPanel({ result, status }: RiskPanelProps) {
  if (status === "loading") {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-gray-800/30 border border-gray-700 border-2 rounded-xl p-6 text-center animate-pulse">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full mx-auto mb-3" />
          <div className="h-4 bg-gray-700/50 rounded w-20 mx-auto" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-700/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-center text-sm">Risk assessment will appear here</p>
      </div>
    );
  }

  const { verdict } = result.final;
  const colors = scoreColor(verdict.score);

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`${colors.bg} ${colors.border} border-2 rounded-xl p-6 text-center`}
      >
        <div className={`text-5xl font-bold ${colors.text}`}>
          {verdict.score}
        </div>
        <div className={`text-sm font-semibold mt-1 ${colors.text}`}>
          {verdict.label}
        </div>
        <div className="text-xs text-gray-500 mt-2">{colors.label}</div>

        <div className="w-full bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${verdict.score}%` }}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400 mb-2">
          Hidden Assumptions
        </h3>
        <ul className="space-y-2">
          {result.final.hidden_assumptions.map((item, i) => (
            <li
              key={i}
              className="bg-red-900/20 border border-red-800/40 rounded p-3 text-sm text-gray-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400 mb-2">
          Decision Risks
        </h3>
        <ul className="space-y-2">
          {result.final.decision_risks.map((item, i) => (
            <li
              key={i}
              className="bg-red-900/20 border border-red-800/40 rounded p-3 text-sm text-gray-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
