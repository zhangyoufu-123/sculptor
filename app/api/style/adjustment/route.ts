// app/api/style/adjustment/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

// PUT /api/style/adjustment — user manually adjusts style observations
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { styleId, adjustments } = body;

    if (!styleId || !adjustments) {
      return Response.json({ error: "Missing styleId or adjustments" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get current adjustments
    const { data } = await supabase
      .from("style_samples")
      .select("user_adjustments")
      .eq("id", styleId)
      .eq("user_id", session.user.id)
      .single();

    const currentAdjustments: unknown[] = Array.isArray(data?.user_adjustments)
      ? (data.user_adjustments as unknown[])
      : [];

    currentAdjustments.push({
      timestamp: new Date().toISOString(),
      ...adjustments,
    });

    const { error } = await supabase
      .from("style_samples")
      .update({ user_adjustments: currentAdjustments })
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
