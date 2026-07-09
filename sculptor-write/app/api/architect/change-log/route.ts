import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { logChange } from "@/lib/ai/architect-memory";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";
    const body = await request.json();
    const { documentId, source, action, payload } = body;

    if (!action) return Response.json({ error: "Missing action" }, { status: 400 });

    await logChange(userId, documentId, source, action, payload);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
