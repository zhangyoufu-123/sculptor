"use client";

import type { ArchNode } from "@/types/architect";
import { NODE_TYPE_ICON, NODE_TYPE_COLOR, NODE_TYPE_LABEL, PRIORITY_COLORS, PRIORITY_LABELS } from "@/types/architect";
import { useState, useRef, useCallback, useEffect } from "react";
import StyleEvolution from "@/components/panels/StyleEvolution";

type ExtendedVisualMode = "tree" | "graph" | "style";

interface VisualPanelProps {
  nodes: ArchNode[];
  mode: "tree" | "graph";
  onModeChange: (m: "tree" | "graph") => void;
  onNodeClick?: (id: string) => void;
  onFocusNode?: (id: string) => void;
  highlighted?: Set<string>;
  searchQuery?: string;
}

export default function VisualPanel({
  nodes,
  mode,
  onModeChange,
  onNodeClick,
  onFocusNode,
  highlighted = new Set(),
  searchQuery,
}: VisualPanelProps) {
  const roots = nodes.filter((n) => n.parent === null).sort((a, b) => a.order - b.order);
  const [toast, setToast] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  // Internal extended mode that includes "style" (parent hook only tracks tree/graph)
  const [extendedMode, setExtendedMode] = useState<ExtendedVisualMode>(mode);

  // Sync from parent when tree/graph changes
  useEffect(() => {
    if (mode === "tree" || mode === "graph") {
      setExtendedMode(mode);
    }
  }, [mode]);

  const handleModeChange = useCallback(
    (m: ExtendedVisualMode) => {
      setExtendedMode(m);
      if (m === "tree" || m === "graph") {
        onModeChange(m);
      }
    },
    [onModeChange]
  );

  const handleExportPng = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, 1920, 1080);

    // Title
    ctx.fillStyle = "#e0d4b8";
    ctx.font = "bold 28px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText("架构图", 60, 70);

    ctx.fillStyle = "#a89870";
    ctx.font = "16px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText(`共 ${nodes.length} 个节点`, 60, 100);

    // Draw tree nodes
    const lineHeight = 36;
    const baseX = 60;
    let y = 140;

    // Build a helper to compute depth
    function getDepth(id: string): number {
      const node = nodes.find((n) => n.id === id);
      if (!node || !node.parent) return 0;
      return 1 + getDepth(node.parent);
    }

    // Flatten tree in DFS order
    function flattenTree(roots: ArchNode[]): { node: ArchNode; depth: number; isLast: boolean }[] {
      const result: { node: ArchNode; depth: number; isLast: boolean }[] = [];

      function walk(nodes: ArchNode[], depth: number) {
        nodes.forEach((node, idx) => {
          const children = node.children
            .map((cid) => nodes.find((n) => n.id === cid))
            .filter(Boolean) as ArchNode[];
          children.sort((a, b) => a.order - b.order);

          result.push({
            node,
            depth,
            isLast: idx === nodes.length - 1,
          });

          if (children.length > 0) {
            walk(children, depth + 1);
          }
        });
      }

      walk(roots, 0);
      return result;
    }

    const flat = flattenTree(roots);

    // Track which ancestors are last-child (for vertical connectors)
    const ancestorLast: boolean[] = [];

    for (const item of flat) {
      const x = baseX + item.depth * 28;
      const color = NODE_TYPE_COLOR[item.node.type] || "#888";

      // Truncate ancestors array to depth
      while (ancestorLast.length > item.depth) ancestorLast.pop();

      // Draw connector lines for ancestors
      for (let d = 0; d < item.depth; d++) {
        const ancX = baseX + d * 28 + 8;
        if (!ancestorLast[d]) {
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ancX, y - lineHeight / 2);
          ctx.lineTo(ancX, y + lineHeight / 2);
          ctx.stroke();
        }
      }

      // Draw branch connector
      if (item.depth > 0) {
        const connX = baseX + (item.depth - 1) * 28 + 8;
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(connX, y);
        ctx.lineTo(connX + 12, y);
        ctx.stroke();

        // Draw the T-junction: ├── or └──
        if (item.isLast) {
          ctx.beginPath();
          ctx.moveTo(connX, y - lineHeight / 2);
          ctx.lineTo(connX, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(connX, y - lineHeight / 2);
          ctx.lineTo(connX, y + lineHeight / 2);
          ctx.stroke();
        }
      }

      ancestorLast.push(item.isLast);

      // Draw colored dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + 19, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw title
      ctx.fillStyle = "#e0d4b8";
      ctx.font = "16px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillText(item.node.title, x + 30, y + 6);

      // Type badge
      const typeLabel = NODE_TYPE_LABEL[item.node.type] || item.node.type;
      ctx.font = "11px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      const typeWidth = ctx.measureText(typeLabel).width + 12;
      const typeX = x + 30 + ctx.measureText(item.node.title).width + 14;
      ctx.fillStyle = color + "22";
      ctx.fillRect(typeX, y - 6, typeWidth, 18);
      ctx.fillStyle = color;
      ctx.fillText(typeLabel, typeX + 6, y + 7);

      // Priority badge
      if (item.node.priority) {
        const prioLabel = PRIORITY_LABELS[item.node.priority];
        const prioColor = PRIORITY_COLORS[item.node.priority];
        const prioWidth = ctx.measureText(prioLabel).width + 10;
        ctx.fillStyle = prioColor + "22";
        ctx.fillRect(typeX + typeWidth + 6, y - 6, prioWidth, 18);
        ctx.fillStyle = prioColor;
        ctx.fillText(prioLabel, typeX + typeWidth + 11, y + 7);
      }

      y += lineHeight;
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "architecture.png";
      a.click();
      URL.revokeObjectURL(url);

      setToast("已导出 architecture.png");
      setTimeout(() => setToast(null), 2500);
    }, "image/png");
  }, [nodes, roots]);

  const handleFocus = useCallback(
    (id: string) => {
      onNodeClick?.(id);
      onFocusNode?.(id);
    },
    [onNodeClick, onFocusNode]
  );

  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-light)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          可视化
        </span>
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <VizBtn active={extendedMode === "tree"} onClick={() => handleModeChange("tree")}>
            🌲
          </VizBtn>
          <VizBtn active={extendedMode === "graph"} onClick={() => handleModeChange("graph")}>
            🔀
          </VizBtn>
          <VizBtn active={extendedMode === "style"} onClick={() => handleModeChange("style")}>
            📊
          </VizBtn>
          <div style={{ width: 1, height: 16, background: "var(--border-light)", margin: "0 4px" }} />
          <ExportBtn onClick={handleExportPng} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }} ref={treeRef}>
        {extendedMode === "tree" ? (
          <TreeView
            roots={roots}
            allNodes={nodes}
            onNodeClick={handleFocus}
            highlighted={highlighted}
            searchQuery={searchQuery}
          />
        ) : extendedMode === "graph" ? (
          <GraphOverview
            roots={roots}
            allNodes={nodes}
            onNodeClick={handleFocus}
            highlighted={highlighted}
          />
        ) : (
          <StyleEvolution nodes={nodes} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-elevated)",
            color: "var(--gold)",
            fontSize: 12,
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid var(--gold)",
            zIndex: 100,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Button helpers ───────────────────────────────────────────

function VizBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={
        children === "🌲"
          ? "层级树"
          : children === "🔀"
            ? "关系图"
            : "风格演化"
      }
      style={{
        width: 32,
        height: 28,
        borderRadius: 4,
        border: "none",
        background: active ? "var(--bg-tertiary)" : "transparent",
        color: active ? "var(--gold)" : "var(--text-tertiary)",
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="导出PNG"
      style={{
        width: 32,
        height: 28,
        borderRadius: 4,
        border: "none",
        background: "transparent",
        color: "var(--text-tertiary)",
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--gold)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-tertiary)";
      }}
    >
      📥
    </button>
  );
}

// ── Tree view ───────────────────────────────────────────────

function TreeView({
  roots,
  allNodes,
  depth = 0,
  onNodeClick,
  highlighted,
  searchQuery,
}: {
  roots: ArchNode[];
  allNodes: ArchNode[];
  depth?: number;
  onNodeClick?: (id: string) => void;
  highlighted?: Set<string>;
  searchQuery?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {roots.map((node) => {
        const color = NODE_TYPE_COLOR[node.type] || "#888";
        const children = node.children
          .map((cid) => allNodes.find((n) => n.id === cid))
          .filter(Boolean) as ArchNode[];
        const isHighlighted = highlighted?.has(node.id);

        return (
          <div key={node.id}>
            <div
              onClick={() => onNodeClick?.(node.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: `4px 8px 4px ${16 + depth * 20}px`,
                cursor: "pointer",
                borderRadius: 4,
                borderLeft: `2px solid ${color}`,
                marginBottom: 2,
                transition: "background 0.1s",
                fontSize: 12,
                background: isHighlighted ? "var(--bg-tertiary)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isHighlighted) e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                if (!isHighlighted) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 12 }}>{NODE_TYPE_ICON[node.type]}</span>
              <span
                style={{
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {node.title}
              </span>
              {node.priority && (
                <span
                  style={{
                    fontSize: 9,
                    color: PRIORITY_COLORS[node.priority],
                    background: "var(--bg-primary)",
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  {PRIORITY_LABELS[node.priority]}
                </span>
              )}
            </div>
            {children.length > 0 && (
              <TreeView
                roots={children}
                allNodes={allNodes}
                depth={depth + 1}
                onNodeClick={onNodeClick}
                highlighted={highlighted}
                searchQuery={searchQuery}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Graph overview (enhanced with tree connectors) ──────────

function GraphOverview({
  roots,
  allNodes,
  onNodeClick,
  highlighted,
}: {
  roots: ArchNode[];
  allNodes: ArchNode[];
  onNodeClick?: (id: string) => void;
  highlighted?: Set<string>;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Flatten tree with depth and isLast flags for connector lines
  function flattenTreeWithMeta(
    nodes: ArchNode[],
    depth: number,
    parentIsLast?: boolean
  ): { node: ArchNode; depth: number; isLast: boolean }[] {
    const result: { node: ArchNode; depth: number; isLast: boolean }[] = [];

    nodes.forEach((node, idx) => {
      const children = node.children
        .map((cid) => allNodes.find((n) => n.id === cid))
        .filter(Boolean) as ArchNode[];
      children.sort((a, b) => a.order - b.order);

      const isLast = idx === nodes.length - 1;
      result.push({ node, depth, isLast });

      if (children.length > 0) {
        result.push(...flattenTreeWithMeta(children, depth + 1, isLast));
      }
    });

    return result;
  }

  const flat = flattenTreeWithMeta(roots, 0);

  // Compute connector depths incrementally
  function computeConnectors(
    items: { node: ArchNode; depth: number; isLast: boolean }[]
  ): Map<string, number[]> {
    const result = new Map<string, number[]>();
    // Track which depths have unseen siblings at each step
    const openDepths: number[] = []; // depths that still have more siblings to come

    for (const item of items) {
      // Record current open depths for this node
      result.set(item.node.id, [...openDepths]);

      // Update open depths
      // Remove depths >= current depth (we're going deeper or same level)
      while (openDepths.length > 0 && openDepths[openDepths.length - 1] >= item.depth) {
        openDepths.pop();
      }

      if (!item.isLast) {
        openDepths.push(item.depth);
      }
    }

    return result;
  }

  const connectors = computeConnectors(flat);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Stats summary */}
      <StatsSummary allNodes={allNodes} />

      {/* Tree with connectors */}
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>
          关系树形图
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: "24px" }}>
          {flat.map((item) => {
            const { node, depth, isLast } = item;
            const color = NODE_TYPE_COLOR[node.type] || "#888";
            const connDeps = connectors.get(node.id) || [];
            const isHovered = hoveredId === node.id;
            const isHighlighted = highlighted?.has(node.id);

            // Build prefix with connector lines
            let prefix = "";
            for (let d = 0; d < depth; d++) {
              if (connDeps.includes(d)) {
                prefix += "│  ";
              } else {
                prefix += "   ";
              }
            }
            prefix += isLast ? "└── " : "├── ";

            return (
              <div key={node.id} style={{ position: "relative" }}>
                <div
                  onClick={() => onNodeClick?.(node.id)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 6px",
                    cursor: "pointer",
                    borderRadius: 4,
                    background:
                      isHighlighted || isHovered ? "var(--bg-tertiary)" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Prefix with connector lines */}
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontFamily: "monospace",
                      fontSize: 11,
                      whiteSpace: "pre",
                      userSelect: "none",
                    }}
                  >
                    {prefix}
                  </span>

                  {/* Colored dot */}
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />

                  {/* Title */}
                  <span
                    style={{
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {node.title}
                  </span>

                  {/* Type badge */}
                  <span
                    style={{
                      fontSize: 9,
                      color: color,
                      background: `${color}18`,
                      padding: "0px 4px",
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    {NODE_TYPE_LABEL[node.type]}
                  </span>

                  {/* Priority badge */}
                  {node.priority && (
                    <span
                      style={{
                        fontSize: 9,
                        color: PRIORITY_COLORS[node.priority],
                        background: `${PRIORITY_COLORS[node.priority]}18`,
                        padding: "0px 4px",
                        borderRadius: 3,
                        flexShrink: 0,
                      }}
                    >
                      {PRIORITY_LABELS[node.priority]}
                    </span>
                  )}
                </div>

                {/* Hover tooltip */}
                {isHovered && node.summary && (
                  <div
                    style={{
                      marginLeft: `${(depth + 1) * 16 + 20}px`,
                      marginBottom: 4,
                      padding: "4px 8px",
                      background: "var(--bg-elevated)",
                      borderRadius: 4,
                      border: "1px solid var(--border-light)",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      maxWidth: 300,
                    }}
                  >
                    {node.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick node list */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>
          所有节点
        </div>
        {allNodes.map((n) => (
          <div
            key={n.id}
            onClick={() => onNodeClick?.(n.id)}
            onMouseEnter={() => setHoveredId(n.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              padding: "2px 6px",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: highlighted?.has(n.id) ? "var(--bg-tertiary)" : "transparent",
            }}
          >
            <span>{NODE_TYPE_ICON[n.type]}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {n.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stats Summary ────────────────────────────────────────────

function StatsSummary({ allNodes }: { allNodes: ArchNode[] }) {
  const stats = {
    thesis: allNodes.filter((n) => n.type === "thesis").length,
    argument: allNodes.filter((n) => n.type === "argument").length,
    evidence: allNodes.filter((n) => n.type === "evidence").length,
    counter: allNodes.filter((n) => n.type === "counterargument" || n.type === "rebuttal").length,
    total: allNodes.length,
    maxDepth: Math.max(
      ...allNodes.map((n) => {
        let d = 0;
        let cur = n;
        while (cur.parent) {
          d++;
          cur = allNodes.find((x) => x.id === cur.parent) || cur;
        }
        return d;
      })
    ),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        共 {stats.total} 个节点，{stats.maxDepth} 层深度
      </div>

      {(["thesis", "argument", "evidence", "counter"] as const).map((type) => {
        const count = stats[type];
        const labels: Record<string, string> = {
          thesis: "核心论点",
          argument: "分论点",
          evidence: "论据",
          counter: "反驳",
        };
        return count > 0 ? (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 60 }}>
              {labels[type]}
            </span>
            <div
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: "var(--bg-tertiary)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  background: NODE_TYPE_COLOR[type as keyof typeof NODE_TYPE_COLOR] || "#888",
                  width: `${Math.min(100, (count / Math.max(stats.total, 1)) * 100)}%`,
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 20 }}>
              {count}
            </span>
          </div>
        ) : null;
      })}
    </div>
  );
}
