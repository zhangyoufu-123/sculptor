"use client";

import { useState, useEffect, useCallback } from "react";
import type { DocumentListItem } from "@/types/editor";
import FileUpload from "@/components/FileUpload";

interface DocumentListProps {
  onOpenDocument: (doc: DocumentListItem) => void;
  currentDocId: string | null;
  onToggle?: (collapsed: boolean) => void;
  onImport: (text: string, filename: string) => void;
}

export default function DocumentList({
  onOpenDocument,
  currentDocId,
  onToggle,
  onImport,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/documents");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in");
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    onToggle?.(collapsed);
  }, [collapsed, onToggle]);

  const handleNewDocument = async () => {
    try {
      const res = await fetch("/api/documents", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      const doc: DocumentListItem = {
        id: data.document.id,
        title: data.document.title,
        updated_at: data.document.updated_at,
      };
      setDocuments((prev) => [doc, ...prev]);
      onOpenDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create document");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const sidebarWidth = collapsed ? 0 : 240;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "fixed",
          left: collapsed ? 8 : sidebarWidth - 4,
          top: 56,
          zIndex: 30,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "1px solid #2a2a2a",
          background: "#141414",
          color: "#8a8578",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          transition: "left 0.2s ease",
        }}
        title={collapsed ? "Show documents" : "Hide documents"}
      >
        {collapsed ? "→" : "←"}
      </button>

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 48,
          width: sidebarWidth,
          height: "calc(100vh - 48px)",
          background: "#0d0d0d",
          borderRight: collapsed ? "none" : "1px solid #1a1a1a",
          overflowY: "auto",
          overflowX: "hidden",
          transition: "width 0.2s ease",
          zIndex: 20,
        }}
      >
        {!collapsed && (
          <div style={{ padding: "12px" }}>
            {/* Import Button */}
            <button
              onClick={() => setFileUploadOpen(true)}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #2a2a2a",
                background: "transparent",
                color: "#8a8578",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c4a565";
                e.currentTarget.style.color = "#c4a565";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#8a8578";
              }}
            >
              📥 导入
            </button>

            {/* New Document Button */}
            <button
              onClick={handleNewDocument}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                borderRadius: 8,
                border: "1px solid #c4a565",
                background: "transparent",
                color: "#c4a565",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#3d3520";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              + New Document
            </button>

            {/* Document List */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 48,
                      borderRadius: 8,
                      background: "#141414",
                      animation: "pulse 1.5s infinite",
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  background: "#2a1a1a",
                  border: "1px solid #4a2a2a",
                  color: "#c88c8c",
                  fontSize: 13,
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                {error}
                <button
                  onClick={fetchDocuments}
                  style={{
                    display: "block",
                    marginTop: 8,
                    background: "none",
                    border: "none",
                    color: "#c4a565",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && documents.length === 0 && (
              <div
                style={{
                  padding: "24px 12px",
                  textAlign: "center",
                  color: "#8a8578",
                  fontSize: 13,
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                No documents yet
              </div>
            )}

            {!loading &&
              !error &&
              documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    marginBottom: 4,
                    borderRadius: 8,
                    border: "none",
                    background:
                      currentDocId === doc.id ? "#1a1a1a" : "transparent",
                    color: "#e0d8c8",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 13,
                    transition: "background 0.1s ease",
                    borderLeft:
                      currentDocId === doc.id
                        ? "2px solid #c4a565"
                        : "2px solid transparent",
                    paddingLeft: currentDocId === doc.id ? "10px" : "12px",
                  }}
                  onMouseEnter={(e) => {
                    if (currentDocId !== doc.id) {
                      e.currentTarget.style.background = "#141414";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentDocId !== doc.id) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a8578" }}>
                    {formatDate(doc.updated_at)}
                  </div>
                </button>
              ))}
          </div>
        )}
      </aside>

      {/* File Upload Modal */}
      <FileUpload
        isOpen={fileUploadOpen}
        onClose={() => setFileUploadOpen(false)}
        onImport={onImport}
      />
    </>
  );
}