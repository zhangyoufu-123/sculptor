// lib/ai/context-memory.ts
import { getSupabase } from "@/lib/supabase";
import type { MemoryEntry } from "@/types/editor";

interface WriteMemoryInput {
  memoryType: string;
  memoryData: Record<string, unknown>;
  importance?: number;
}

const MAX_MEMORIES_PER_USER = 200;
const IMPORTANCE_THRESHOLD = 0.3;

export async function writeMemory(
  userId: string,
  documentId: string | null,
  entry: WriteMemoryInput
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from("context_memory").insert({
    user_id: userId,
    document_id: documentId,
    memory_type: entry.memoryType,
    memory_data: entry.memoryData,
    importance: entry.importance ?? 0.5,
  });

  // Check if we need to evict
  const { count } = await supabase
    .from("context_memory")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > MAX_MEMORIES_PER_USER) {
    const toDelete = count - MAX_MEMORIES_PER_USER + 10;
    await supabase
      .from("context_memory")
      .delete()
      .eq("user_id", userId)
      .lt("importance", IMPORTANCE_THRESHOLD)
      .order("last_accessed", { ascending: true })
      .limit(toDelete);
  }
}

export async function readRecentMemories(
  userId: string,
  documentId?: string | null,
  limit = 20
): Promise<MemoryEntry[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("context_memory")
    .select("*")
    .eq("user_id", userId)
    .gte("importance", IMPORTANCE_THRESHOLD)
    .order("importance", { ascending: false })
    .limit(limit);

  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data } = await query;

  // Touch last_accessed
  if (data && data.length > 0) {
    const ids = data.map((d: any) => d.id);
    await supabase
      .from("context_memory")
      .update({ last_accessed: new Date().toISOString() })
      .in("id", ids);
  }

  return (data || []).map((d: any) => ({
    memoryType: d.memory_type,
    memoryData: d.memory_data,
    importance: typeof d.importance === "number" ? d.importance : 0.5,
  }));
}
