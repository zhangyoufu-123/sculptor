"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const LS_OUTLINE = "sculptor-discover-outline";
const LS_CONTENT = "sculptor-last-content";
const LS_ANCHOR = "sculptor-anchor";

const C = {
  bg: "#faf8f5", panel: "#fff", border: "#e8e0d5",
  gold: "#c9a95c", text: "#2c2416", text2: "#6b5e4a", text3: "#9b8e7a",
};

function loadOutline() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(LS_OUTLINE); return r ? JSON.parse(r) : []; } catch { return []; }
}
function loadContent() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_CONTENT) || "";
}
function loadAnchor() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LS_ANCHOR) || "";
}

export default function CraftPage() {
  const router = useRouter();
  const [outline, setOutline] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [anchor, setAnchor] = useState("");
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState("md");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOutline(loadOutline());
    setContent(loadContent());
    setAnchor(loadAnchor());
  }, []);

  // Build document tree from outline
  const tree = outline.length > 0
    ? outline
    : anchor
      ? [{ level: 1, title: anchor, notes: "(无大纲)" }]
      : [];

  const handleExport = () => {
    let text = "";

    if (exportFormat === "md") {
      text = `# ${anchor || "未命名文档"}\n\n`;
      for (const node of outline) {
        const prefix = "#".repeat(Math.min(node.level || 1, 6));
        text += `${prefix} ${node.title || node.label || ""}\n\n`;
        if (node.notes) text += `${node.notes}\n\n`;
        if (node.value) text += `${node.value}\n\n`;
      }
      if (content) {
        text += `\n---\n\n## 正文\n\n${content}\n`;
      }
    } else if (exportFormat === "html") {
      text = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${anchor}</title>
<style>body{max-width:720px;margin:40px auto;font-family:Georgia,serif;color:#2c2416;line-height:1.8}
h1{font-size:24px}h2{font-size:20px}h3{font-size:16px}p{margin:12px 0}</style></head><body>
<h1>${anchor}</h1>`;
      for (const node of outline) {
        const tag = `h${Math.min(node.level || 1, 6)}`;
        text += `<${tag}>${node.title || ""}</${tag}>\n`;
        if (node.notes) text += `<p>${node.notes}</p>\n`;
      }
      text += `</body></html>`;
    } else {
      text = `${anchor || "未命名文档"}\n\n`;
      for (const node of outline) {
        text += `${node.title || ""}\n${node.notes || ""}\n\n`;
      }
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${anchor || "document"}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) return <div style={{ minHeight: "100vh", background: C.bg }} />;

  if (tree.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <p style={{ color: C.text2, marginBottom: 16 }}>还没有生成大纲。请先在发现页面完成讨论。</p>
        <button onClick={() => router.push("/discover")} style={{ padding: "10px 24px", background: C.gold, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>去讨论</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.panel }}>
        <button onClick={() => router.push("/write")} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 13 }}>← 回到写作</button>
        <div style={{ flex: 1 }} />
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: C.panel, marginRight: 8 }}>
          <option value="md">Markdown</option>
          <option value="html">HTML</option>
          <option value="txt">纯文本</option>
        </select>
        <button onClick={handleExport} style={{ padding: "8px 20px", background: C.gold, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>导出 {exportFormat}</button>
      </div>

      {/* Main: tree + preview */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* Left: Document Tree */}
        <div style={{ width: 320, borderRight: `1px solid ${C.border}`, background: C.panel, padding: 20, overflow: "auto" }}>
          <p style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>文档结构</p>
          <h2 style={{ fontSize: 16, color: C.text, margin: "0 0 16px 0" }}>{anchor}</h2>

          {tree.map((node, i) => {
            const isSelected = selectedNode === i;
            const nodeLevel = node.level || 1;
            return (
              <div
                key={i}
                onClick={() => setSelectedNode(isSelected ? null : i)}
                style={{
                  padding: `${8 + (3 - nodeLevel) * 4}px 12px`,
                  marginBottom: 2,
                  marginLeft: (nodeLevel - 1) * 16,
                  borderRadius: 6,
                  cursor: "pointer",
                  background: isSelected ? "rgba(201,169,92,0.08)" : "transparent",
                  borderLeft: isSelected ? `2px solid ${C.gold}` : `2px solid transparent`,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: nodeLevel === 1 ? 14 : 12, fontWeight: nodeLevel === 1 ? 600 : 400, color: C.text }}>
                  {node.title || node.label || `章节 ${i + 1}`}
                </div>
                {(node.notes || node.value) && (
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {node.notes || node.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Preview */}
        <div style={{ flex: 1, padding: 40, overflow: "auto", background: "#fff" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, color: C.text, marginBottom: 8, fontFamily: "Georgia, serif" }}>{anchor}</h1>
            <div style={{ width: 40, height: 2, background: C.gold, marginBottom: 32 }} />

            {tree.map((node, i) => {
              const Tag = `h${Math.min((node.level || 1) + 1, 6)}` as keyof JSX.IntrinsicElements;
              return (
                <div key={i} style={{ marginBottom: 24 }}>
                  <Tag style={{ fontSize: node.level === 1 ? 18 : 14, fontWeight: 600, color: C.text, margin: "0 0 8px 0" }}>
                    {node.title || node.label || ""}
                  </Tag>
                  {(node.notes || node.value) && (
                    <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.8, margin: 0 }}>
                      {node.notes || node.value}
                    </p>
                  )}
                </div>
              );
            })}

            {content && (
              <>
                <div style={{ width: "100%", height: 1, background: C.border, margin: "32px 0" }} />
                <div style={{ fontSize: 14, color: C.text2, lineHeight: 2, whiteSpace: "pre-wrap" }}>
                  {content.slice(0, 1000)}
                  {content.length > 1000 && <span style={{ color: C.text3 }}> ... (共 {content.length} 字)</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
