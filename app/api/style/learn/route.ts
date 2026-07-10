// app/api/style/learn/route.ts
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
    const { name, samples } = body;

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return Response.json({ error: "Missing samples array" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("style_samples")
      .insert({
        user_id: session.user.id,
        name: name || "默认风格",
        samples: JSON.stringify(samples),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, id: data.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
