"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import QuickCommands from "./QuickCommands";
import ClarifyCard from "./ClarifyCard";
import SuggestionCard from "./SuggestionCard";
import type { ArchNode } from "@/types/architect";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  snapshotId?: string;
  type?: string;
  options?: { label: string; value: string }[];
  suggestionNodes?: ArchNode[];
  suggestionEdges?: { id: string; from: string; to: string; relation: string }[];
  suggestion?: { type: string; message: string; node_id?: string; auto_fix_available?: boolean };
  suggestionDismissed?: boolean;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => void;
  onRollback: (messageId: string) => void;
  onAcceptSuggestion: (nodes: ArchNode[], edges: { id: string; from: string; to: string; relation: string }[]) => void;
  onIgnoreSuggestion: (messageId: string) => void;
  onClarifySelect: (value: string) => void;
  onAutoFix: (messageId: string, suggestion: Message["suggestion"]) => void;
  loading: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

const SUGGESTION_LABELS: Record<string, string> = {
  missing_evidence: "缺少论据",
  imbalance: "结构失衡",
  better_title: "标题可优化",
  logical_gap: "逻辑跳跃",
  missing_counterargument: "缺少反驳",
};

export default function ChatPanel({
  messages, onSend, onRollback, onAcceptSuggestion, onIgnoreSuggestion,
  onClarifySelect, onAutoFix, loading, collapsed, onToggle,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) { onSend(input.trim()); setInput(""); }
  };

  if (collapsed) {
    return (
      <div style={{ width: 48, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12 }}>
        <button className="btn-icon" onClick={onToggle} title="展开AI对话" aria-label="展开AI对话" style={{ fontSize: 18 }}>💬</button>
        {loading && <div style={{ marginTop: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", animation: "glow-breathe 1s infinite" }} />}
      </div>
    );
  }

  return (
    <div style={{ width: 320, flexShrink: 0, background: "var(--bg-secondary)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)" }}>AI 对话</span>
        <button className="btn-icon" onClick={onToggle} style={{ width: 28, height: 28 }} title="折叠" aria-label="折叠">◁</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: 32 }}>
            <p style={{ marginBottom: 8 }}>描述你想写什么，AI 为你搭建架构</p>
            <p style={{ fontSize: 11 }}>例如："我想论证远程办公虽然提高效率，但削弱了团队的创新能力"</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            <ChatMessage message={m} onRollback={() => onRollback(m.id)} />

            {/* v4.0: Proactive suggestion on confirmation responses */}
            {m.suggestion && !m.suggestionDismissed && m.type !== "suggestion" && (
              <div style={{
                marginTop: 6, padding: "8px 10px", borderRadius: 8,
                background: "rgba(201,169,92,0.08)", border: "1px solid rgba(201,169,92,0.2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 600 }}>
                    💡 {SUGGESTION_LABELS[m.suggestion.type] || "建议"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
                  {m.suggestion.message}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {m.suggestion.auto_fix_available && (
                    <button
                      onClick={() => onAutoFix(m.id, m.suggestion!)}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--gold)", color: "#1a1a1a", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >
                      一键修复
                    </button>
                  )}
                  <button
                    onClick={() => onIgnoreSuggestion(m.id)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}
                  >
                    忽略
                  </button>
                </div>
              </div>
            )}

            {m.type === "clarification" && m.options && (
              <ClarifyCard options={m.options} onSelect={onClarifySelect} />
            )}
            {m.type === "suggestion" && m.suggestionNodes && (
              <SuggestionCard
                nodeCount={m.suggestionNodes.length}
                onAccept={() => onAcceptSuggestion(m.suggestionNodes!, m.suggestionEdges || [])}
                onIgnore={() => onIgnoreSuggestion(m.id)}
              />
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px" }}>
            <div className="skeleton" style={{ width: 16, height: 16, borderRadius: "50%" }} />
            <div className="skeleton" style={{ width: 120, height: 12, borderRadius: 4 }} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      <QuickCommands onCommand={onSend} />

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ padding: "8px 14px", borderTop: "1px solid var(--border-light)", display: "flex", gap: 6 }}>
        <input
          ref={inputRef}
          className="input-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入指令..."
          disabled={loading}
          style={{ flex: 1, fontSize: 12, padding: "8px 10px" }}
        />
        <button className="btn-primary" type="submit" disabled={loading || !input.trim()} style={{ padding: "6px 12px", minHeight: 36, fontSize: 12 }}>发送</button>
      </form>
    </div>
  );
}
