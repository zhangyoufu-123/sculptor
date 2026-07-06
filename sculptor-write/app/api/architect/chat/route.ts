import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an architecture assistant helping build article outlines. You receive the user's message, conversation history, and current architecture. Your job is to understand the user's intent and respond with an updated architecture.

Response types:
1. If instruction is clear: update architecture and confirm. Output:
   {"type":"confirmation","message":"已修改...","nodes":[...updated...],"edges":[...updated...]}

2. If instruction is vague: ask for clarification with options. Output:
   {"type":"clarification","message":"你想修改哪个方面？","options":[{"label":"选项1","value":"opt1"},{"label":"选项2","value":"opt2"}]}

3. If you have a proactive suggestion: suggest with preview. Output:
   {"type":"suggestion","message":"建议添加...","nodes":[...suggested...],"edges":[...suggested...]}

Special commands:
- "展开这个节点" / "加子节点": add child to selected node. Ask what label.
- "换一种结构": generate 2 alternative structure sets
- "逻辑检查": review for gaps. Mark issue nodes with reviewStatus.
- "删除这个": remove selected node and children
- "重新来过": return empty nodes/edges

Rules:
- Always include the FULL updated nodes and edges arrays (not just deltas)
- Keep node IDs stable unless adding new nodes
- Use the existing architecture as base, modify minimally
- If selectedNodeId is provided, use it as context
- Output valid JSON only, no markdown

Node types: thesis, argument, evidence, counterargument, transition, background, imagery, custom
Edge types: supports, contradicts, precedes, elaborates, exemplifies, concludes`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory, currentArchitecture, selectedNodeId } = body;

    if (!message) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    const arch = currentArchitecture || { nodes: [], edges: [] };

    const userPrompt = `User message: "${message}"
Selected node: ${selectedNodeId || "none"}
Current architecture (JSON): ${JSON.stringify(arch)}
Conversation history: ${JSON.stringify(history.slice(-6))}

Respond with the appropriate type (confirmation, clarification, or suggestion) and include FULL updated architecture if making changes.`;

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);

    // Stream response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send the AI response
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}

`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}

`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
