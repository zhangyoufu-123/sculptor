// app/api/style/evolution/route.ts
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
    const { styleId, snapshot } = body;

    if (!styleId) {
      return Response.json({ error: "Missing styleId" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data } = await supabase
      .from("style_samples")
      .select("evolution")
      .eq("id", styleId)
      .eq("user_id", session.user.id)
      .single();

    const currentEvolution: unknown[] = Array.isArray(data?.evolution)
      ? (data.evolution as unknown[])
      : [];

    currentEvolution.push({
      timestamp: new Date().toISOString(),
      snapshot,
    });

    const { error } = await supabase
      .from("style_samples")
      .update({ evolution: currentEvolution })
      .eq("id", styleId)
      .eq("user_id", session.user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
