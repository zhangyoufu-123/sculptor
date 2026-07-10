"use client";

import { useState, useRef, useEffect } from "react";
import type { AlignMessage } from "@/types/architect";

interface AlignDialogProps {
  isOpen: boolean;
  onComplete: (templateType: string, summary: string) => void;
  onCancel: () => void;
}

export default function AlignDialog({ isOpen, onComplete, onCancel }: AlignDialogProps) {
  const [messages, setMessages] = useState<AlignMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [round, setRound] = useState(0);
  const [templateType, setTemplateType] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && round === 0) {
      // Start first question
      sendMessage("开始");
    }
  }, [isOpen, round]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const newMessages: AlignMessage[] = [
      ...messages,
      { role: "user", content: userText },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/architect/align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: userText,
          conversationHistory: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.type === "template" && data.templateType) {
          setTemplateType(data.templateType);
          setMessages([...newMessages, { role: "ai", content: `推荐模板: ${data.templateType}` }]);
          // Auto-complete after brief delay
          setTimeout(() => {
            const summary = newMessages.map((m) => m.content).join(" | ");
            onComplete(data.templateType, summary);
          }, 1500);
        } else if (data.type === "question") {
          setMessages([...newMessages, { role: "ai", content: data.content }]);
          setRound((r) => r + 1);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 480,
          maxHeight: 500,
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #2a2a2a",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "#c4a565", fontWeight: 600, fontSize: 15 }}>意向对齐</span>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                padding: "8px 14px",
                borderRadius: 12,
                background: m.role === "user" ? "#2a3a2a" : "#1a1a2a",
                color: "#e0d8c8",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && <div style={{ color: "#666", fontSize: 12 }}>思考中...</div>}
        </div>

        {!templateType && (
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            style={{ padding: "10px 18px", borderTop: "1px solid #2a2a2a", display: "flex", gap: 8 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的想法..."
              disabled={loading}
              style={{
                flex: 1,
                background: "#0d0d0d",
                border: "1px solid #333",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#e0d8c8",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: loading ? "#333" : "#c4a565",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                color: "#0d0d0d",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              发送
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
