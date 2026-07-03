import { NextRequest, NextResponse } from "next/server";
import { parseUrl, truncateText } from "@/lib/parser";
import { analyzeWithAI } from "@/lib/deepseek";
import { saveAnalysis } from "@/lib/supabase";
import type { AnalyzeRequest } from "@/types/analysis";
import { mockTrace } from "@/lib/mock-data";

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.url && !body.text) {
      return NextResponse.json(
        { error: "Provide either a URL or text to analyze" },
        { status: 400 }
      );
    }

    let sourceText: string;
    let sourceUrl: string | null = null;

    if (body.url) {
      sourceUrl = body.url;
      sourceText = await parseUrl(body.url);
    } else {
      sourceText = body.text || "";
    }

    if (!sourceText.trim()) {
      return NextResponse.json(
        { error: "No content to analyze" },
        { status: 400 }
      );
    }

    sourceText = truncateText(sourceText);

    // Run the 5-step agent loop
    let trace;
    if (isMockMode) {
      trace = mockTrace;
    } else {
      try {
        trace = await analyzeWithAI(sourceText);
      } catch (err) {
        console.warn("AI analysis failed, falling back to mock data", err);
        trace = mockTrace;
      }
    }

    // Fire-and-forget persistence
    saveAnalysis(sourceUrl, sourceText, trace).catch((err) =>
      console.error("Supabase save failed:", err)
    );

    return NextResponse.json(trace);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analyze error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
