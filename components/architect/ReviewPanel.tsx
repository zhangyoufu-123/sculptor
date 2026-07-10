"use client";

import { useState } from "react";
import { useArchitectStore } from "@/store/architect-store";
import type { ReviewResult } from "@/types/architect";

export default function ReviewPanel() {
  const nodes = useArchitectStore((s) => s.nodes);
  const edges = useArchitectStore((s) => s.edges);
  const reviewIssues = useArchitectStore((s) => s.reviewIssues);
  const reviewScore = useArchitectStore((s) => s.reviewScore);
  const setReview = useArchitectStore((s) => s.setReview);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleReview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/architect/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      if (res.ok) {
        const data: ReviewResult = await res.json();
        setReview(data.issues || [], data.overallScore || 0);
        setExpanded(true);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "absolute", top: 8, right: 8, zIndex: 20 }}>
      <button
        onClick={handleReview}
        disabled={loading || nodes.length === 0}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          border: "1px solid #333",
          background: "#141414",
          color: loading ? "#666" : "#c4a565",
          fontSize: 12,
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "审查中..." : "🔍 逻辑审查"}
      </button>

      {expanded && reviewIssues.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#141414",
            border: "1px solid #2a2a2a",
            width: 240,
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          <div style={{ fontSize: 12, color: "#c4a565", marginBottom: 8 }}>
            综合评分: {reviewScore}/100
          </div>
          {reviewIssues.map((issue, i) => (
            <div
              key={i}
              style={{
                padding: "4px 0",
                borderTop: "1px solid #1a1a1a",
                fontSize: 11,
                color: issue.severity === "red" ? "#e74c3c" : issue.severity === "yellow" ? "#f39c12" : "#4caf50",
              }}
            >
              <strong>{issue.severity === "red" ? "🔴" : issue.severity === "yellow" ? "🟡" : "🟢"}</strong>{" "}
              {issue.message}
              <div style={{ color: "#888", marginTop: 2 }}>{issue.suggestion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
