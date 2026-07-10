"use client";

import type { HealthReport, FindingSeverity } from "@/types/health";
import { useState } from "react";

interface DocumentHealthProps {
  report: HealthReport | null;
  loading: boolean;
  onJumpTo: (position: number) => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  characterConsistency: "角色一致性",
  timeline: "时间线",
  logicChain: "逻辑链",
  duplicates: "重复检测",
};

const SEVERITY_COLORS: Record<FindingSeverity, { bg: string; text: string; border: string }> = {
  error: {
    bg: "rgba(224, 85, 85, 0.1)",
    text: "#E05555",
    border: "rgba(224, 85, 85, 0.3)",
  },
  warning: {
    bg: "rgba(230, 168, 23, 0.1)",
    text: "#E6A817",
    border: "rgba(230, 168, 23, 0.3)",
  },
  info: {
    bg: "rgba(74, 144, 217, 0.1)",
    text: "#4A90D9",
    border: "rgba(74, 144, 217, 0.3)",
  },
};

const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  error: "严重",
  warning: "注意",
  info: "提示",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--error)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontSize: "var(--text-xs)",
      }}
    >
      <span
        style={{
          width: 64,
          flexShrink: 0,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "var(--surface-hover)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            borderRadius: 2,
            background: color,
            transition: "width var(--duration-slow) var(--ease-out)",
          }}
        />
      </div>
      <span
        style={{
          width: 28,
          textAlign: "right",
          color: color,
          fontWeight: 600,
          fontSize: "var(--text-xs)",
        }}
      >
        {score}
      </span>
    </div>
  );
}

export default function DocumentHealth({
  report,
  loading,
  onJumpTo,
}: DocumentHealthProps) {
  const [collapsed, setCollapsed] = useState(false);

  // 加载状态
  if (loading) {
    return (
      <div
        style={{
          padding: "var(--card-padding)",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          animation: "fadeIn var(--duration-normal) var(--ease-out)",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-3)",
          }}
        >
          文档健康检查
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 12,
                  borderRadius: 4,
                  background: "var(--skeleton-start)",
                  animation: "skeleton-pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: "var(--skeleton-start)",
                  animation: "skeleton-pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: 28,
                  height: 12,
                  borderRadius: 4,
                  background: "var(--skeleton-start)",
                  animation: `skeleton-pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: "var(--space-3)",
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          正在分析文档...
        </div>
      </div>
    );
  }

  // 空状态
  if (!report) {
    return (
      <div
        style={{
          padding: "var(--card-padding)",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            fontStyle: "italic",
          }}
        >
          运行 /health 检查文档
        </div>
      </div>
    );
  }

  // 无问题
  if (report.findings.length === 0) {
    return (
      <div
        style={{
          padding: "var(--card-padding)",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
            文档健康检查
          </span>
          <span
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--success)",
            }}
          >
            {report.overallScore}
          </span>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
          }}
        >
          文档状态良好，未发现明显问题
        </div>
      </div>
    );
  }

  const errorCount = report.findings.filter((f) => f.severity === "error").length;
  const warningCount = report.findings.filter((f) => f.severity === "warning").length;
  const infoCount = report.findings.filter((f) => f.severity === "info").length;

  return (
    <div
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        animation: "fadeIn var(--duration-normal) var(--ease-out)",
      }}
    >
      {/* 头部 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "var(--card-padding)",
          background: "transparent",
          border: "none",
          color: "var(--text-primary)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span>文档健康检查</span>
          <div style={{ display: "flex", gap: 4 }}>
            {errorCount > 0 && (
              <span
                style={{
                  backgroundColor: "var(--error)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span
                style={{
                  backgroundColor: "var(--warning)",
                  color: "#1E1B18",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                {warningCount}
              </span>
            )}
            {infoCount > 0 && (
              <span
                style={{
                  backgroundColor: "var(--color-info)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                {infoCount}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span
            style={{
              fontSize: "var(--text-md)",
              fontWeight: 700,
              color:
                report.overallScore >= 80
                  ? "var(--success)"
                  : report.overallScore >= 60
                    ? "var(--warning)"
                    : "var(--error)",
            }}
          >
            {report.overallScore}
          </span>
          <span
            style={{
              color: "var(--text-tertiary)",
              fontSize: "var(--text-xs)",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform var(--duration-fast) var(--ease-out)",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* 内容区 - 可折叠 */}
      {!collapsed && (
        <div
          style={{
            padding: "0 var(--card-padding) var(--card-padding)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {/* 维度评分条 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              padding: "var(--space-2)",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {Object.entries(report.dimensions).map(([key, score]) => (
              <ScoreBar key={key} label={DIMENSION_LABELS[key] || key} score={score} />
            ))}
          </div>

          {/* 问题列表 */}
          {report.findings.map((finding, index) => {
            const colors = SEVERITY_COLORS[finding.severity];
            return (
              <button
                key={index}
                onClick={() => onJumpTo(finding.position)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-1)",
                  padding: "var(--space-2)",
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "var(--font-ui)",
                  transition: "all var(--duration-fast) var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.bg.replace("0.1", "0.2");
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.bg;
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: "var(--radius-sm)",
                      background: colors.text,
                      color: finding.severity === "warning" ? "#1E1B18" : "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {SEVERITY_LABELS[finding.severity]}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {DIMENSION_LABELS[finding.type] || finding.type}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                  }}
                >
                  {finding.message}
                </div>
                {finding.snippet && (
                  <div
                    style={{
                      marginTop: "var(--space-1)",
                      padding: "var(--space-2)",
                      background: "var(--surface-elevated)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                      borderLeft: `2px solid ${colors.text}`,
                    }}
                  >
                    {finding.snippet.length > 120
                      ? finding.snippet.slice(0, 120) + "…"
                      : finding.snippet}
                  </div>
                )}
              </button>
            );
          })}

          {/* 底部时间戳 */}
          <div
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              textAlign: "right",
            }}
          >
            {new Date(report.generatedAt).toLocaleString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>
      )}
    </div>
  );
}
