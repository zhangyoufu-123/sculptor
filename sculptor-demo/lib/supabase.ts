import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function saveAnalysis(
  sourceUrl: string | null,
  sourceText: string,
  result: unknown
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("Supabase not configured, skipping save");
    return;
  }

  const { error } = await supabase.from("analyses").insert({
    source_url: sourceUrl,
    source_text: sourceText,
    status: "completed",
    result,
  });

  if (error) {
    console.error("Failed to save analysis to Supabase:", error);
  }
}
