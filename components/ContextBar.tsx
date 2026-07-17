/**
 * Context Bar — global persistent top bar across Discover/Outline/Write.
 *
 * Shows: proposition, assumptions, progress, evidence, position.
 * Single source of truth for thinking context. Always visible.
 */

"use client";

import { useStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback } from "react";

const C = {
  bg: "var(--surface-panel, #1a1a1a)",
  border: "var(--border-subtle, #333)",
  text: "var(--text-primary, #eee)",
  textSecondary: "var(--text-secondary, #999)",
  accent: "var(--color-brand-500, #c9a95c)",
  accentBg: "rgba(201,169,92,0.1)",
  pill: "var(--surface-elevated, #222)",
  font: "var(--font-ui, system-ui)",
  h: 48,
};

export default function ContextBar() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    proposition, updateProposition,
    assumptions, addAssumption, removeAssumption,
    progress,
    evidenceCount, position,
  } = useStore();

  const [editingProposition, setEditingProposition] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const pages = [
    { label: "Discover", path: "/discover" },
    { label: "Outline", path: "/discover" }, // outline is within discover flow
    { label: "Write", path: "/write" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: C.h,
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 16px",
        fontFamily: C.font,
        fontSize: 13,
        gap: 16,
        flexShrink: 0,
        zIndex: 50,
        position: "relative",
      }}
    >
      {/* Logo + Page Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span
          style={{ fontWeight: 700, fontSize: 15, color: C.accent, cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          Sculptor
        </span>
        {pages.map((p) => (
          <button
            key={p.path}
            onClick={() => router.push(p.path)}
            style={{
              background: pathname === p.path || (p.label === "Outline" && pathname === "/discover")
                ? C.accentBg : "transparent",
              border: "none",
              color: pathname === p.path || (p.label === "Outline" && pathname === "/discover")
                ? C.accent : C.textSecondary,
              padding: "4px 10px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: pathname === p.path ? 600 : 400,
              fontFamily: C.font,
              transition: "all 150ms",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

      {/* Proposition */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {editingProposition ? (
          <input
            value={proposition}
            onChange={(e) => updateProposition(e.target.value)}
            onBlur={() => setEditingProposition(false)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditingProposition(false); }}
            autoFocus
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${C.accent}`,
              color: C.text,
              fontSize: 14,
              fontWeight: 500,
              outline: "none",
              fontFamily: C.font,
              flex: 1,
              minWidth: 0,
            }}
            placeholder="输入当前命题..."
          />
        ) : (
          <span
            onClick={() => setEditingProposition(true)}
            style={{
              cursor: "pointer",
              color: C.text,
              fontSize: 14,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              borderBottom: "1px dashed transparent",
              paddingBottom: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderBottomColor = C.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderBottomColor = "transparent"; }}
          >
            {proposition || "输入你的灵感..."}
          </span>
        )}
      </div>

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {assumptions.slice(0, 3).map((a, i) => (
            <span
              key={i}
              style={{
                background: C.pill,
                color: C.textSecondary,
                padding: "2px 10px",
                borderRadius: 99,
                fontSize: 11,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() => removeAssumption(i)}
              title={`${a} (点击移除)`}
            >
              {a.length > 12 ? a.slice(0, 12) + "…" : a}
            </span>
          ))}
          {assumptions.length > 3 && (
            <span style={{ fontSize: 11, color: C.textSecondary, padding: "2px 4px" }}>
              +{assumptions.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Divider */}
      {assumptions.length > 0 && (
        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
      )}

      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.textSecondary, whiteSpace: "nowrap" }}>
          深度 {progress}%
        </span>
        <div style={{
          width: 60, height: 4,
          background: "var(--surface-hover, #333)",
          borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: progress >= 80 ? "#4ade80" : progress >= 50 ? C.accent : "#f59e0b",
            borderRadius: 2, transition: "width 0.5s",
          }} />
        </div>
      </div>

      {/* Evidence + Position */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, fontSize: 11 }}>
        {evidenceCount > 0 && (
          <span style={{ color: C.textSecondary, whiteSpace: "nowrap" }}>
            📋 {evidenceCount} 条证据
          </span>
        )}
        {position && (
          <span style={{
            color: C.textSecondary,
            whiteSpace: "nowrap",
            maxWidth: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
            cursor: "pointer",
          }}
            title={position}
          >
            💡 {position.length > 20 ? position.slice(0, 20) + "…" : position}
          </span>
        )}
      </div>

      {/* Command button */}
      <button
        onClick={() => setShowCommandPalette(!showCommandPalette)}
        style={{
          background: "transparent",
          border: `1px solid ${C.border}`,
          color: C.textSecondary,
          padding: "4px 12px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: C.font,
          flexShrink: 0,
        }}
      >
        ⌘K
      </button>
    </div>
  );
}
