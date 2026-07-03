"use client";

import { useState } from "react";
import type { AgentTrace, UIStatus } from "@/types/analysis";

interface AnalysisPanelProps {
  result: AgentTrace | null;
  status: UIStatus;
}

function Section({
  title,
  items,
  borderColor = "border-blue-500",
}: {
  title: string;
  items: string[];
  borderColor?: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className={`bg-gray-800/50 rounded p-3 text-sm text-gray-300 border-l-2 ${borderColor}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-700/50 rounded"
          style={{ width: `${60 + Math.random() * 40}%` }}
        />
      ))}
    </div>
  );
}

export default function AnalysisPanel({
  result,
  status,
}: AnalysisPanelProps) {
  const [showCritique, setShowCritique] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Core Claim
          </h3>
          <div className="bg-gray-800/50 rounded p-4 border-l-2 border-blue-400">
            <SkeletonBlock lines={2} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Reading article & analyzing...
          </h3>
          <SkeletonBlock lines={4} />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p className="text-center">
          Enter an article and click Analyze
          <br />
          <span className="text-sm">Results will appear here</span>
        </p>
      </div>
    );
  }

  const { final: f, critique: c } = result;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Core Claim
        </h3>
        <div className="bg-gray-800/50 rounded p-4 border-l-2 border-blue-400">
          <p className="text-white font-medium">{f.core_claim}</p>
        </div>
      </div>

      <Section
        title="Supporting Arguments (Bull Case)"
        items={f.bull_case}
      />

      <Section
        title="Counterarguments (Bear Case)"
        items={f.bear_case}
        borderColor="border-orange-500"
      />

      <div className="border-t border-gray-700 pt-4 mt-2">
        <button
          onClick={() => setShowCritique(!showCritique)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-full text-left"
        >
          <svg
            className={`w-4 h-4 transition-transform shrink-0 ${showCritique ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span>Agent self-critique</span>
          {c.logical_issues.length + c.missing_evidence.length > 0 && (
            <span className="bg-red-900/50 text-red-400 text-xs px-2 py-0.5 rounded-full">
              {c.logical_issues.length + c.missing_evidence.length} issues
            </span>
          )}
          <span className="text-xs text-gray-600 ml-auto">
            confidence: {c.confidence}%
          </span>
        </button>

        {showCritique && (
          <div className="mt-3 space-y-4 bg-red-950/20 border border-red-900/30 rounded-lg p-4">
            {c.logical_issues.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">
                  Logical Issues
                </h4>
                <ul className="space-y-1.5">
                  {c.logical_issues.map((issue, i) => (
                    <li
                      key={i}
                      className="text-sm text-red-300 flex items-start gap-2"
                    >
                      <span className="text-red-500 mt-0.5 shrink-0">&#9888;</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.missing_evidence.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-yellow-400 mb-2">
                  Missing Evidence
                </h4>
                <ul className="space-y-1.5">
                  {c.missing_evidence.map((ev, i) => (
                    <li
                      key={i}
                      className="text-sm text-yellow-300 flex items-start gap-2"
                    >
                      <span className="text-yellow-500 mt-0.5 shrink-0">&#9650;</span>
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
