"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ArchitectureNode, ImageryWord } from "@/types/editor";

interface ArchitecturePanelProps {
  editorContent: string;
  onNodeClick: (position: number) => void;
  imageryWords: string[];
  wordGoal: number;
  onWordGoalChange: (goal: number) => void;
}

type TabId = "structure" | "imagery" | "progress";

// ── helpers ─────────────────────────────────────────────────────

function buildDocumentTree(text: string): ArchitectureNode {
  const paragraphs = text.split("\n").filter((p) => p.trim());
  let position = 0;

  const children: ArchitectureNode[] = [];
  let currentSection: ArchitectureNode | null = null;

  for (const para of paragraphs) {
    // Detect section headers (lines starting with #, ##, or Chinese section markers)
    if (
      para.match(/^(#{1,6}\s|第[一二三四五六七八九十]+[章节篇部]|【|［)/)
    ) {
      if (currentSection) {
        children.push(currentSection);
      }
      const label = para.replace(/^#{1,6}\s*/, "").slice(0, 20);
      currentSection = {
        id: `section-${position}`,
        label: label || para.slice(0, 20),
        children: [],
        position,
      };
    } else if (currentSection) {
      currentSection.children.push({
        id: `para-${position}`,
        label: para.slice(0, 20),
        children: [],
        position,
      });
    } else {
      // Paragraph before any section header
      children.push({
        id: `para-${position}`,
        label: para.slice(0, 20),
        children: [],
        position,
      });
    }
    position++;
  }

  if (currentSection) {
    children.push(currentSection);
  }

  return {
    id: "root",
    label: "文档",
    children,
    position: 0,
  };
}

// Chinese-aware word count (rough: count CJK chars + space-separated words)
function countChineseWords(text: string): number {
  let count = 0;
  let inCJK = false;

  for (const ch of text) {
    const isCJK =
      (ch >= "\u4e00" && ch <= "\u9fff") ||
      (ch >= "\u3400" && ch <= "\u4dbf") ||
      (ch >= "\uf900" && ch <= "\ufaff");
    if (isCJK) {
      if (!inCJK) {
        count++;
        inCJK = true;
      }
      // Each CJK char counts as a word
      count++;
    } else {
      inCJK = false;
      if (ch.match(/\S/)) {
        // non-CJK non-space: count as part of word when following space
      }
    }
  }

  // Fallback: count CJK characters + Latin/space words
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length;
  const latinWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return cjkChars + latinWords;
}

function estimateReadingTime(wordCount: number): string {
  // Average reading speed: ~300 Chinese chars/min
  const mins = Math.ceil(wordCount / 300);
  if (mins < 1) return "<1 min";
  if (mins === 1) return "1 min";
  return `${mins} min`;
}

// ── Simple Tree Node ────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  onNodeClick,
}: {
  node: ArchitectureNode;
  depth: number;
  onNodeClick: (position: number) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  const hasChildren = node.children.length > 0;
  const indent = depth * 16;

  return (
    <div>
      <div
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          if (node.position !== undefined) onNodeClick(node.position);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          paddingLeft: 8 + indent,
          borderRadius: 4,
          cursor: "pointer",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 12,
          color: depth === 0 ? "#c4a565" : "#a09888",
          transition: "background 0.1s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1a1a1a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {hasChildren ? (
          <span style={{ fontSize: 10, width: 14, textAlign: "center" }}>
            {expanded ? "▾" : "▸"}
          </span>
        ) : (
          <span style={{ width: 14 }} />
        )}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 160 - indent,
          }}
        >
          {node.id === "root" ? "📄 文档结构" : node.label}
        </span>
      </div>
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            onNodeClick={onNodeClick}
          />
        ))}
    </div>
  );
}

// ── Imagery Cloud ────────────────────────────────────────────────

function ImageryCloud({
  words,
  positions,
  onWordClick,
}: {
  words: string[];
  positions: number[];
  onWordClick: (pos: number) => void;
}) {
  if (words.length === 0) {
    return (
      <div
        style={{
          color: "#8a8578",
          fontSize: 13,
          textAlign: "center",
          padding: "24px 8px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        写作后 AI 会自动提取关键意象
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: "4px 0",
      }}
    >
      {words.map((word, idx) => (
        <span
          key={word}
          onClick={() => {
            if (positions[idx] !== undefined) onWordClick(positions[idx]);
          }}
          style={{
            padding: "3px 10px",
            borderRadius: 16,
            background: "#1a1a1a",
            color: "#c4a565",
            fontSize: 12,
            cursor: "pointer",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            border: "1px solid #2a2a2a",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#c4a565";
            e.currentTarget.style.background = "#3d3520";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#2a2a2a";
            e.currentTarget.style.background = "#1a1a1a";
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function ArchitecturePanel({
  editorContent,
  onNodeClick,
  imageryWords: externalImageryWords,
  wordGoal,
  onWordGoalChange,
}: ArchitecturePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("structure");
  const [goalInput, setGoalInput] = useState(String(wordGoal || 500));
  const [sessionStartTime] = useState(Date.now());

  // Parse content into tree
  const docTree = useMemo(() => buildDocumentTree(editorContent), [editorContent]);

  // Character and word counts
  const charCount = editorContent.length;
  const wordCount = useMemo(
    () => countChineseWords(editorContent),
    [editorContent]
  );
  const readingTime = useMemo(
    () => estimateReadingTime(wordCount),
    [wordCount]
  );

  // Writing speed since session start
  const elapsedMs = Date.now() - sessionStartTime;
  const elapsedMin = Math.max(elapsedMs / 60000, 0.1);
  const wpm = Math.round(wordCount / elapsedMin);

  // Extract imagery words from content (lightweight, client-side)
  const extractedImageryWords = useMemo(() => {
    if (!editorContent.trim()) return [];
    // Use external words if provided, otherwise extract from content
    if (externalImageryWords.length > 0) return externalImageryWords;

    // Simple extraction: find repeated meaningful words (CJK bigrams)
    const clean = editorContent.replace(/[，。！？、；：""''（）\n\r]/g, " ");
    const segments = clean.split(/\s+/).filter((s) => s.length >= 2 && s.length <= 4);

    const freq: Record<string, number> = {};
    for (const seg of segments) {
      // Only count CJK segments as potential imagery
      if (/^[\u4e00-\u9fff]+$/.test(seg)) {
        freq[seg] = (freq[seg] || 0) + 1;
      }
    }

    return Object.entries(freq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }, [editorContent, externalImageryWords]);

  // Find positions of imagery words in text
  const imageryPositions = useMemo(() => {
    return extractedImageryWords.map((word) => {
      const idx = editorContent.indexOf(word);
      return idx >= 0 ? idx : -1;
    });
  }, [editorContent, extractedImageryWords]);

  // Update goal when input changes
  const handleGoalBlur = useCallback(() => {
    const parsed = parseInt(goalInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setGoalInput(String(wordGoal || 500));
    } else {
      onWordGoalChange(parsed);
    }
  }, [goalInput, wordGoal, onWordGoalChange]);

  const goalPercent = wordGoal > 0 ? Math.min(100, Math.round((wordCount / wordGoal) * 100)) : 0;

  // Count paragraphs for structure tree
  const paraCount = editorContent
    .split("\n")
    .filter((p) => p.trim()).length;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "structure", label: "结构地图", icon: "🗺" },
    { id: "imagery", label: "意象网络", icon: "🕸" },
    { id: "progress", label: "进度", icon: "📊" },
  ];

  return (
    <aside
      style={{
        width: 280,
        background: "#0d0d0d",
        borderRight: "1px solid #1a1a1a",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "10px 4px",
              background: activeTab === tab.id ? "#141414" : "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id ? "2px solid #c4a565" : "2px solid transparent",
              color: activeTab === tab.id ? "#c4a565" : "#8a8578",
              fontSize: 11,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = "#a09888";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = "#8a8578";
              }
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
        {/* Tab 1: Structure Map */}
        {activeTab === "structure" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
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
                结构地图
              </span>
              <span style={{ fontSize: 11, color: "#8a8578" }}>
                {paraCount} 段落
              </span>
            </div>
            {editorContent.trim() ? (
              <div style={{ paddingLeft: 4 }}>
                {docTree.children.map((child) => (
                  <TreeNode
                    key={child.id}
                    node={child}
                    depth={1}
                    onNodeClick={onNodeClick}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  color: "#8a8578",
                  fontSize: 13,
                  textAlign: "center",
                  padding: "24px 8px",
                }}
              >
                开始写作后，这里会显示文章结构
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Imagery Network */}
        {activeTab === "imagery" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
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
                意象网络
              </span>
              {extractedImageryWords.length > 0 && (
                <span style={{ fontSize: 11, color: "#8a8578" }}>
                  {extractedImageryWords.length} 词
                </span>
              )}
            </div>
            <ImageryCloud
              words={extractedImageryWords}
              positions={imageryPositions}
              onWordClick={(pos) => {
                if (pos >= 0) onNodeClick(pos);
              }}
            />
          </div>
        )}

        {/* Tab 3: Progress */}
        {activeTab === "progress" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
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
                进度
              </span>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { label: "字符", value: charCount.toLocaleString() },
                { label: "词数", value: wordCount.toLocaleString() },
                { label: "阅读时长", value: readingTime },
                {
                  label: "写作速度",
                  value: `${wpm} 词/分`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "#141414",
                    border: "1px solid #1a1a1a",
                    borderRadius: 6,
                    padding: "8px 10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, color: "#8a8578", marginBottom: 2 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e0d8c8" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Goal Tracker */}
            <div
              style={{
                background: "#141414",
                border: "1px solid #1a1a1a",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, color: "#8a8578" }}>字数目标</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#2a2a2a";
                      handleGoalBlur();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGoalBlur();
                    }}
                    min={1}
                    style={{
                      width: 60,
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid #2a2a2a",
                      background: "#0d0d0d",
                      color: "#e0d8c8",
                      fontSize: 12,
                      fontFamily: "inherit",
                      textAlign: "center",
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#c4a565";
                    }}
                  />
                  <span style={{ fontSize: 12, color: "#8a8578" }}>词</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "#2a2a2a",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${goalPercent}%`,
                    background: "#c4a565",
                    borderRadius: 3,
                    transition: "width 0.5s ease",
                    minWidth: goalPercent > 0 ? 4 : 0,
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  fontSize: 10,
                  color: "#8a8578",
                }}
              >
                <span>
                  {wordCount.toLocaleString()} / {wordGoal.toLocaleString()} 词
                </span>
                <span>{goalPercent}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
