import OpenAI from "openai";
import type { InitialAnalysis, Critique, FinalAnalysis } from "@/types/analysis";

// ---------------------------------------------------------------------------
// DeepSeek client factory
// ---------------------------------------------------------------------------

function createClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    timeout: 30_000, // 30s timeout per API call
  });
}

// ---------------------------------------------------------------------------
// Shared helper: call DeepSeek with JSON response_format
// ---------------------------------------------------------------------------

async function deepseekCall(
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

function safeParse(raw: string, label: string): Record<string, unknown> {
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

// ---------------------------------------------------------------------------
// Step 2: ANALYZE — extract core claim, arguments, assumptions
// ---------------------------------------------------------------------------

const ANALYZE_SYSTEM_PROMPT = `You are an expert analyst performing adversarial reading. Your task is to extract the core argumentative structure from an article.

Output a valid JSON object with exactly these keys:
- "core_claim": string — the single central thesis or claim the article makes. One sentence.
- "arguments": string[] — 3-5 key supporting points or arguments presented for the claim.
- "assumptions": string[] — 3-5 unstated premises or assumptions the argument relies on.

Be precise and analytical. Focus on the logical structure, not summary.`;

export async function analyze(text: string): Promise<InitialAnalysis> {
  const raw = await deepseekCall(
    ANALYZE_SYSTEM_PROMPT,
    `Analyze the following article text. Extract the core claim, supporting arguments, and underlying assumptions:\n\n"""${text}"""`,
    0.3,
  );

  const parsed = safeParse(raw, "analyze");

  return {
    core_claim: typeof parsed.core_claim === "string" ? parsed.core_claim : "",
    arguments: Array.isArray(parsed.arguments) ? parsed.arguments.filter((a): a is string => typeof a === "string") : [],
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a): a is string => typeof a === "string") : [],
  };
}

// ---------------------------------------------------------------------------
// Step 3: CRITIQUE — AI reviews its own output for logical gaps & missing evidence
// ---------------------------------------------------------------------------

const CRITIQUE_SYSTEM_PROMPT = `You are an adversarial reviewer. Your task is to critically evaluate an AI-generated analysis of an article and identify flaws, gaps, and weaknesses.

Output a valid JSON object with exactly these keys:
- "logical_issues": string[] — 3-5 specific logical flaws, fallacies, or weak reasoning in the analysis.
- "missing_evidence": string[] — 3-5 pieces of evidence, data, or counterpoints the analysis overlooked.
- "confidence": number — 0-100, your confidence that the analysis is accurate and complete.

Be ruthless but fair. The goal is to strengthen the final output by catching blind spots.`;

export async function critique(
  articleText: string,
  initial: InitialAnalysis,
): Promise<Critique> {
  const userContent = `Original article:
"""${articleText.slice(0, 8000)}"""

AI analysis to critique:
- Core claim: ${initial.core_claim}
- Arguments: ${initial.arguments.join(" | ")}
- Assumptions: ${initial.assumptions.join(" | ")}

Review this analysis critically. Identify logical gaps, missing evidence, and rate your confidence.`;

  const raw = await deepseekCall(CRITIQUE_SYSTEM_PROMPT, userContent, 0.5);

  const parsed = safeParse(raw, "critique");

  return {
    logical_issues: Array.isArray(parsed.logical_issues)
      ? parsed.logical_issues.filter((a): a is string => typeof a === "string")
      : [],
    missing_evidence: Array.isArray(parsed.missing_evidence)
      ? parsed.missing_evidence.filter((a): a is string => typeof a === "string")
      : [],
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(100, parsed.confidence))
        : 50,
  };
}

// ---------------------------------------------------------------------------
// Step 4: REFINE — fix the output based on critique
// ---------------------------------------------------------------------------

const REFINE_SYSTEM_PROMPT = `You are an expert analyst revising your own work after receiving a peer critique. Your task is to produce a comprehensive, balanced final analysis that incorporates the critique's feedback.

Output a valid JSON object with exactly these keys:
- "core_claim": string — the central thesis, refined for accuracy.
- "bull_case": string[] — 3-5 strongest arguments IN FAVOR of the claim.
- "bear_case": string[] — 3-5 strongest arguments AGAINST the claim (counterarguments).
- "hidden_assumptions": string[] — 3-5 unstated premises the argument depends on.
- "decision_risks": string[] — 3-5 risks or consequences if someone acts on this claim.
- "verdict": object with:
  - "score": number 0-100 — overall strength of the argument.
  - "label": "Strong" | "Medium" | "Weak" — qualitative assessment.

Make the final output balanced, well-reasoned, and actionable.`;

export async function refine(
  articleText: string,
  initial: InitialAnalysis,
  crit: Critique,
): Promise<FinalAnalysis> {
  const userContent = `Original article:
"""${articleText.slice(0, 8000)}"""

Initial analysis:
- Core claim: ${initial.core_claim}
- Arguments: ${initial.arguments.join(" | ")}
- Assumptions: ${initial.assumptions.join(" | ")}

Critique received:
- Logical issues: ${crit.logical_issues.join(" | ")}
- Missing evidence: ${crit.missing_evidence.join(" | ")}
- Confidence score: ${crit.confidence}/100

Produce a refined, balanced final analysis that addresses the critique. Include bull case, bear case, hidden assumptions, decision risks, and a verdict.`;

  const raw = await deepseekCall(REFINE_SYSTEM_PROMPT, userContent, 0.3);

  const parsed = safeParse(raw, "refine");

  const verdict = parsed.verdict && typeof parsed.verdict === "object" && !Array.isArray(parsed.verdict)
    ? (parsed.verdict as Record<string, unknown>)
    : {};

  return {
    core_claim: typeof parsed.core_claim === "string" ? parsed.core_claim : initial.core_claim,
    bull_case: Array.isArray(parsed.bull_case)
      ? parsed.bull_case.filter((a): a is string => typeof a === "string")
      : [],
    bear_case: Array.isArray(parsed.bear_case)
      ? parsed.bear_case.filter((a): a is string => typeof a === "string")
      : [],
    hidden_assumptions: Array.isArray(parsed.hidden_assumptions)
      ? parsed.hidden_assumptions.filter((a): a is string => typeof a === "string")
      : [],
    decision_risks: Array.isArray(parsed.decision_risks)
      ? parsed.decision_risks.filter((a): a is string => typeof a === "string")
      : [],
    verdict: {
      score:
        typeof verdict.score === "number"
          ? Math.max(0, Math.min(100, verdict.score))
          : 50,
      label: ["Strong", "Medium", "Weak"].includes(verdict.label as string)
        ? (verdict.label as "Strong" | "Medium" | "Weak")
        : "Medium",
    },
  };
}
