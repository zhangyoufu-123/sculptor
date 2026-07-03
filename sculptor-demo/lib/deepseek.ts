import OpenAI from "openai";
import { ANALYZE_PROMPT, CRITIQUE_PROMPT, REFINE_PROMPT } from "./prompts";
import type { AgentTrace, InitialAnalysis, Critique, AnalysisResult } from "@/types/analysis";

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  });
}

async function callAI(
  systemPrompt: string,
  userContent: string,
  label: string
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Empty response from AI at stage: ${label}`);
  }
  return content;
}

/**
 * Runs the full agent loop:
 *   Step 1 — PERCEIVE: input text (handled by caller)
 *   Step 2 — ANALYZE:  extract core claim + arguments + assumptions
 *   Step 3 — CRITIQUE: find logical gaps and missing evidence
 *   Step 4 — REFINE:   fix output based on critique
 *   Step 5 — OUTPUT:   return combined trace
 */
export async function analyzeWithAI(text: string): Promise<AgentTrace> {
  // Step 2: Initial analysis
  const initialRaw = await callAI(
    ANALYZE_PROMPT,
    `Article:\n${text}`,
    "analyze"
  );
  const initial: InitialAnalysis = JSON.parse(initialRaw);

  // Step 3: Adversarial critique
  const critiqueRaw = await callAI(
    CRITIQUE_PROMPT,
    `Article:\n${text}\n\nInitial Analysis:\n${JSON.stringify(initial, null, 2)}`,
    "critique"
  );
  const critique: Critique = JSON.parse(critiqueRaw);

  // Step 4: Refinement
  const refineRaw = await callAI(
    REFINE_PROMPT,
    `Article:\n${text}\n\nInitial Analysis:\n${JSON.stringify(initial, null, 2)}\n\nCritique:\n${JSON.stringify(critique, null, 2)}`,
    "refine"
  );
  const final: AnalysisResult = JSON.parse(refineRaw);

  return { initial, critique, final };
}
