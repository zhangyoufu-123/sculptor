// lib/ai/context-manager.ts
import { getSupabase } from "@/lib/supabase";
import { readRecentMemories } from "./context-memory";
import type { ContextPackage, FeedbackLog, StyleProfileData } from "@/types/editor";

interface CollectInput {
  userId: string;
  documentId?: string | null;
  currentText: string;
  surroundingContext?: string;
  userInstruction?: string;
}

export async function collectContext(input: CollectInput): Promise<ContextPackage> {
  const supabase = getSupabase();

  // Parallel: fetch style profile + recent feedback
  const [styleResult, feedbackResult] = await Promise.all([
    supabase
      .from("style_profiles")
      .select("profile, keywords")
      .eq("user_id", input.userId)
      .single(),
    supabase
      .from("feedback_logs")
      .select("*")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  let styleProfile: StyleProfileData | null = null;
  if (styleResult.data) {
    const profile = styleResult.data.profile as Record<string, unknown>;
    styleProfile = {
      tone: (profile.tone as string) || "neutral",
      avg_sentence_length: (profile.avg_sentence_length as number) || 15,
      common_imagery: Array.isArray(profile.common_imagery)
        ? (profile.common_imagery as string[])
        : [],
      formality: (profile.formality as number) || 5,
      keywords: Array.isArray(styleResult.data.keywords)
        ? (styleResult.data.keywords as string[])
        : [],
    };
  }

  // Fallback: if no style_profiles, try style_samples
  if (!styleProfile) {
    const { data: samplesData } = await supabase
      .from("style_samples")
      .select("samples, name")
      .eq("user_id", input.userId)
      .eq("is_active", true)
      .single();

    if (samplesData) {
      styleProfile = {
        tone: "balanced",
        avg_sentence_length: 15,
        common_imagery: [],
        formality: 5,
        keywords: [samplesData.name || "默认风格"],
      };
    }
  }

  const recentFeedback: FeedbackLog[] = (feedbackResult.data || []).map((f) => ({
    id: f.id,
    documentId: f.document_id || "",
    suggestionText: f.suggestion_text || "",
    action: f.action,
    contextPreview: f.context_preview || "",
    createdAt: f.created_at,
  }));

  return {
    userId: input.userId,
    documentId: input.documentId || "",
    currentText: input.currentText,
    surroundingContext: input.surroundingContext || input.currentText.slice(-500),
    userInstruction: input.userInstruction || "",
    styleProfile,
    documentSkeleton: null,
    recentFeedback,
    recentMemories: await readRecentMemories(
      input.userId,
      input.documentId
    ),
  };
}
