// lib/local-store.ts
// v5.0 — 统一本地持久化层：架构、文档、偏好、写作历史
// 所有 Agent 通过此模块读写用户数据，无需关心存储细节。

import type { ArchNode } from "@/types/architect";

const KEYS = {
  ARCHITECTURE: "sculptor_architecture",
  DOCUMENTS: "sculptor_documents",
  DOC_CONTENT: (id: string) => `sculptor_doc_${id}`,
  PREFERENCES: "sculptor_preferences",
  WRITING_HISTORY: "sculptor_writing_history",
} as const;

// ── Architecture ────────────────────────────────────────────

export interface ArchitectureSnapshot {
  nodes: ArchNode[];
  updatedAt: number; // timestamp
}

export function saveArchitecture(nodes: ArchNode[]): void {
  if (typeof window === "undefined") return;
  const snap: ArchitectureSnapshot = { nodes, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEYS.ARCHITECTURE, JSON.stringify(snap));
  } catch { /* quota exceeded — silently degrade */ }
}

export function loadArchitecture(): ArchitectureSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.ARCHITECTURE);
    if (!raw) return null;
    return JSON.parse(raw) as ArchitectureSnapshot;
  } catch {
    return null;
  }
}

export function hasArchitecture(): boolean {
  const snap = loadArchitecture();
  return !!(snap && snap.nodes.length > 0);
}

// ── Documents ────────────────────────────────────────────────

export interface DocMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  wordCount?: number;
}

export function saveDocumentMeta(doc: DocMeta): void {
  if (typeof window === "undefined") return;
  const docs = loadAllDocMeta();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.push(doc);
  try {
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(docs));
  } catch { /* */ }
}

export function loadAllDocMeta(): DocMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.DOCUMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadDocMeta(id: string): DocMeta | null {
  return loadAllDocMeta().find((d) => d.id === id) || null;
}

export function deleteDocMeta(id: string): void {
  const docs = loadAllDocMeta().filter((d) => d.id !== id);
  localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(docs));
}

// ── Document Content ─────────────────────────────────────────

export function saveDocContent(id: string, content: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.DOC_CONTENT(id), content);
  } catch { /* */ }
}

export function loadDocContent(id: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(KEYS.DOC_CONTENT(id)) || "";
  } catch {
    return "";
  }
}

// ── Writing History (for AI context) ─────────────────────────

export interface WritingSession {
  date: string;          // ISO date
  architectureTitle: string;
  wordCount: number;
  genre?: string;
  structurePattern?: string; // e.g. "三段论", "先破后立"
}

export function saveWritingSession(session: WritingSession): void {
  if (typeof window === "undefined") return;
  const history = loadWritingHistory();
  // Deduplicate by date
  const existing = history.findIndex((h) => h.date === session.date);
  if (existing >= 0) history[existing] = session;
  else history.unshift(session);
  // Keep last 30 sessions
  const trimmed = history.slice(0, 30);
  try {
    localStorage.setItem(KEYS.WRITING_HISTORY, JSON.stringify(trimmed));
  } catch { /* */ }
}

export function loadWritingHistory(): WritingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.WRITING_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Get writing history as a human-readable summary for AI context */
export function getWritingHistorySummary(): string {
  const history = loadWritingHistory();
  if (history.length === 0) return "";

  const lines = history.slice(0, 5).map((s) =>
    `- ${s.date}: 《${s.architectureTitle}》${s.genre ? ` (${s.genre})` : ""} — ${s.wordCount}字，结构：${s.structurePattern || "未知"}`
  );
  return "## 用户近期写作历史\n" + lines.join("\n");
}

// ── Preferences ──────────────────────────────────────────────

export function savePreference(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const prefs = loadAllPreferences();
    prefs[key] = value;
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch { /* */ }
}

export function loadPreference<T = unknown>(key: string): T | null {
  const prefs = loadAllPreferences();
  return (prefs[key] as T) ?? null;
}

function loadAllPreferences(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEYS.PREFERENCES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ── Bulk export / import ─────────────────────────────────────

export function exportAllData(): string {
  const data = {
    architecture: loadArchitecture(),
    documents: loadAllDocMeta(),
    history: loadWritingHistory(),
    preferences: typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || "{}")
      : {},
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

/** Clear all Sculptor local data */
export function clearAllData(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.values(KEYS)) {
    if (typeof key === "function") {
      // Dynamic keys like DOC_CONTENT(id) — skip
      continue;
    }
    localStorage.removeItem(key);
  }
  // Also clear dynamic doc content keys
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("sculptor_doc_")) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}
