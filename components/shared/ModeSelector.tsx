"use client";

interface ModeSelectorProps {
  isOpen: boolean;
  onSelectDirect: () => void;
  onSelectArchitect: () => void;
  onSelectImport: () => void;
  onClose: () => void;
}

export default function ModeSelector({
  isOpen,
  onSelectDirect,
  onSelectArchitect,
  onSelectImport,
  onClose,
}: ModeSelectorProps) {
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
          width: 420,
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ color: "#c4a565", fontSize: 18, marginBottom: 24, textAlign: "center" }}>
          开始写作
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={onSelectDirect}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#e0d8c8",
              textAlign: "left",
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c4a565")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>直接写作</div>
            <div style={{ color: "#888", fontSize: 12 }}>打开空白编辑器，立即开始写作</div>
          </button>

          <button
            onClick={onSelectArchitect}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid #c4a565",
              background: "#1a1a1a",
              color: "#e0d8c8",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: "#c4a565" }}>
              搭建架构 ← 推荐
            </div>
            <div style={{ color: "#888", fontSize: 12 }}>
              先用可视化画布搭建文章骨架，再开始写作
            </div>
          </button>

          <button
            onClick={onSelectImport}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#e0d8c8",
              textAlign: "left",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c4a565")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>导入文档</div>
            <div style={{ color: "#888", fontSize: 12 }}>
              导入 .txt / .md / .docx，自动生成架构
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "8px",
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}
