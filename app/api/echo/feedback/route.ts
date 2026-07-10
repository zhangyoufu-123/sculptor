import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * EchoWall feedback endpoint — records user 👍/👎 on diagnosis and inspiration items.
 * Best-effort fire-and-forget. Never throws, never blocks the UI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, helpful, context } = body;

    // In production, this would write to feedback_logs table.
    // For now, log to console and return success.
    console.log(`[EchoWall Feedback] ${type} | ${id} | ${helpful ? "👍" : "👎"} | context: ${(context || "").slice(0, 50)}`);

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false }, { status: 200 }); // Never fail
  }
}
