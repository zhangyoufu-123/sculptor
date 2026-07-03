import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";
import type { SuggestionOption } from "@/types/editor";

export const runtime = "nodejs";
export const maxDuration = 60;

const MOCK_DATA: Record<string, SuggestionOption[]> = {
  rewrite: [
    { index: 0, text: "The morning light filtered softly through the canopy, casting long, dappled shadows across the garden path.", styleShift: "more_poetic" },
    { index: 1, text: "Sunlight streamed through the trees, creating shifting patterns of light and shadow on the path ahead.", styleShift: "more_direct" },
    { index: 2, text: "As the morning sun climbed higher, its rays pierced the dense canopy above, scattering fragments of golden light across the winding garden path, where shadows danced and shifted with each passing breeze.", styleShift: "more_detailed" },
  ],
  continue: [
    { index: 0, text: "The air carried the scent of damp earth and blooming jasmine, a quiet reminder that spring had finally arrived.", styleShift: "more_sensory" },
    { index: 1, text: "Birds called out from the treetops, their songs echoing through the still morning air.", styleShift: "more_direct" },
    { index: 2, text: "Beyond the garden gate, the mist was lifting from the meadow, revealing a landscape still wet with dew and drenched in the pale gold of early morning.", styleShift: "more_descriptive" },
  ],
  explain: [
    { index: 0, text: "In simple terms, the morning sunlight was coming through the trees and making shadows on the ground.", styleShift: "simpler" },
    { index: 1, text: "What this describes is the visual effect of sunrise filtering through leaves, casting varied shadows across a garden walkway.", styleShift: "more_analytical" },
    { index: 2, text: "The author is painting a picture of early morning: light breaking through foliage, creating a play of light and dark on the path below.", styleShift: "more_reflective" },
  ],
};

function buildStylePrompt(profile: Record<string, unknown> | null): string {
  if (!profile) {
    return "Style: balanced, neutral tone. Use natural sentence lengths. Match a general writing style.";
  }

  const tone = profile.tone || "neutral";
  const avgLen = profile.avg_sentence_length || 15;
  const imagery =
    Array.isArray(profile.common_imagery) && profile.common_imagery.length > 0
      ? profile.common_imagery.join(", ")
      : "none specified";
  const formality = profile.formality || 5;
  const keywords =
    Array.isArray(profile.keywords) && profile.keywords.length > 0
      ? profile.keywords.join(", ")
      : "none specified";

  return `Style profile:
- Tone: ${tone}
- Average sentence length: ${avgLen} words
- Common imagery: ${imagery}
- Formality: ${formality}/10
- Keywords: ${keywords}

Match this style. Provide exactly 3 options.`;
}

function buildIntentInstruction(intent: string): string {
  switch (intent) {
    case "rewrite":
      return "Rewrite the selected text to match the specified style. Keep the same meaning, facts, and key details.";
    case "continue":
      return "Continue writing from the selected position. Match the style, tone, and rhythm of the surrounding text. Write 2-4 sentences.";
    case "explain":
      return "Explain the selected text in simpler, clearer terms. Keep it concise and accessible.";
    default:
      return "Rewrite the selected text.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedText, intent } = body;

    if (!selectedText || !intent) {
      return Response.json(
        { error: "Missing selectedText or intent" },
        { status: 400 }
      );
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    // Fetch user's style profile
    let styleProfile: Record<string, unknown> | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("style_profiles")
          .select("profile, keywords")
          .eq("user_id", session.user.id)
          .single();
        if (data) {
          styleProfile = {
            ...((data.profile as Record<string, unknown>) || {}),
            keywords: data.keywords || [],
          };
        }
      }
    } catch {
      // Non-fatal: proceed without style profile
    }

    const systemPrompt = `You are a writing assistant inside a Word-like editor. ${buildStylePrompt(styleProfile)}

${buildIntentInstruction(intent)}

Selected text: """${selectedText}"""

Provide exactly 3 distinct options. Each option should differ meaningfully in approach or style.

Respond in JSON format only:
{
  "options": [
    {"text": "...", "style_shift": "more_poetic"},
    {"text": "...", "style_shift": "more_direct"},
    {"text": "...", "style_shift": "more_detailed"}
  ]
}

Rules:
- Options must be meaningfully different from each other
- Each must be valid prose (no markdown, no lists, no bullet points)
- Total length per option: 1-4 sentences
- All options must preserve original meaning`;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          let options: SuggestionOption[];

          if (isMock) {
            options = (MOCK_DATA[intent as string] || MOCK_DATA.rewrite).map(
              (o, i) => ({ ...o, index: i })
            );
          } else {
            const client = new OpenAI({
              apiKey: process.env.DEEPSEEK_API_KEY || "",
              baseURL:
                process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
            });

            const response = await client.chat.completions.create({
              model: "deepseek-chat",
              temperature: 0.7,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Selected text: """${selectedText}"""` },
              ],
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("Empty AI response");

            const parsed = JSON.parse(content);
            options = (parsed.options || []).map(
              (o: { text: string; style_shift: string }, i: number) => ({
                index: i,
                text: o.text,
                styleShift: o.style_shift || "",
              })
            );
          }

          for (let i = 0; i < options.length; i++) {
            const event = {
              type: "option",
              index: i,
              text: options[i].text,
              styleShift: options[i].styleShift,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
            await new Promise((r) => setTimeout(r, 300));
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", total: options.length })}\n\n`
            )
          );
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Unknown error";
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
