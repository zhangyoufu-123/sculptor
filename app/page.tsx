"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ThemeSwitcher from "@/components/shared/ThemeSwitcher";

const ANCHOR_KEY = "sculptor-anchor";
const SAVED_STATE_KEY = "sculptor-saved-state";

function hasSavedState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SAVED_STATE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
}

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState("");
  const [savedStateExists, setSavedStateExists] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSavedStateExists(hasSavedState());

    // Focus input on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = () => {
    const trimmed = anchor.trim();
    if (!trimmed) return;

    try {
      localStorage.setItem(ANCHOR_KEY, trimmed);
    } catch {
      // localStorage unavailable — proceed anyway
    }

    router.push("/discover");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!mounted) {
    return (
      <div
        style={{
          height: "100vh",
          background: "var(--bg-primary)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-ui)",
        padding: "32px 24px",
        animation: "fadeIn 0.5s ease",
        position: "relative",
      }}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ThemeSwitcher in top-right corner */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 24,
        }}
      >
        <ThemeSwitcher />
      </div>

      {/* Main content */}
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Heading */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 12px 0",
            letterSpacing: "0.02em",
          }}
        >
          今天你想思考什么？
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 14,
            color: "var(--text-tertiary)",
            margin: "0 0 40px 0",
            lineHeight: 1.6,
          }}
        >
          一句话、一个问题、几个关键词都可以
        </p>

        {/* Anchor input */}
        <input
          ref={inputRef}
          type="text"
          value={anchor}
          onChange={(e) => setAnchor(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：为什么AI产品越来越像聊天机器人？"
          style={{
            width: "100%",
            padding: "16px 20px",
            fontSize: 16,
            fontFamily: "var(--font-ui)",
            color: "var(--text-primary)",
            background: "white",
            border: "1.5px solid var(--border-light)",
            borderRadius: 12,
            outline: "none",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-gold)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,169,92,0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-light)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />

        {/* Bottom links */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            marginTop: 32,
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}
        >
          {savedStateExists && (
            <span
              onClick={() => router.push("/discover")}
              style={{
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-gold)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              继续上次思考
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
