import { NextRequest } from "next/server";
import { completionLoop, initCompletion, type CompletionState } from "@/lib/ai/runtime-v4";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, state: prevState } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      state?: CompletionState;
    };

    const input = anchor?.trim() || "这个话题";
    const lastUserMsg = history?.filter((m) => m.role === "user").pop()?.content || "";

    let state: CompletionState = prevState || initCompletion(input);

    const { response, state: newState } = await completionLoop(state, lastUserMsg);

    return Response.json({
      response,
      state: newState,
      completion: newState.completion,
      phase: newState.phase,
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      response: "我们继续。",
      state: initCompletion(""),
      completion: 0,
      phase: "skeleton",
    });
  }
}
