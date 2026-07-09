// lib/ai/architect-memory.ts
// v4.0-LazyMode: 双端同步日志 + 长期偏好记忆

import { getSupabase } from "@/lib/supabase";

// ── Change log (dual-end sync) ────────────────────────────

interface ChangePayload {
  nodeId?: string;
  label?: string;
  position?: { x: number; y: number };
  action?: string;
  from?: string;
  to?: string;
  relation?: string;
}

/** Log a canvas or chat change for dual-end sync */
export async function logChange(
  userId: string,
  documentId: string | undefined,
  source: "chat" | "canvas",
  action: string,
  payload: ChangePayload,
) {
  try {
    if (userId === "anonymous" || !documentId) return;
    const supabase = getSupabase();
    await supabase.from("architect_change_log").insert({
      document_id: documentId,
      user_id: userId,
      source,
      action,
      payload,
    });
  } catch {
    // Best-effort, never throw
  }
}

/** Get recent canvas-side changes for injection into chat context */
export async function getRecentCanvasChanges(
  documentId: string | undefined,
  sinceMinutes: number = 10,
): Promise<string> {
  try {
    if (!documentId) return "";
    const supabase = getSupabase();
    const cutoff = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("architect_change_log")
      .select("action, payload, created_at")
      .eq("document_id", documentId)
      .eq("source", "canvas")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data?.length) return "";

    return data
      .map((entry: { action: string; payload: ChangePayload; created_at: string }) => {
        const time = new Date(entry.created_at);
        const minutesAgo = Math.round((Date.now() - time.getTime()) / 60000);
        const timeStr = minutesAgo < 1 ? "刚刚" : `${minutesAgo}分钟前`;

        switch (entry.action) {
          case "add_node":
            return `- ${timeStr}：添加了节点"${entry.payload.label || ""}"`;
          case "delete_node":
            return `- ${timeStr}：删除了节点"${entry.payload.label || ""}"`;
          case "edit_title":
            return `- ${timeStr}：将节点标题修改为"${entry.payload.label || ""}"`;
          case "move_node":
            return `- ${timeStr}：移动了节点"${entry.payload.label || ""}"`;
          case "add_edge":
            return `- ${timeStr}：添加了连线`;
          case "delete_edge":
            return `- ${timeStr}：删除了连线`;
          default:
            return `- ${timeStr}：${entry.action}`;
        }
      })
      .join("\n");
  } catch {
    return "";
  }
}

// ── Long-term preferences (context_memory) ─────────────────

interface PreferenceData {
  genre?: string;
  pattern?: string;
  confidence?: number;
}

/** Read user's writing preferences from context_memory */
export async function getUserPreferences(userId: string): Promise<string> {
  try {
    if (userId === "anonymous") return "";
    const supabase = getSupabase();
    const { data } = await supabase
      .from("context_memory")
      .select("memory_data")
      .eq("user_id", userId)
      .in("memory_type", ["preferred_structure", "hated_patterns", "writing_habits"])
      .order("updated_at", { ascending: false })
      .limit(5);

    if (!data?.length) return "";

    const lines: string[] = [];
    for (const entry of data) {
      const d = entry.memory_data as PreferenceData;
      if (d?.genre && d?.pattern) {
        lines.push(`- 写${d.genre}时偏好：${d.pattern}`);
      }
    }
    return "## 用户写作偏好\n" + lines.join("\n");
  } catch {
    return "";
  }
}

/** Learn from user feedback — record preference or pattern */
export async function recordPreference(
  userId: string,
  memoryType: "preferred_structure" | "hated_patterns" | "writing_habits",
  memoryData: Record<string, unknown>,
) {
  try {
    if (userId === "anonymous") return;
    const supabase = getSupabase();
    await supabase.from("context_memory").insert({
      user_id: userId,
      memory_type: memoryType,
      memory_data: memoryData,
    });
  } catch {
    // Best-effort
  }
}
