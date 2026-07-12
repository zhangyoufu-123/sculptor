// v8.1: Draft snapshots — simple timestamped versions like Apple Notes

export interface DraftSnapshot {
  id: string;
  title: string;
  content: string;         // plain text only
  preview: string;          // first 60 chars
  createdAt: number;        // unix ms
  wordCount: number;
}

const STORAGE_KEY_PREFIX = "sculptor-drafts-";

// ── Human-friendly time strings ────────────────────────────────

function formatTime(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 3) return `${hours} 小时前`;

  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (date.toDateString() === today.toDateString()) {
    return `今天 ${timeStr}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${timeStr}`;
  }

  const dayDiff = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (dayDiff < 7) {
    return `${dayDiff} 天前`;
  }

  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

// ── Public API ─────────────────────────────────────────────────

export function getStorageKey(docId: string): string {
  return `${STORAGE_KEY_PREFIX}${docId}`;
}

export function loadDrafts(docId: string): DraftSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(docId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.createdAt - a.createdAt); // newest first
  } catch {
    return [];
  }
}

export function saveDraft(
  docId: string,
  title: string,
  content: string
): DraftSnapshot {
  const drafts = loadDrafts(docId);
  const snapshot: DraftSnapshot = {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title || "无标题",
    content,
    preview: content.trim().slice(0, 60),
    createdAt: Date.now(),
    wordCount: content.length,
  };

  // Don't save if content is identical to the last snapshot
  const last = drafts[0];
  if (last && last.content === content) return last;

  drafts.unshift(snapshot);

  // Keep max 50 snapshots per document
  const trimmed = drafts.slice(0, 50);
  localStorage.setItem(getStorageKey(docId), JSON.stringify(trimmed));
  return snapshot;
}

export function deleteDraft(docId: string, draftId: string): void {
  const drafts = loadDrafts(docId);
  const filtered = drafts.filter((d) => d.id !== draftId);
  localStorage.setItem(getStorageKey(docId), JSON.stringify(filtered));
}

export function getDraftTimeString(draft: DraftSnapshot): string {
  return formatTime(draft.createdAt);
}

export function clearDrafts(docId: string): void {
  localStorage.removeItem(getStorageKey(docId));
}
