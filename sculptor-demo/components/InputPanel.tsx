"use client";

import { useState, useEffect } from "react";

const LOADING_STAGES = [
  "Reading article...",
  "Reasoning...",
  "Finding logical weaknesses...",
  "Refining analysis...",
];

interface InputPanelProps {
  onAnalyze: (input: { url?: string; text?: string }) => void;
  disabled: boolean;
}

export default function InputPanel({ onAnalyze, disabled }: InputPanelProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!disabled) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (disabled) return;

    const trimmedUrl = url.trim();
    const trimmedText = text.trim();

    if (!trimmedUrl && !trimmedText) {
      setValidationError("Please provide a URL or paste article text.");
      return;
    }

    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        setValidationError("Please enter a valid URL (e.g. https://example.com/article).");
        return;
      }
      onAnalyze({ url: trimmedUrl });
    } else {
      onAnalyze({ text: trimmedText });
    }
  };

  const inputGiven = url.trim() || text.trim();

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold mb-4 text-white">Input</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <div>
          <label className="block text-sm text-gray-400 mb-1" htmlFor="url">
            Article URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span className="flex-1 border-t border-gray-700" />
          <span>or</span>
          <span className="flex-1 border-t border-gray-700" />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1" htmlFor="text">
            Paste Article Text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the article content here..."
            className="w-full h-40 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            disabled={disabled}
          />
        </div>
        {validationError && (
          <div className="bg-red-900/30 border border-red-800 rounded px-3 py-2 text-red-400 text-sm">
            {validationError}
          </div>
        )}
        <button
          type="submit"
          disabled={disabled || !inputGiven}
          className="w-full py-3 rounded font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors flex items-center justify-center gap-2"
        >
          {disabled ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>{LOADING_STAGES[stageIndex]}</span>
            </>
          ) : (
            "Analyze"
          )}
        </button>
      </form>
    </div>
  );
}
