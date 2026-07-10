import * as cheerio from "cheerio";

const JINA_TIMEOUT_MS = 3000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_CHARS = 12000;

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function parseUrl(url: string): Promise<string> {
  // Primary: Jina Reader with 3s timeout
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const response = await fetchWithTimeout(jinaUrl, JINA_TIMEOUT_MS, {
      headers: { Accept: "text/plain" },
    });

    if (response.ok) {
      const text = await response.text();
      if (text.trim().length > 50) return truncateText(text);
    }
  } catch {
    console.warn("Jina Reader failed, falling back to cheerio");
  }

  // Fallback: fetch HTML and parse with cheerio
  try {
    const htmlResponse = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SculptorBot/1.0; +https://sculptor.app)",
      },
    });

    if (!htmlResponse.ok) {
      throw new Error(`Failed to fetch URL: ${htmlResponse.status}`);
    }

    const html = await htmlResponse.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, iframe, svg, img").remove();

    let extracted =
      $("article").text() ||
      $("main").text() ||
      $('[role="main"]').text() ||
      $("body").text();

    extracted = extracted.replace(/\s+/g, " ").trim();

    if (extracted.length < 50) {
      throw new Error("Could not extract meaningful content");
    }

    return truncateText(extracted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Failed to parse URL: ${message}`);
  }
}

export function truncateText(text: string, max = MAX_CHARS): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}
