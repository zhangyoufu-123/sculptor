"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadAllDocMeta,
  hasArchitecture,
  loadArchitecture,
  loadWritingHistory,
} from "@/lib/local-store";
import type { DocMeta } from "@/lib/local-store";
import type { WritingSession } from "@/lib/local-store";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [history, setHistory] = useState<WritingSession[]>([]);
  const [hasArch, setHasArch] = useState(false);
  const [archTitle, setArchTitle] = useState("");

  useEffect(() => {
    setMounted(true);
    setDocs(loadAllDocMeta().slice(0, 5));
    setHistory(loadWritingHistory().slice(0, 5));
    const arch = hasArchitecture();
    setHasArch(arch);
    if (arch) {
      const snap = loadArchitecture();
      if (snap?.nodes?.[0]?.title) {
        setArchTitle(snap.nodes[0].title);
      }
    }
  }, []);

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

  const hasAnyDocs = docs.length > 0 || history.length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-ui)",
        overflow: "auto",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "16px 32px",
          gap: 12,
        }}
      >
        <span
          style={{ fontSize: 12, color: "var(--text-tertiary)", cursor: "pointer" }}
          onClick={() => router.push("/write")}
        >
          架构画布
        </span>
        <span
          style={{ fontSize: 12, color: "var(--text-tertiary)", cursor: "pointer" }}
          onClick={() => router.push("/write")}
        >
          写作编辑器
        </span>
      </div>

      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 32px",
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, var(--gold) 0%, #8b6914 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            boxShadow: "0 0 60px rgba(201,169,92,0.25)",
          }}
        >
          <span style={{ fontSize: 36, filter: "grayscale(30%)" }}>✧</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 200,
            color: "var(--text-primary)",
            letterSpacing: "0.05em",
            margin: "0 0 8px 0",
            fontFamily: "'Source Serif 4', serif",
          }}
        >
          Sculptor
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            fontWeight: 300,
            margin: "0 0 48px 0",
            maxWidth: 420,
            textAlign: "center",
            lineHeight: 1.7,
          }}
        >
          先搭架构，再落笔。
          <br />
          AI 帮你理清思路，你负责写出灵魂。
        </p>

        {/* Primary CTA */}
        <button
          onClick={() => router.push("/write")}
          style={{
            padding: "14px 48px",
            fontSize: 16,
            fontWeight: 500,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, var(--gold) 0%, #8b6914 100%)",
            color: "#0a0a0a",
            cursor: "pointer",
            letterSpacing: "0.04em",
            boxShadow: "0 0 30px rgba(201,169,92,0.2)",
            transition: "all 0.25s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 8px 40px rgba(201,169,92,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 0 30px rgba(201,169,92,0.2)";
          }}
        >
          开始写作
        </button>

        {/* Secondary actions */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 28,
          }}
        >
          <span
            onClick={() => router.push("/write")}
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            从空白框架开始
          </span>
          <span style={{ color: "var(--border)", fontSize: 13 }}>·</span>
          <span
            onClick={() => router.push("/write")}
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            直接开始写
          </span>
        </div>

        {/* ── Continue writing prompt (if architecture exists) ── */}
        {hasArch && (
          <div
            onClick={() => router.push("/write")}
            style={{
              marginTop: 48,
              padding: "16px 24px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              cursor: "pointer",
              transition: "border-color 0.2s",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              继续上次的架构
            </span>
            <div
              style={{
                fontSize: 14,
                color: "var(--gold)",
                marginTop: 4,
                fontWeight: 500,
              }}
            >
              {archTitle || "未命名架构"}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent documents section ─────────────────────── */}
      {hasAnyDocs && (
        <div
          style={{
            padding: "0 32px 80px",
            maxWidth: 640,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Recent docs */}
          {docs.length > 0 && (
            <>
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 16px 0",
                }}
              >
                最近文档
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => router.push(`/write`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "var(--bg-secondary)",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: "1px solid transparent",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--bg-tertiary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }}
                  >
                    <span style={{ fontSize: 14, marginRight: 8 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: 14, color: "var(--text-primary)" }}
                      >
                        {doc.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          marginTop: 2,
                        }}
                      >
                        {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}
                        {doc.wordCount ? ` · ${doc.wordCount} 字` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Writing history */}
          {history.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "0 0 16px 0",
                }}
              >
                写作历史
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 16px",
                      background: "var(--bg-secondary)",
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        fontSize: 11,
                        marginRight: 12,
                        minWidth: 80,
                      }}
                    >
                      {new Date(s.date).toLocaleDateString("zh-CN")}
                    </span>
                    <span
                      style={{
                        color: "var(--text-primary)",
                        flex: 1,
                      }}
                    >
                      {s.architectureTitle}
                    </span>
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        fontSize: 11,
                      }}
                    >
                      {s.wordCount} 字
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          padding: "32px",
          borderTop: "1px solid var(--border-light)",
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            margin: 0,
            opacity: 0.5,
          }}
        >
          Sculptor Write · AI 写作架构师 · 先搭架构，再落笔
        </p>
      </div>
    </div>
  );
}
