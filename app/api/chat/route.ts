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
            // v8.0: Structure suggestions, not sentence guessing
            if (isMockMode()) {
              const nodeTitle = body.nodeContext?.title || "";
              const mockText = nodeTitle
                ? `• 可以补充的数据或案例\n• 一个反方观点\n• 过渡到下一段的衔接`
                : `• 你的核心论点是什么？\n• 谁是你的读者？\n• 这篇文章想改变什么？`;
              await new Promise((r) => setTimeout(r, 300));
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
                  content: `You are a writing coach, NOT a ghost writer. Do NOT continue the user's sentence. Instead, suggest 2-3 STRUCTURE ideas:\n- What data/example could support this point?\n- What counterargument should be addressed?\n- What transition would connect this to the next paragraph?\n\nOutput as bullet points (• ). Keep each point under 25 words. Write in Chinese.`,
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
