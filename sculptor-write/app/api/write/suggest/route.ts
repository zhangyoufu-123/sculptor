import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import OpenAI from "openai";
import type { Intent, SuggestionOption } from "@/types/editor";

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
  shorter: [
    { index: 0, text: "Morning light fell through the canopy, dappling the garden path.", styleShift: "most_concise" },
    { index: 1, text: "Sunlight broke through the trees, casting shadows on the path.", styleShift: "simple_trim" },
    { index: 2, text: "Light filtered through leaves, scattering patterns across the ground.", styleShift: "minimalist" },
  ],
  longer: [
    { index: 0, text: "The soft morning light filtered gently through the dense, leafy canopy overhead, casting long, dappled shadows that danced and shifted across the winding garden path, which was still damp with the cool remnants of the night's dew.", styleShift: "more_elaborate" },
    { index: 1, text: "Through the interlaced branches of the ancient trees, the early sunlight poured in golden shafts, illuminating the garden path in a patchwork of warm light and cool shadow that seemed to breathe with the rhythm of the breeze.", styleShift: "more_atmospheric" },
    { index: 2, text: "As dawn gave way to morning, the sunlight found its way through the thick canopy, breaking into countless beams that painted the garden path with shifting mosaics of light and dark — a quiet spectacle that only those who pause can truly see.", styleShift: "more_poetic_expanded" },
  ],
  more_formal: [
    { index: 0, text: "The morning sunlight penetrated the arboreal canopy, producing elongated, dappled shadows upon the garden pathway.", styleShift: "formal_academic" },
    { index: 1, text: "Early light diffused through the foliage, resulting in an interplay of illumination and shadow across the adjacent pathway.", styleShift: "formal_neutral" },
    { index: 2, text: "Solar radiance permeated the vegetative cover, casting variegated patterns of light and shade along the garden thoroughfare.", styleShift: "formal_elevated" },
  ],
  more_casual: [
    { index: 0, text: "The morning sun peeked through the trees, you know, just scattering light and shadows all over the garden path.", styleShift: "casual_conversational" },
    { index: 1, text: "So the sun was coming through the canopy, making all these cool shadow patterns on the path.", styleShift: "casual_relaxed" },
    { index: 2, text: "Morning light kinda spilled through the leaves, leaving a mess of shadows across the garden walkway.", styleShift: "casual_colloquial" },
  ],
  translate_en: [
    { index: 0, text: "The morning light filtered softly through the canopy, casting long, dappled shadows across the garden path.", styleShift: "direct_translation" },
    { index: 1, text: "Gentle morning light streamed through the tree cover, throwing shifting shadows onto the garden walkway.", styleShift: "natural_english" },
    { index: 2, text: "Soft beams of morning sun broke through the leafy overhang, scattering patches of light and shadow along the garden path.", styleShift: "idiomatic_english" },
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
    case "shorter":
      return "Make this text more concise. Cut word count by ~30% while preserving meaning. Remove redundant words and tighten the prose.";
    case "longer":
      return "Expand this text with more detail and depth. Add context, examples, or sensory details. Make it richer without being verbose.";
    case "more_formal":
      return "Rewrite in a more formal, professional tone. Use precise vocabulary. Avoid contractions and colloquialisms. Elevate the register.";
    case "more_casual":
      return "Rewrite in a more casual, conversational tone. Use everyday language and contractions. Make it feel relaxed and approachable.";
    case "translate_en":
      return "Translate the selected text to English. Preserve tone and nuance. If already in English, improve clarity and naturalness.";
    case "custom":
      return "The user has provided a custom instruction. Follow it precisely while working with the selected text. Match the surrounding style and tone.";
    default:
      return "Rewrite the selected text.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedText, intent, customText } = body;

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
${intent === "custom" && customText ? `\nCustom instruction from user: "${customText}"\nFollow this instruction precisely.` : ""}

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
