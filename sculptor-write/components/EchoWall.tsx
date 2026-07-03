"use client";

import { useState } from "react";
import { useUIStore } from "@/lib/store";
import type { MasterQuote, SearchResult } from "@/types/editor";

interface EchoWallProps {
  analysisText: string;
  analysisLoading: boolean;
  inspiration: string;
  inspirationLoading: boolean;
  masterQuotes: MasterQuote[];
  searchResults: SearchResult[];
  searchLoading: boolean;
  onAdopt: (text: string) => void;
  onStyleSetupClick: () => void;
  onSearch: (query: string) => void;
}

export default function EchoWall({
  analysisText,
  analysisLoading,
  inspiration,
  inspirationLoading,
  masterQuotes,
  searchResults,
  searchLoading,
  onAdopt,
  onStyleSetupClick,
  onSearch,
}: EchoWallProps) {
  const styleProfile = useUIStore((s) => s.styleProfile);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed || searchLoading) return;
    onSearch(trimmed);
  };

  // Parse analysis text into bullet points
  const parseBullets = (text: string): string[] => {
    // Split on Chinese sentence-ending punctuation or period
    const sentences = text
      .split(/[。！？\.!\?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
    if (sentences.length <= 1) return [text.trim()];
    return sentences.slice(0, 3);
  };

  const analysisBullets = analysisText ? parseBullets(analysisText) : [];

  return (
    <aside
      style={{
        position: "fixed",
        right: 0,
        top: 48,
        width: 320,
        height: "calc(100vh - 48px)",
        background: "#0d0d0d",
        borderLeft: "1px solid #1a1a1a",
        overflowY: "auto",
        overflowX: "hidden",
        zIndex: 20,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          Layer 1: 即时共振 (Instant Resonance)
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 8,
          background: "#0d0d0d",
          border: "1px solid #111111",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: analysisBullets.length > 0 ? 8 : 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#8a8578",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            即时共振
          </span>
          {analysisLoading && (
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#c4a565",
                display: "inline-block",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {analysisLoading && !analysisText ? (
          <div
            style={{
              height: 20,
              borderRadius: 4,
              background: "#141414",
            }}
          />
        ) : analysisBullets.length > 0 ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {analysisBullets.map((bullet, i) => (
              <li
                key={i}
                style={{
                  color: "#8a8578",
                  fontSize: 12,
                  lineHeight: 1.6,
                  position: "relative",
                  paddingLeft: 10,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: -10,
                    top: 6,
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#8a8578",
                    display: "inline-block",
                  }}
                />
                {bullet}
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              color: "#8a8578",
              fontSize: 12,
              lineHeight: 1.6,
              margin: 0,
              opacity: 0.5,
            }}
          >
            等待第一个文字...
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Layer 2: 灵感共振 (Inspiration Resonance)
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#141414",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#c4a565",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            灵感共振
          </span>
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            {"✨"}
          </span>
          {inspirationLoading && (
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#c4a565",
                display: "inline-block",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* Sub-section A: AI inspiration */}
        {inspirationLoading ? (
          <div
            style={{
              height: 40,
              borderRadius: 4,
              background: "#1a1a1a",
            }}
          />
        ) : inspiration ? (
          <div style={{ marginBottom: masterQuotes.length > 0 ? 14 : 0 }}>
            <p
              style={{
                color: "#a09888",
                fontSize: 13,
                lineHeight: 1.6,
                margin: "0 0 10px",
              }}
            >
              {inspiration}
            </p>
            <button
              onClick={() => onAdopt(inspiration)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #2a2a2a",
                background: "transparent",
                color: "#8a8578",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c4a565";
                e.currentTarget.style.color = "#c4a565";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#8a8578";
              }}
            >
              点击采纳
            </button>
          </div>
        ) : (
          <p
            style={{
              color: "#8a8578",
              fontSize: 13,
              lineHeight: 1.6,
              margin: "0 0 14px",
              opacity: 0.5,
            }}
          >
            在卡壳时，我会轻声给你灵感...
          </p>
        )}

        {/* Sub-section B: 名家共鸣 (Master Quotes) */}
        {masterQuotes.length > 0 && (
          <div
            style={{
              borderTop: "1px solid #1a1a1a",
              paddingTop: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#8a8578",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
                display: "block",
              }}
            >
              名家共鸣
            </span>
            {masterQuotes.map((q, i) => (
              <div
                key={i}
                style={{
                  marginBottom: i < masterQuotes.length - 1 ? 10 : 0,
                  paddingLeft: 10,
                  borderLeft: "2px solid #2a2a2a",
                }}
              >
                <p
                  style={{
                    color: "#c0b8a0",
                    fontSize: 13,
                    lineHeight: 1.6,
                    margin: "0 0 2px",
                    fontStyle: "italic",
                  }}
                >
                  {q.text}
                </p>
                <span
                  style={{
                    color: "#6a6558",
                    fontSize: 11,
                  }}
                >
                  — {q.author}《{q.source}》
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Layer 3: 网络共振 (Web Resonance)
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#141414",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: searchOpen || searchResults.length > 0 ? 12 : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#c4a565",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              网络共振
            </span>
            <span style={{ fontSize: 13, opacity: 0.7 }}>
              {"🌐"}
            </span>
          </div>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid #2a2a2a",
              background: "transparent",
              color: "#8a8578",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c4a565";
              e.currentTarget.style.color = "#c4a565";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#8a8578";
            }}
          >
            {searchOpen ? "收起" : "搜索"}
          </button>
        </div>

        {/* Search input (hidden by default) */}
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            style={{ marginBottom: 12 }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索背景知识..."
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #2a2a2a",
                  background: "#0d0d0d",
                  color: "#e0d8c8",
                  fontSize: 12,
                  fontFamily: "inherit",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#c4a565";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              />
              <button
                type="submit"
                disabled={searchLoading}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #c4a565",
                  background: "transparent",
                  color: "#c4a565",
                  fontSize: 12,
                  cursor: searchLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: searchLoading ? 0.5 : 1,
                }}
              >
                {searchLoading ? "..." : "→"}
              </button>
            </div>
          </form>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#8a8578",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 2,
                display: "block",
              }}
            >
              背景知识
            </span>
            {searchResults.map((result, i) => (
              <div
                key={i}
                style={{
                  background: "#1a1a1a",
                  borderLeft: "2px solid #c4a565",
                  borderRadius: "0 6px 6px 0",
                  padding: "10px 12px",
                }}
              >
                <p
                  style={{
                    color: "#c0b8a0",
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    margin: "0 0 4px",
                  }}
                >
                  {result.title}
                </p>
                <p
                  style={{
                    color: "#8a8578",
                    fontSize: 11,
                    lineHeight: 1.5,
                    margin: "0 0 4px",
                  }}
                >
                  {result.snippet.length > 100
                    ? result.snippet.slice(0, 100) + "..."
                    : result.snippet}
                </p>
                <span
                  style={{
                    color: "#6a6558",
                    fontSize: 10,
                  }}
                >
                  {result.source}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!searchOpen && searchResults.length === 0 && (
          <p
            style={{
              color: "#8a8578",
              fontSize: 12,
              lineHeight: 1.6,
              margin: 0,
              opacity: 0.5,
            }}
          >
            搜索相关背景知识，丰富你的写作...
          </p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Style Fingerprint (kept from original)
          ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "#141414",
          border: "1px solid #1a1a1a",
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#c4a565",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            风格指纹
          </span>
          {styleProfile && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#c4a565",
                display: "inline-block",
              }}
            />
          )}
        </div>

        {styleProfile && styleProfile.keywords && styleProfile.keywords.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {styleProfile.keywords.slice(0, 5).map((kw) => (
              <span
                key={kw}
                style={{
                  padding: "3px 10px",
                  borderRadius: 16,
                  background: "#1a1a1a",
                  border: "1px solid #c4a565",
                  color: "#e0d8c8",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <div>
            <p
              style={{
                color: "#8a8578",
                fontSize: 13,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              上传一篇历史文本以生成风格指纹
            </p>
            <button
              onClick={onStyleSetupClick}
              style={{
                marginTop: 8,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #2a2a2a",
                background: "transparent",
                color: "#c4a565",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c4a565";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
            >
              设置风格 →
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
