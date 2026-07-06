import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title } = body;

    if (!content || content.length < 50) {
      return Response.json({ error: "Content too short (min 50 chars)" }, { status: 400 });
    }

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an article structure analyst. Given an existing article, extract its logical structure as an architecture outline.

Output JSON:
{
  "nodes": [{"id":"n1","label":"Section title","type":"argument|evidence|background|thesis","position":{"x":400,"y":50},"children":[]}],
  "edges": [{"id":"e1","from":"n1","to":"n2","relation":"precedes|supports|elaborates"}]
}

Rules:
- Extract 5-10 nodes maximum
- thesis node goes at the top center
- Group related paragraphs into one node
- Use "precedes" for sequential flow, "supports" for evidence, "elaborates" for detail
- Each node label max 30 characters`,
        },
        { role: "user", content: `Title: ${title || "Untitled"}

Content: ${content.slice(0, 4000)}` },
      ],
    });

    const respContent = response.choices[0]?.message?.content;
    if (!respContent) throw new Error("Empty response");

    const parsed = JSON.parse(respContent);
    return Response.json({ nodes: parsed.nodes || [], edges: parsed.edges || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
