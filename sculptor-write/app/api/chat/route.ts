// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { text, intent } = body;

    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    // Ghost continue: minimal prompt, stream single continuation
    if (intent === "ghost_continue") {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const client = createClient();

            const response = await client.chat.completions.create({
              model: "deepseek-chat",
              temperature: 0.6,
              max_tokens: 150,
              stream: true,
              messages: [
                {
                  role: "system",
                  content: `You are a ghost writer providing seamless inline continuation. Rules:
- Continue naturally from where the text leaves off
- Output 1-2 sentences maximum
- Match the tone, rhythm, and style of the existing text EXACTLY
- Do NOT start a new paragraph, headline, or change topic
- Do NOT use markdown, quotes, or formatting
- Write as if you are the same author continuing mid-sentence or mid-paragraph`,
                },
                {
                  role: "user",
                  content: `Continue naturally from this text:\n\n${text}`,
                },
              ],
            });

            let fullText = "";
            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                fullText += content;
              }
            }

            if (fullText.trim()) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "ghost_text", text: fullText.trim() })}\n\n`
                )
              );
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`
              )
            );
          }
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
    }

    // Future: other intents will be handled by pipeline (Phase 2)
    return Response.json({ error: "Unknown intent" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
