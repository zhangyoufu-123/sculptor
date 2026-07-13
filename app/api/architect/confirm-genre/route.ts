import { NextRequest } from "next/server";
import { isMockMode } from "@/lib/ai/mock-responses";
import { suggestGenres } from "@/lib/ai/genre-detector";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput } = body;

    if (!userInput || userInput.length < 2) {
      return Response.json({ genres: suggestGenres("").map(g => ({ name: g.label, description: g.description, icon: "📝" })) });
    }

    // v8.0: Use keyword-based detection (fast, no API call)
    const genres = suggestGenres(userInput, 4);
    return Response.json({
      genres: genres.map(g => ({ name: g.label, description: g.description, icon: "📝" })),
    });
  } catch {
    return Response.json({ genres: [] });
  }
}
