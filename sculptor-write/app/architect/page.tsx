"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ArchitectCanvas from "@/components/architect/ArchitectCanvas";
import AlignDialog from "@/components/architect/AlignDialog";
import { useArchitectStore } from "@/store/architect-store";
import type { ArchitectScheme } from "@/types/architect";

export default function ArchitectPage() {
  const router = useRouter();
  const [showAlign, setShowAlign] = useState(true);
  const [templateType, setTemplateType] = useState<string | null>(null);
  const nodes = useArchitectStore((s) => s.nodes);
  const edges = useArchitectStore((s) => s.edges);
  const addScheme = useArchitectStore((s) => s.addScheme);
  const setActiveScheme = useArchitectStore((s) => s.setActiveScheme);
  const [generating, setGenerating] = useState(false);

  const handleAlignComplete = useCallback(
    async (type: string, summary: string) => {
      setTemplateType(type);
      setShowAlign(false);
      setGenerating(true);

      try {
        const res = await fetch("/api/architect/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType: type,
            userInput: summary,
            conversationSummary: summary,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.nodes && data.edges) {
            const scheme: ArchitectScheme = {
              id: "scheme-1",
              name: "方案 A",
              nodes: data.nodes,
              edges: data.edges,
              isActive: true,
            };
            addScheme(scheme);
            setActiveScheme("scheme-1");
          }
        }
      } catch {
        // If generation fails, load default template
        let templateFile = "essay.json";
        if (type) {
          const map: Record<string, string> = {
            argumentative: "argumentative.json",
            narrative: "narrative.json",
            expository: "expository.json",
            essay: "essay.json",
            report: "report.json",
          };
          templateFile = map[type] || "essay.json";
        }

        try {
          const tpl = await fetch(`/templates/${templateFile}`);
          if (tpl.ok) {
            const tplData = await tpl.json();
            const scheme: ArchitectScheme = {
              id: "scheme-1",
              name: "方案 A",
              nodes: tplData.defaultNodes,
              edges: tplData.defaultEdges,
              isActive: true,
            };
            addScheme(scheme);
            setActiveScheme("scheme-1");
          }
        } catch { /* silent */ }
      } finally {
        setGenerating(false);
      }
    },
    [addScheme, setActiveScheme]
  );

  const handleStartWriting = useCallback(() => {
    // Navigate to main page with architecture
    router.push("/");
  }, [router]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 18px",
          background: "#0d0d0d",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#c4a565", fontWeight: 700, fontSize: 16 }}>
            Sculptor Architect
          </span>
          {templateType && (
            <span style={{ color: "#888", fontSize: 12 }}>
              模板: {templateType}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowAlign(true)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "transparent",
              color: "#888",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            重新对话
          </button>
          <button
            onClick={handleStartWriting}
            disabled={nodes.length === 0}
            style={{
              padding: "6px 20px",
              borderRadius: 8,
              border: "none",
              background: nodes.length === 0 ? "#333" : "#c4a565",
              color: "#0d0d0d",
              fontSize: 13,
              fontWeight: 700,
              cursor: nodes.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            开始写作
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        {generating ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#c4a565",
              fontSize: 15,
            }}
          >
            正在生成架构...
          </div>
        ) : (
          <ArchitectCanvas />
        )}
      </div>

      {/* Align dialog */}
      <AlignDialog
        isOpen={showAlign}
        onComplete={handleAlignComplete}
        onCancel={() => {
          if (nodes.length === 0) {
            // If no architecture yet, load default template
            handleAlignComplete("essay", "");
          }
          setShowAlign(false);
        }}
      />
    </div>
  );
}
