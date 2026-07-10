"use client";

import { useState } from "react";

interface StyleEvolutionProps {
  nodes?: { id: string; title: string; type: string }[];
}

// Mock style data across 5 sections
const STYLE_POINTS = [
  { label: "第1段", sentLen: 14, imagery: 55, restraint: 70, rhetoric: 40, pace: 60 },
  { label: "第2段", sentLen: 17, imagery: 60, restraint: 65, rhetoric: 45, pace: 55 },
  { label: "第3段", sentLen: 19, imagery: 58, restraint: 55, rhetoric: 50, pace: 50 },
  { label: "第4段", sentLen: 22, imagery: 65, restraint: 48, rhetoric: 55, pace: 45 },
  { label: "第5段", sentLen: 25, imagery: 70, restraint: 40, rhetoric: 60, pace: 40 },
];

const AXES = [
  { key: "sentLen", label: "句长", angle: -90 },
  { key: "imagery", label: "意象新颖度", angle: -18 },
  { key: "restraint", label: "语气克制度", angle: 54 },
  { key: "rhetoric", label: "修辞密度", angle: 126 },
  { key: "pace", label: "节奏快慢", angle: 198 },
];

const CX = 150;
const CY = 150;
const R = 100;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pentagonPoints(cx: number, cy: number, r: number) {
  return [0, 72, 144, 216, 288]
    .map((a) => polarToCartesian(cx, cy, r, a))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
}

export default function StyleEvolution({ nodes: _nodes }: StyleEvolutionProps) {
  const [observationDismissed, setObservationDismissed] = useState(false);
  const [observationAction, setObservationAction] = useState<string | null>(null);

  const currentPoint = STYLE_POINTS[STYLE_POINTS.length - 1];
  const dataValues = AXES.map((a) => currentPoint[a.key as keyof typeof currentPoint] as number);

  // Data polygon points
  const dataPolygonPts = AXES.map((_, i) => {
    const val = dataValues[i];
    const r = (val / 100) * R;
    return polarToCartesian(CX, CY, r, AXES[i].angle);
  })
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  const handleAction = (action: string) => {
    setObservationAction(action);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "0 4px",
      }}
    >
      {/* ── Radar Chart ── */}
      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          风格雷达
        </span>
      </div>
      <svg
        viewBox="0 0 300 300"
        style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "block" }}
      >
        {/* Concentric pentagons at 20/40/60/80/100% */}
        {[20, 40, 60, 80, 100].map((pct) => (
          <polygon
            key={pct}
            points={pentagonPoints(CX, CY, (pct / 100) * R)}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={pct === 100 ? 1 : 0.5}
            opacity={pct === 100 ? 0.6 : 0.3}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((axis, i) => {
          const end = polarToCartesian(CX, CY, R * 1.02, axis.angle);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke="var(--border-light)"
              strokeWidth={0.5}
              opacity={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={dataPolygonPts}
          fill="#c9a95c"
          fillOpacity={0.15}
          stroke="#c9a95c"
          strokeWidth={1.5}
        />

        {/* Data points */}
        {AXES.map((axis, i) => {
          const val = dataValues[i];
          const r = (val / 100) * R;
          const pt = polarToCartesian(CX, CY, r, axis.angle);
          return (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill="#c9a95c"
              stroke="var(--bg-secondary)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis labels at 120% radius */}
        {AXES.map((axis, i) => {
          const pt = polarToCartesian(CX, CY, R * 1.22, axis.angle);
          const fontSize = 10;
          // Adjust text-anchor based on position
          let anchor: "middle" | "end" | "start" = "middle";
          if (axis.angle < -30 || axis.angle > 210) anchor = "end";
          else if (axis.angle > 150) anchor = "start";

          return (
            <text
              key={i}
              x={pt.x}
              y={pt.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="var(--text-tertiary)"
              fontSize={fontSize}
            >
              {axis.label}
            </text>
          );
        })}
      </svg>

      {/* ── Line Chart: Sentence Length Trend ── */}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
          句长趋势（字/句）
        </div>
        <svg
          viewBox="0 0 260 100"
          style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }}
        >
          {/* Grid lines */}
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1={0}
              y1={y}
              x2={260}
              y2={y}
              stroke="var(--border-light)"
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
          {/* Y axis labels */}
          {[10, 15, 20, 25, 30].map((val, i) => {
            const y = 100 - (val / 30) * 90;
            return (
              <text
                key={i}
                x={0}
                y={y}
                fill="var(--text-tertiary)"
                fontSize={9}
                textAnchor="start"
                dominantBaseline="middle"
              >
                {val}
              </text>
            );
          })}
          {/* Line */}
          <polyline
            points={STYLE_POINTS.map((p, i) => {
              const x = 20 + i * 55;
              const y = 100 - (p.sentLen / 30) * 90;
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="#5B8DEF"
            strokeWidth={2}
          />
          {/* Dots */}
          {STYLE_POINTS.map((p, i) => {
            const x = 20 + i * 55;
            const y = 100 - (p.sentLen / 30) * 90;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3.5}
                fill="#5B8DEF"
                stroke="var(--bg-secondary)"
                strokeWidth={1.5}
              />
            );
          })}
          {/* X labels */}
          {STYLE_POINTS.map((p, i) => {
            const x = 20 + i * 55;
            return (
              <text
                key={i}
                x={x}
                y={98}
                fill="var(--text-tertiary)"
                fontSize={8}
                textAnchor="middle"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* ── Style Observation Card ── */}
      {!observationDismissed && observationAction === null && (
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: 8,
            padding: 12,
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          >
            最近3段句式明显变长（14→25字），是有意调整？
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => handleAction("keep")}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid var(--gold)",
                background: "transparent",
                color: "var(--gold)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              保持新风格
            </button>
            <button
              onClick={() => handleAction("revert")}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid var(--border-light)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              回到旧风格
            </button>
            <button
              onClick={() => setObservationDismissed(true)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid var(--border-light)",
                background: "transparent",
                color: "var(--text-tertiary)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {observationAction !== null && (
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: 8,
            padding: 10,
            border: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          {observationAction === "keep"
            ? "已记录：保持新风格偏好"
            : "已记录：回归旧风格偏好"}
        </div>
      )}
    </div>
  );
}
