import OpenAI from "openai";

// ---------------------------------------------------------------------------
// DeepSeek client factory
// ---------------------------------------------------------------------------

export function createClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: 30_000, // 30s timeout per API call
  });
}

// ---------------------------------------------------------------------------
// Shared helper: call DeepSeek with JSON response_format
// ---------------------------------------------------------------------------

export async function deepseekCall(
  systemPrompt: string,
  userContent: string,
  temperature: number,
): Promise<string> {
  const client = createClient();

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty DeepSeek response");
  return content;
}

// ---------------------------------------------------------------------------
// Defensive JSON parse helper
// ---------------------------------------------------------------------------

export function safeParse(raw: string, label: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Expected JSON object but got ${typeof parsed}`);
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    console.error(`Failed to parse ${label} response:`, (err as Error).message);
    console.error("Raw response (first 500 chars):", raw.slice(0, 500));
    return {};
  }
}
