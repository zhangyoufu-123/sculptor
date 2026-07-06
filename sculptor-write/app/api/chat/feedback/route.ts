// app/api/chat/feedback/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, suggestionText, action, contextPreview } = body;

    if (!action || !["accept", "reject", "modify"].includes(action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("feedback_logs").insert({
      user_id: session.user.id,
      document_id: documentId || null,
      suggestion_text: suggestionText || "",
      action,
      context_preview: contextPreview || "",
      style_profile_snapshot: null,
    });

    if (error) {
      console.error("Feedback insert error:", error);
      return Response.json(
        { error: "Failed to record feedback" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
