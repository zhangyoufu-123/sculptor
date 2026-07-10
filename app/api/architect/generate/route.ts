import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { ARCHITECT_GENERATE_PROMPT, buildArchitectGeneratePrompt } from "@/lib/ai/prompts/architect-generate";
import { isMockMode, MOCK_GENERATE_RESPONSE } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, userInput, conversationSummary } = body;

    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 800));
      // Customize mock response with the template name
      const mock = { ...MOCK_GENERATE_RESPONSE };
      const firstNode = mock.nodes[0];
      if (firstNode && templateType) {
        const typeNames: Record<string, string> = {
          argumentative: "论证：我们需要重新思考城市与自然的关系",
          narrative: "故事：那个夏天，城市教会了我什么是热",
          expository: "说明：城市热岛效应的形成机制",
          essay: "城市热岛的记忆",
          report: "报告：2024年城市热环境调查",
        };
        firstNode.label = typeNames[templateType] || firstNode.label;
      }
      return Response.json(mock);
    }

    const prompt = buildArchitectGeneratePrompt(templateType || "essay", userInput || "", conversationSummary || "");
    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: ARCHITECT_GENERATE_PROMPT }, { role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    return Response.json(JSON.parse(content));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
