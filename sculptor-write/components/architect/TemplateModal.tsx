"use client";

import { useState, useEffect, useCallback } from "react";
import type { ArchNode } from "@/types/architect";

interface TemplateMeta {
  name: string;
  description: string;
  icon: string;
  nodes: ArchNode[];
}

interface SavedTemplate {
  id: string;
  name: string;
  nodes: ArchNode[];
  savedAt: string;
}

const PRESET_TEMPLATES = [
  { file: "argumentative.json" },
  { file: "narrative.json" },
  { file: "expository.json" },
  { file: "essay.json" },
  { file: "report.json" },
];

const STORAGE_KEY = "sculptor_my_templates";

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onLoadTemplate: (nodes: ArchNode[]) => void;
  onSaveAsTemplate?: () => void;
  currentNodes?: ArchNode[];
}

export default function TemplateModal({
  open,
  onClose,
  onLoadTemplate,
  onSaveAsTemplate,
  currentNodes,
}: TemplateModalProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "mine">("preset");
  const [presetTemplates, setPresetTemplates] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState<TemplateMeta | null>(null);
  const [myTemplates, setMyTemplates] = useState<SavedTemplate[]>([]);

  // Load preset templates from JSON files
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadPresets() {
      setLoading(true);
      const results: TemplateMeta[] = [];
      for (const t of PRESET_TEMPLATES) {
        try {
          const res = await fetch(`/templates/${t.file}`);
          if (res.ok) {
            const data = await res.json();
            results.push(data as TemplateMeta);
          }
        } catch {
          // skip failed loads
        }
      }
      if (!cancelled) {
        setPresetTemplates(results);
        setLoading(false);
      }
    }

    loadPresets();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Load my templates from localStorage
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setMyTemplates(JSON.parse(raw));
      } else {
        setMyTemplates([]);
      }
    } catch {
      setMyTemplates([]);
    }
  }, [open]);

  const handleLoadPreset = useCallback(
    (template: TemplateMeta) => {
      setConfirmLoad(template);
    },
    []
  );

  const confirmLoadTemplate = useCallback(() => {
    if (confirmLoad) {
      onLoadTemplate(confirmLoad.nodes);
      setConfirmLoad(null);
      onClose();
    }
  }, [confirmLoad, onLoadTemplate, onClose]);

  const handleLoadMyTemplate = useCallback(
    (template: SavedTemplate) => {
      onLoadTemplate(template.nodes);
      onClose();
    },
    [onLoadTemplate, onClose]
  );

  const handleSaveCurrent = useCallback(() => {
    if (!currentNodes || currentNodes.length === 0) return;
    const name = window.prompt("模板名称：");
    if (!name || !name.trim()) return;

    const newTemplate: SavedTemplate = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      nodes: currentNodes,
      savedAt: new Date().toISOString(),
    };

    const updated = [newTemplate, ...myTemplates].slice(0, 20); // max 20 templates
    setMyTemplates(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage full
    }
  }, [currentNodes, myTemplates]);

  const handleDeleteMyTemplate = useCallback(
    (id: string) => {
      const updated = myTemplates.filter((t) => t.id !== id);
      setMyTemplates(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    },
    [myTemplates]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 700,
          maxHeight: "80vh",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            模板库
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="关闭"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-light)",
            padding: "0 20px",
          }}
        >
          <TabButton
            active={activeTab === "preset"}
            onClick={() => setActiveTab("preset")}
          >
            预设模板
          </TabButton>
          <TabButton
            active={activeTab === "mine"}
            onClick={() => setActiveTab("mine")}
          >
            我的模板
          </TabButton>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
          }}
        >
          {/* Preset templates */}
          {activeTab === "preset" && (
            <>
              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                  }}
                >
                  加载中...
                </div>
              )}
              {!loading && presetTemplates.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                  }}
                >
                  暂无预设模板
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {presetTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.name}
                    icon={tpl.icon || "📄"}
                    name={tpl.name}
                    description={tpl.description || ""}
                    nodeCount={tpl.nodes?.length || 0}
                    onClick={() => handleLoadPreset(tpl)}
                  />
                ))}
              </div>
            </>
          )}

          {/* My templates */}
          {activeTab === "mine" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  共 {myTemplates.length} 个模板
                </span>
                <button
                  onClick={handleSaveCurrent}
                  disabled={!currentNodes || currentNodes.length === 0}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--gold)",
                    background: "transparent",
                    color: "var(--gold)",
                    fontSize: 13,
                    cursor:
                      currentNodes && currentNodes.length > 0
                        ? "pointer"
                        : "not-allowed",
                    opacity:
                      currentNodes && currentNodes.length > 0 ? 1 : 0.4,
                    fontFamily: "inherit",
                  }}
                >
                  + 保存当前为模板
                </button>
              </div>

              {myTemplates.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 40, opacity: 0.4 }}>📋</span>
                  <span>还没有保存的模板</span>
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                    }}
                  >
                    创建文章结构后，可以保存为模板以便复用
                  </span>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {myTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    icon="📋"
                    name={tpl.name}
                    description={`${tpl.nodes.length} 个节点 · ${formatDate(tpl.savedAt)}`}
                    nodeCount={tpl.nodes.length}
                    onClick={() => handleLoadMyTemplate(tpl)}
                    onDelete={() => handleDeleteMyTemplate(tpl.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation overlay */}
      {confirmLoad && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          }}
        >
          <div
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--gold)",
              borderRadius: 12,
              padding: "24px",
              maxWidth: 360,
              textAlign: "center",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              {confirmLoad.icon || "📄"}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              加载「{confirmLoad.name}」模板？
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginBottom: 20,
              }}
            >
              当前结构将被替换，此操作不可撤销。
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setConfirmLoad(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                取消
              </button>
              <button
                onClick={confirmLoadTemplate}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--gold)",
                  color: "#0a0a0a",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                确认加载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
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
      style={{
        padding: "10px 16px",
        border: "none",
        background: "transparent",
        color: active ? "var(--gold)" : "var(--text-secondary)",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        borderBottom: active ? "2px solid var(--gold)" : "2px solid transparent",
        marginBottom: -1,
        transition: "color 0.15s, border-color 0.15s",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function TemplateCard({
  icon,
  name,
  description,
  nodeCount,
  onClick,
  onDelete,
}: {
  icon: string;
  name: string;
  description: string;
  nodeCount: number;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--gold)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(201,169,92,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="删除模板"
          aria-label="删除模板"
        >
          ✕
        </button>
      )}

      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.4,
        }}
      >
        {description}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: "var(--gold)",
          opacity: 0.7,
        }}
      >
        {nodeCount} 个节点
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "";
  }
}
