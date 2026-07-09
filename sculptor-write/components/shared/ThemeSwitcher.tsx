"use client";

import { useState, useEffect } from "react";

type Theme = "warm-night" | "dawn" | "inkstone" | "bamboo";

const THEMES: { id: Theme; name: string; icon: string }[] = [
  { id: "warm-night", name: "暖夜", icon: "🌙" },
  { id: "dawn", name: "晨曦", icon: "☀️" },
  { id: "inkstone", name: "墨砚", icon: "🖋️" },
  { id: "bamboo", name: "竹林", icon: "🎋" },
];

const STORAGE_KEY = "sculptor-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "warm-night";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && THEMES.some((t) => t.id === stored)) return stored as Theme;
  return "warm-night";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("warm-night");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn-icon"
        title={`主题：${current.name}`}
        onClick={() => setOpen((o) => !o)}
        style={{ fontSize: 14 }}
      >
        {current.icon}
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 90 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 0,
              zIndex: 100,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 140,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  applyTheme(t.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: t.id === theme ? "var(--bg-tertiary)" : "transparent",
                  color: t.id === theme ? "var(--gold)" : "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-ui)",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span>{t.name}</span>
                {t.id === theme && (
                  <span style={{ marginLeft: "auto", color: "var(--gold)", fontSize: 12 }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
