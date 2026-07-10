import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("documents")
      .select("id, title, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error.message);
      return Response.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    return Response.json({ documents: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/documents error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: session.user.id,
        title: "Untitled",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating document:", error.message);
      return Response.json({ error: "Failed to create document" }, { status: 500 });
    }

    return Response.json({ document: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/documents error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
