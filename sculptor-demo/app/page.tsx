"use client";

import { useState, useRef } from "react";
import InputPanel from "@/components/InputPanel";
import AnalysisPanel from "@/components/AnalysisPanel";
import RiskPanel from "@/components/RiskPanel";
import type { AgentTrace, UIStatus } from "@/types/analysis";

export default function Home() {
  const [result, setResult] = useState<AgentTrace | null>(null);
  const [status, setStatus] = useState<UIStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const analysisIdRef = useRef(0);

  const handleAnalyze = async (input: { url?: string; text?: string }) => {
    const analysisId = ++analysisIdRef.current;
    setError(null);

    if (result) {
      setStatus("refreshing");
    } else {
      setStatus("loading");
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      if (analysisId !== analysisIdRef.current) return;

      setResult(data as AgentTrace);
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      if (analysisId === analysisIdRef.current) {
        setStatus("error");
        setResult(null);
      }
    }
  };

  const isBusy = status === "loading" || status === "refreshing";

  return (
    <div className="min-h-screen flex flex-col">
      {status === "refreshing" && (
        <div className="h-1 bg-gray-800">
          <div className="h-full bg-blue-500 animate-pulse" />
        </div>
      )}

      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <h1 className="text-xl font-bold text-white">Sculptor</h1>
          <span className="text-xs text-gray-500 border border-gray-700 rounded px-2 py-0.5">
            Adversarial Reading Engine
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 min-h-0">
        <div className="h-full flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/4 lg:min-w-[280px]">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 lg:h-full overflow-y-auto">
              <InputPanel onAnalyze={handleAnalyze} disabled={isBusy} />
            </div>
          </div>

          <div className="lg:w-2/4 flex-1">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 lg:h-full overflow-y-auto">
              <AnalysisPanel result={result} status={status} />
            </div>
          </div>

          <div className="lg:w-1/4 lg:min-w-[280px]">
            <div className="bg-gray-900/50 border border-red-900/40 rounded-xl p-4 lg:h-full overflow-y-auto">
              <RiskPanel result={result} status={status} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
