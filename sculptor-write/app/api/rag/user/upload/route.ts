// app/api/rag/user/upload/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/rag/user/upload — upload user document for vector indexing
// Limited to plain text — embedding generation deferred to v2.2 with pgvector
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!content || typeof content !== "string" || content.length < 20) {
      return Response.json(
        { error: "Content too short (min 20 chars)" },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      return Response.json(
        { error: "Content too long (max 50000 chars)" },
        { status: 413 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("user_corpus")
      .insert({
        user_id: session.user.id,
        title: title || "未命名素材",
        content,
        // embedding omitted — generated via pgvector in v2.2
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      id: data.id,
      message: "Document uploaded. Vector indexing will be available in v2.2.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
