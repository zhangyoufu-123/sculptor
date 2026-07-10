"use client";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    type?: string;
  };
  onRollback: () => void;
}

export default function ChatMessage({ message, onRollback }: ChatMessageProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: message.role === "user" ? "flex-end" : "flex-start",
    }}>
      <div style={{
        maxWidth: "90%", padding: "8px 12px", borderRadius: 10,
        background: message.role === "user" ? "rgba(212,168,83,0.1)" : message.type === "confirmation" ? "rgba(76,175,80,0.1)" : "var(--bg-tertiary)",
        border: message.role === "user" ? "1px solid rgba(212,168,83,0.2)" : message.type === "confirmation" ? "1px solid rgba(76,175,80,0.3)" : "1px solid var(--border-light)",
        color: "var(--text-primary)", fontSize: 12, lineHeight: 1.5,
        position: "relative",
      }}>
        {message.content}
      </div>

      {message.role === "assistant" && (
        <button
          onClick={onRollback}
          title="回退到此状态"
          style={{
            marginTop: 2, padding: "2px 6px", borderRadius: 4,
            background: "transparent", border: "none",
            color: "var(--text-tertiary)", fontSize: 10,
            cursor: "pointer", opacity: 0.6,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
        >
          ↩ 回退
        </button>
      )}
    </div>
  );
}
