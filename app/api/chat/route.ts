// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/deepseek";
import { runPipeline } from "@/lib/ai/pipeline";
import { isMockMode, MOCK_GHOST_TEXTS } from "@/lib/ai/mock-responses";

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
            // Mock mode: context-aware ghost text
            if (isMockMode()) {
              const nodeTitle = body.nodeContext?.title || "";
              const nodeTip = body.nodeContext?.writingTip || "";
              let mockText = MOCK_GHOST_TEXTS[Math.floor(Math.random() * MOCK_GHOST_TEXTS.length)];
              if (nodeTitle) {
                mockText = `围绕「${nodeTitle}」展开，${mockText}`;
              }
              await new Promise((r) => setTimeout(r, 400));
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "ghost_text", text: mockText })}\n\n`
                )
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
              );
              controller.close();
              return;
            }

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

    // Pipeline-based intent handling (all non-ghost intents)
    if (intent && intent !== "ghost_continue") {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const userId = session?.user?.id || "anonymous";

          try {
            for await (const event of runPipeline({
              userId,
              documentId: body.documentId || null,
              currentText: body.text || body.selectedText || "",
              explicitIntent: intent,
              userInstruction:
                body.customText || body.userInstruction || "",
              intensity: body.intensity || "normal",
            })) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
              );

              // Simulate streaming delay between options
              if (event.type === "option") {
                await new Promise((r) => setTimeout(r, 300));
              }
            }
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

    return Response.json({ error: "Unknown intent" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
