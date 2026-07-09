import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode, MOCK_AUTO_FIX_RESPONSE } from "@/lib/ai/mock-responses";
import { AUTO_FIX_SYSTEM_PROMPT, buildAutoFixPrompt } from "@/lib/ai/prompts/architect-auto-fix";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueType, nodeId, currentArchitecture } = body;
    if (!issueType || !nodeId) {
      return Response.json({ error: "Missing issueType or nodeId" }, { status: 400 });
    }

    const arch = currentArchitecture || { nodes: [], edges: [] };
    const targetNode = arch.nodes?.find((n: { id: string }) => n.id === nodeId);
    const nodeLabel = targetNode?.label || "未知节点";

    // Mock mode
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 500));
      return Response.json(MOCK_AUTO_FIX_RESPONSE);
    }

    const userPrompt = buildAutoFixPrompt({
      issueType,
      nodeId,
      nodeLabel,
      currentArchitecture: arch,
    });

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: AUTO_FIX_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
