import { NextRequest } from "next/server";
import type { RuntimeState } from "@/lib/ai/runtime-v3";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { state } = body as { state?: RuntimeState };

    if (!state?.blueprint) {
      return Response.json({ outline: [] });
    }

    // Generate outline from Blueprint slots
    const outline: { level: number; title: string; notes: string }[] = [];
    
    outline.push({ level: 1, title: state.goal || "未命名", notes: `${state.genre} · 蓝图完成度 ${state.completeness}%` });

    for (const slot of state.blueprint) {
      if (slot.status === "stable" || slot.value) {
        outline.push({
          level: 1,
          title: slot.label,
          notes: slot.value.slice(0, 100) || "(待补充)",
        });
      }
    }

    return Response.json({ outline });
  } catch {
    return Response.json({ outline: [] });
  }
}
