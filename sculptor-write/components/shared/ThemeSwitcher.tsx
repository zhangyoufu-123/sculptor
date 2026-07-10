"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "sculptor-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      className="btn-icon"
      title={theme === "light" ? "切换深色模式" : "切换亮色模式"}
      onClick={toggle}
      style={{ fontSize: 14 }}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
