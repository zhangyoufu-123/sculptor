"use client";

import { useState, useRef, useCallback } from "react";

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string, filename: string) => void;
}

const SUPPORTED_EXTENSIONS = [".txt", ".md"];
const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/x-markdown",
];

export default function FileUpload({ isOpen, onClose, onImport }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFile = useCallback((file: File): boolean => {
    const name = file.name.toLowerCase();
    const hasExt = SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasMime = SUPPORTED_MIME_TYPES.includes(file.type);
    return hasExt || hasMime || file.type === ""; // Allow empty MIME (some .md files)
  }, []);

  const readFile = useCallback(
    (file: File) => {
      if (!isValidFile(file)) {
        setError(`不支持的文件格式。请使用 ${SUPPORTED_EXTENSIONS.join(", ")} 文件`);
        return;
      }

      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          onImport(text, file.name);
          setLoading(false);
          onClose();
        } else {
          setError("文件读取失败");
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("文件读取失败");
        setLoading(false);
      };
      reader.readAsText(file);
    },
    [isValidFile, onImport, onClose]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        readFile(file);
      }
    },
    [readFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        readFile(file);
      }
    },
    [readFile]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420,
          maxWidth: "calc(100vw - 32px)",
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderRadius: 12,
          zIndex: 101,
          boxShadow: "0 12px 48px rgba(0, 0, 0, 0.5)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #1a1a1a",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#e0d8c8",
            }}
          >
            导入文件
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#8a8578",
              fontSize: 18,
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#c4a565";
              e.currentTarget.style.background = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#8a8578";
              e.currentTarget.style.background = "transparent";
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? "#c4a565" : "#2a2a2a"}`,
              borderRadius: 8,
              padding: "40px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "#141414" : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? (
              <div>
                <div
                  className="shimmer-box"
                  style={{
                    width: 60,
                    height: 4,
                    borderRadius: 2,
                    background: "#1a1a1a",
                    margin: "0 auto 12px",
                  }}
                />
                <div style={{ color: "#8a8578", fontSize: 13 }}>
                  正在读取文件...
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ color: "#8a8578", fontSize: 13, marginBottom: 4 }}>
                  拖拽文件到此处或点击选择
                </div>
                <div style={{ color: "#5a5558", fontSize: 11 }}>
                  支持 {SUPPORTED_EXTENSIONS.join(", ")} 格式
                </div>
              </>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 6,
                background: "#2a1a1a",
                border: "1px solid #4a2a2a",
                color: "#c88c8c",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
