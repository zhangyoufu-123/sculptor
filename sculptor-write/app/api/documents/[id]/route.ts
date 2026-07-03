import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !data) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    return Response.json({ document: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/documents/[id] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, title } = body;

    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) {
      updateData.content = content;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    const { data, error } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating document:", error.message);
      return Response.json({ error: "Failed to update document" }, { status: 500 });
    }

    return Response.json({ document: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("PATCH /api/documents/[id] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting document:", error.message);
      return Response.json({ error: "Failed to delete document" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("DELETE /api/documents/[id] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
