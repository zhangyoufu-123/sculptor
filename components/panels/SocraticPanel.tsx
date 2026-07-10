"use client";

import { useState } from "react";

interface SocraticPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: string; // current writing context
}

interface Message {
  role: "ai" | "user";
  text: string;
}

export default function SocraticPanel({
  isOpen,
  onClose,
  context,
}: SocraticPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user" as const, text: userText },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: context,
          intent: "custom",
          customText: `You are a Socratic mentor. Based on what the user is writing, ask ONE thought-provoking question. Previous exchanges: ${JSON.stringify(newMessages.slice(-4))}. User's latest answer: "${userText}". Ask a follow-up question that goes deeper.`,
          intensity: "normal",
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let aiText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "option" && event.text && !aiText) {
                aiText = event.text;
              }
            } catch { /* skip */ }
          }
        }

        if (aiText) {
          setMessages([...newMessages, { role: "ai", text: aiText }]);
        }
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 340,
        width: 320,
        maxHeight: 400,
        background: "#141414",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#c4a565", fontSize: 14, fontWeight: 600 }}>
          苏格拉底追问
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: 24 }}>
            基于你的当前写作内容，AI 将提出思考性问题帮助你深入探索。
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: 10,
              background:
                m.role === "user" ? "#2a3a2a" : "#1a1a2a",
              color: "#e0d8c8",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ color: "#666", fontSize: 12, padding: 8 }}>
            思考中...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #2a2a2a",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="回应追问..."
          style={{
            flex: 1,
            background: "#0d0d0d",
            border: "1px solid #333",
            borderRadius: 6,
            padding: "6px 10px",
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
            borderRadius: 6,
            padding: "6px 12px",
            color: "#0d0d0d",
            fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          发送
        </button>
      </form>
    </div>
  );
}
