import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MOCK_RESULTS = [
  {
    title: "中国古典文学中的意象运用",
    snippet:
      "意象是古典诗歌的灵魂。从《诗经》的'关关雎鸠'到唐诗的'床前明月光'，意象承载着诗人的情感与哲思，形成了中国文学独特的审美传统。",
    source: "文学评论",
    url: "https://example.com/literary-imagery",
  },
  {
    title: "写作技巧：如何营造氛围感",
    snippet:
      "好的氛围描写能让读者身临其境。关键在于调动多种感官——视觉、听觉、嗅觉、触觉——并将它们与人物情绪巧妙地融合在一起。",
    source: "创作指南",
    url: "https://example.com/writing-atmosphere",
  },
  {
    title: "现代散文的叙事节奏研究",
    snippet:
      "现代散文打破了传统'起承转合'的束缚，更注重内在情绪的流动。张爱玲的'参差对照'、沈从文的'温润平和'都展现了独特的节奏美学。",
    source: "文学研究",
    url: "https://example.com/prose-rhythm",
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return Response.json(
        { error: "Missing query" },
        { status: 400 }
      );
    }

    const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

    // Always return mock results for now — search API not configured
    // When ready, integrate Brave Search or SerpAPI:
    //   BRAVE_API_KEY or SERPAPI_KEY env var
    if (isMock) {
      // Shuffle and return 2-3 results
      const shuffled = [...MOCK_RESULTS].sort(() => Math.random() - 0.5);
      const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
      return Response.json({ results: shuffled.slice(0, count) });
    }

    // Placeholder for real search
    const braveKey = process.env.BRAVE_API_KEY;
    const serpKey = process.env.SERPAPI_KEY;

    if (!braveKey && !serpKey) {
      return Response.json({
        message:
          "Search API not configured. Set BRAVE_API_KEY or SERPAPI_KEY.",
        results: [],
      });
    }

    // TODO: Implement real search when API keys are available
    // if (braveKey) {
    //   const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
    //     headers: {
    //       'Accept': 'application/json',
    //       'Accept-Encoding': 'gzip',
    //       'X-Subscription-Token': braveKey,
    //     },
    //   });
    //   ...
    // }

    return Response.json({ results: [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
