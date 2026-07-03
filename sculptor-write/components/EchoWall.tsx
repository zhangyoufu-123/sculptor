"use client";

import { useUIStore } from "@/lib/store";

interface EchoWallProps {
  analysisText: string;
  analysisLoading: boolean;
  inspiration: string;
  inspirationLoading: boolean;
  onAdopt: (text: string) => void;
  onStyleSetupClick: () => void;
}

export default function EchoWall({
  analysisText,
  analysisLoading,
  inspiration,
  inspirationLoading,
  onAdopt,
  onStyleSetupClick,
}: EchoWallProps) {
  const styleProfile = useUIStore((s) => s.styleProfile);

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
      {/* ── Card 1: Style Fingerprint ──────────────────────────── */}
      <div
        className="echo-card"
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
              className="pulse-indicator"
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

      {/* ── Card 2: Real-time Analysis ─────────────────────────── */}
      <div
        className="echo-card"
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
            实时分析
          </span>
          {analysisLoading && (
            <span
              className="breath-indicator"
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

        {analysisLoading && !analysisText ? (
          <div
            className="shimmer-box"
            style={{
              height: 40,
              borderRadius: 4,
              background: "#1a1a1a",
            }}
          />
        ) : analysisText ? (
          <p
            style={{
              color: "#8a8578",
              fontSize: 13,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {analysisText}
          </p>
        ) : (
          <p
            style={{
              color: "#8a8578",
              fontSize: 13,
              lineHeight: 1.6,
              margin: 0,
              opacity: 0.6,
            }}
          >
            开始写作，我会安静地阅读...
          </p>
        )}
      </div>

      {/* ── Card 3: Inspiration ─────────────────────────────────── */}
      <div
        className="echo-card"
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
            灵感
          </span>
          <span style={{ fontSize: 14, opacity: 0.6 }}>💡</span>
        </div>

        {inspirationLoading ? (
          <div
            className="shimmer-box"
            style={{
              height: 40,
              borderRadius: 4,
              background: "#1a1a1a",
            }}
          />
        ) : inspiration ? (
          <div>
            <p
              className="inspiration-text"
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
              className="adopt-btn"
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
              margin: 0,
              opacity: 0.6,
            }}
          >
            在卡壳时，我会轻声给你灵感...
          </p>
        )}
      </div>
    </aside>
  );
}
