import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { deepseekCall, safeParse } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sampleText } = body;

    if (!sampleText || typeof sampleText !== "string" || sampleText.trim().length < 50) {
      return Response.json(
        { error: "Please provide at least 50 characters of writing sample" },
        { status: 400 }
      );
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    let profile: Record<string, unknown>;
    let keywords: string[];

    if (isMock) {
      profile = {
        tone: "balanced, neutral, natural",
        avg_sentence_length: 18,
        common_imagery: ["light", "shadow", "morning", "path", "garden"],
        formality: 5,
      };
      keywords = ["nature", "contemplative", "descriptive", "atmospheric"];
    } else {
      try {
        const systemPrompt =
          `You are a literary style analyst. Analyze the writing sample and output a JSON style profile. ` +
          `Identify the author's tone, average sentence length, common imagery words (3-5), formality level (1-10), ` +
          `and thematic keywords (4-6). Output ONLY valid JSON in this exact format:\n` +
          `{\n` +
          `  "tone": "string describing tone",\n` +
          `  "avg_sentence_length": number,\n` +
          `  "common_imagery": ["word1", "word2", "word3"],\n` +
          `  "formality": number(1-10),\n` +
          `  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"]\n` +
          `}`;

        const raw = await deepseekCall(systemPrompt, `Writing sample:\n"""\n${sampleText.slice(0, 3000)}\n"""`, 0.3);

        const parsed = safeParse(raw, "style profile");
        profile = {
          tone: parsed.tone || "neutral",
          avg_sentence_length: parsed.avg_sentence_length || 15,
          common_imagery: Array.isArray(parsed.common_imagery) ? parsed.common_imagery.slice(0, 5) : [],
          formality: typeof parsed.formality === "number" ? parsed.formality : 5,
        };
        keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 6) : [];
      } catch (err) {
        console.error("DeepSeek style analysis failed:", err);
        return Response.json(
          { error: "Style analysis failed. Please try again." },
          { status: 500 }
        );
      }
    }

    // Upsert style profile to database
    const supabase = getSupabase();

    const { error: upsertError } = await supabase
      .from("style_profiles")
      .upsert(
        {
          user_id: session.user.id,
          profile,
          keywords,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("Error saving style profile:", upsertError.message);
      // Non-fatal — return profile even if save fails
    }

    const result: Record<string, unknown> = {
      ...profile,
      keywords,
    };

    return Response.json({ profile: result, keywords });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/style/generate error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
