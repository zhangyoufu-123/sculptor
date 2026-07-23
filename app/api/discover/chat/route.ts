import { NextRequest } from "next/server";
import { runtimeLoop, initState, type RuntimeState } from "@/lib/ai/runtime-v3";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, thinking, state: prevState } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      thinking?: string[];
      state?: RuntimeState;
    };

    const input = anchor?.trim() || "这个话题";
    const lastUserMsg = history?.filter((m) => m.role === "user").pop()?.content || "";

    let state: RuntimeState = prevState || initState(input);

    const { response, state: newState } = await runtimeLoop(state, lastUserMsg);

    return Response.json({
      response,
      state: newState,
      completeness: newState.completeness,
      outputReady: newState.outputReady,
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      response: "我们继续——你现在最想聊什么？",
      state: initState(""),
      completeness: 0,
      outputReady: false,
    });
  }
}
