import { NextRequest } from "next/server";
import { parseUrl } from "@/lib/parser";
import { analyze, critique, refine } from "@/lib/deepseek";
import type { AgentTrace, AnalyzeRequest } from "@/types/analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Defensive JSON body parsing
    let body: AnalyzeRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { url, text } = body || {};

    // ── Step 1: PERCEIVE — extract article text ──────────────────────

    let articleText: string;

    if (url) {
      articleText = await parseUrl(url);
    } else if (text) {
      articleText = text;
    } else {
      return Response.json(
        { error: "Either 'url' or 'text' is required" },
        { status: 400 },
      );
    }

    if (!articleText || articleText.trim().length < 50) {
      return Response.json(
        { error: "Could not extract enough content for analysis (minimum 50 characters)" },
        { status: 422 },
      );
    }

    // ── Check mock mode ──────────────────────────────────────────────

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
    if (isMock) {
      const trace: AgentTrace = {
        initial: {
          core_claim: "The article argues that remote work increases productivity.",
          arguments: [
            "Studies show 13% higher output among remote workers",
            "Reduced commute time translates to more focused work hours",
            "Flexible schedules allow workers to align tasks with peak energy periods",
          ],
          assumptions: [
            "All jobs can be performed remotely",
            "Workers have adequate home office setups",
            "Management can effectively track remote output",
          ],
        },
        critique: {
          logical_issues: [
            "Correlation vs causation: are productive people self-selecting into remote work?",
            "Study samples may not represent all industries",
          ],
          missing_evidence: [
            "Long-term productivity data beyond 2-year windows",
            "Impact on collaborative and creative tasks",
          ],
          confidence: 65,
        },
        final: {
          core_claim: "Remote work can increase individual productivity but effects vary significantly by role and context.",
          bull_case: [
            "13% higher output documented in controlled studies",
            "Employees report higher job satisfaction and retention",
            "Reduced real estate costs for companies",
          ],
          bear_case: [
            "Collaboration and innovation may suffer without in-person interaction",
            "Junior employees miss mentorship and learning opportunities",
            "Work-life boundaries blur, leading to burnout risk",
          ],
          hidden_assumptions: [
            "Productivity metrics accurately capture knowledge work output",
            "All employees have equal home working conditions",
          ],
          decision_risks: [
            "Cultural erosion over time without intentional connection rituals",
            "Two-tier workforce emerging between remote and in-office staff",
          ],
          verdict: { score: 68, label: "Medium" },
        },
      };

      return Response.json(trace);
    }

    // ── Steps 2-4: ANALYZE → CRITIQUE → REFINE ──────────────────────

    const initial = await analyze(articleText);
    const crit = await critique(articleText, initial);
    const final = await refine(articleText, initial, crit);

    // ── Step 5: OUTPUT — validate and return full trace ─────────────

    // Defensive: ensure all required fields exist
    const trace: AgentTrace = {
      initial: {
        core_claim: initial?.core_claim ?? "",
        arguments: Array.isArray(initial?.arguments) ? initial.arguments : [],
        assumptions: Array.isArray(initial?.assumptions) ? initial.assumptions : [],
      },
      critique: {
        logical_issues: Array.isArray(crit?.logical_issues) ? crit.logical_issues : [],
        missing_evidence: Array.isArray(crit?.missing_evidence) ? crit.missing_evidence : [],
        confidence: typeof crit?.confidence === "number"
          ? Math.max(0, Math.min(100, crit.confidence))
          : 50,
      },
      final: {
        core_claim: final?.core_claim ?? "",
        bull_case: Array.isArray(final?.bull_case) ? final.bull_case : [],
        bear_case: Array.isArray(final?.bear_case) ? final.bear_case : [],
        hidden_assumptions: Array.isArray(final?.hidden_assumptions) ? final.hidden_assumptions : [],
        decision_risks: Array.isArray(final?.decision_risks) ? final.decision_risks : [],
        verdict: {
          score: typeof final?.verdict?.score === "number"
            ? Math.max(0, Math.min(100, final.verdict.score))
            : 50,
          label: ["Strong", "Medium", "Weak"].includes(final?.verdict?.label as string)
            ? (final.verdict.label as "Strong" | "Medium" | "Weak")
            : "Medium",
        },
      },
    };

    return Response.json(trace);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analyze error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
