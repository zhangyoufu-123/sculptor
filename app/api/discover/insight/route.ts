import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── POST /api/discover/insight ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, thinking, ideas } = body as {
      anchor: string;
      thinking: string[];
      ideas: string[];
    };

    const topic = anchor?.trim() || "这个话题";

    if (isMockMode()) {
      return Response.json({
        insights: generateMockInsights(topic, thinking, ideas),
      });
    }

    const client = createClient();

    const systemPrompt = `你是思维的发现者，不是观点的生成者。你的任务是发现用户思考中已经存在的核心观点，而不是创造新的。把用户的思考提炼成清晰的论述句。每个观点都要标注它是从哪些思考记录中提炼出来的。只输出JSON。`;

    const thinkingText = thinking?.length
      ? "\n用户的思考记录：\n" + thinking.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "";

    const ideasText = ideas?.length
      ? "\n用户收集的素材：\n" + ideas.map((i) => `- ${i}`).join("\n")
      : "";

    const userContent = `用户正在探索的话题："${topic}"${thinkingText}${ideasText}

请从以上思考记录中发现3-5个核心观点。返回JSON格式：
{
  "insights": [
    { "text": "核心论述句", "source": "来自思考记录1、3" }
  ]
}

要求：
- 每个观点都是用户思考中已有的，不要创造新观点
- 论述句要清晰有力，像用户自己会说的话
- source字段说明该观点来自哪些思考记录（用序号指代）
- 用中文输出`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(raw);

    return Response.json({
      insights: data.insights || generateMockInsights(topic, thinking, ideas),
    });
  } catch (error) {
    console.error("[discover/insight]", error);
    return Response.json({
      insights: generateMockInsights("这个话题", [], []),
    });
  }
}

// ── Mock insight generator ───────────────────────────────────

/**
 * Extract meaningful Chinese character bigrams from text.
 * Strips stop characters, then returns all consecutive 2-char pairs.
 * This captures shared topic signals even across different domains.
 */
function extractThinkingKeywords(text: string): string[] {
  const cleaned = text.replace(/[的了吗呢吧在把被让对从到但然而却也就只还更很非常因为所以如果和与或\s\d.,;:!?，。；：！？、""''「」『』【】（）《》—\-/\\]+/g, "");
  const words: string[] = [];

  // Character bigrams capture topic signals
  for (let i = 0; i < cleaned.length - 1; i++) {
    words.push(cleaned.slice(i, i + 2));
  }
  // Also include individual characters for broader matching
  for (let i = 0; i < cleaned.length; i++) {
    words.push(cleaned[i]);
  }

  return [...new Set(words)];
}

/**
 * Calculate topic overlap between two thinking items.
 * Uses shared character bigrams as a proxy for shared topic.
 */
function keywordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let overlap = 0;
  for (const kw of b) {
    if (setA.has(kw)) overlap++;
  }
  return overlap / Math.min(a.length, b.length);
}

/**
 * Check if two thinking items have contradictory signals.
 */
function detectContradiction(a: string, b: string): boolean {
  const opposites = [
    ["支持", "反对"], ["正面", "反面"], ["积极", "消极"],
    ["有利", "不利"], ["优势", "劣势"], ["好", "坏"],
    ["是", "不是"], ["能", "不能"], ["可以", "不可以"],
    ["增加", "减少"], ["上升", "下降"], ["进步", "退步"],
    ["应该", "不应该"], ["需要", "不需要"],
    ["但是", ""], ["然而", ""], ["却", ""],
  ];

  // Check if one item uses contrasting words relative to the other
  for (const [pos, neg] of opposites) {
    if (pos && neg) {
      if (a.includes(pos) && b.includes(neg)) return true;
      if (a.includes(neg) && b.includes(pos)) return true;
    } else if (neg === "" && pos) {
      // Single contrastive word ("但是", "然而", "却")
      if (b.includes(pos) && !a.includes(pos)) return true;
    }
  }
  return false;
}

/**
 * Generate insights by actually analyzing the thinking items:
 * - Cluster by shared keywords → synthesize theme insights
 * - Detect contradictions → surface tension
 * - Find progressive chains → trace evolution
 */
function generateMockInsights(
  anchor: string,
  thinking: string[],
  ideas: string[]
): { text: string; source: string }[] {
  const insights: { text: string; source: string }[] = [];

  if (thinking.length === 0) {
    // No thinking items: generate insights from anchor alone
    const shortAnchor = anchor.length > 20 ? anchor.slice(0, 20) + "…" : anchor;
    return [
      {
        text: `关于「${shortAnchor}」，试着把你的第一个直觉写下来——哪怕只是一个碎片，它也会成为思考的起点。`,
        source: "锚点话题",
      },
      {
        text: `在深入「${shortAnchor}」之前，有没有一个你默认接受但想质疑的前提？`,
        source: "锚点话题",
      },
      {
        text: `换个角度看待「${shortAnchor}」：如果完全相反的观点才是对的，会发生什么？`,
        source: "锚点话题",
      },
    ];
  }

  // Step 1: Extract keywords from each thinking item
  const itemKeywords = thinking.map((t, i) => ({
    index: i,
    text: t,
    keywords: extractThinkingKeywords(t),
  }));

  // Step 2: Cluster items by shared keywords (greedy clustering)
  const clustered = new Set<number>();
  const clusters: { items: typeof itemKeywords; sharedKeywords: string[] }[] = [];

  for (const item of itemKeywords) {
    if (clustered.has(item.index)) continue;

    const clusterItems = [item];
    const clusterKeywords = new Set(item.keywords);
    clustered.add(item.index);

    // Find other items that share keywords
    for (const other of itemKeywords) {
      if (clustered.has(other.index)) continue;
      if (keywordOverlap(item.keywords, other.keywords) > 0.15) {
        clusterItems.push(other);
        for (const kw of other.keywords) clusterKeywords.add(kw);
        clustered.add(other.index);
      }
    }

    if (clusterItems.length >= 2) {
      // Only form clusters with 2+ items
      clusters.push({
        items: clusterItems,
        sharedKeywords: [...clusterKeywords].slice(0, 5),
      });
    }
  }

  // Step 3: Generate insights from clusters
  for (const cluster of clusters) {
    const indices = cluster.items.map((it) => it.index);
    const sourceLabel = indices.map((i) => `思考记录${i + 1}`).join("、");
    // Use a content snippet from the first item as attribution
    const snippet0 = cluster.items[0].text.length > 10
      ? cluster.items[0].text.slice(0, 10) + "…"
      : cluster.items[0].text;

    if (cluster.items.length >= 3) {
      // Three or more items sharing a theme — synthesize a direction
      const kwStr = cluster.sharedKeywords.slice(0, 3).join("、");
      insights.push({
        text: `你在${kwStr}上的思考反复出现——从「${snippet0}」开始，到多个角度都在追问同一个方向。这些思考共同指向：${kwStr}不是孤立的点，而是一个系统性问题的不同侧面。`,
        source: `${sourceLabel}（主题聚类）`,
      });
    } else {
      // Two items — connect them
      const kw2 = cluster.sharedKeywords.slice(0, 2).join("和");
      insights.push({
        text: `你把${kw2}放在一起思考——「${snippet0}」这个视角暗示了一个关键洞察：${kw2}之间可能存在比表面更深的关联。`,
        source: `${sourceLabel}（主题聚类）`,
      });
    }
  }

  // Step 4: Detect contradictions between items
  const foundContradictions = new Set<number>();
  for (let i = 0; i < thinking.length; i++) {
    if (foundContradictions.has(i)) continue;
    for (let j = i + 1; j < thinking.length; j++) {
      if (foundContradictions.has(j)) continue;
      if (detectContradiction(thinking[i], thinking[j])) {
        const snippetA = thinking[i].length > 12 ? thinking[i].slice(0, 12) + "…" : thinking[i];
        const snippetB = thinking[j].length > 12 ? thinking[j].slice(0, 12) + "…" : thinking[j];
        insights.push({
          text: `你一方面认为「${snippetA}」，另一方面又觉得「${snippetB}」。这个矛盾本身可能就是你真正的论点——真理往往在两个对立面的张力中浮现。`,
          source: `思考记录${i + 1}、${j + 1}（观点对立）`,
        });
        foundContradictions.add(i);
        foundContradictions.add(j);
        break; // One contradiction per item is enough
      }
    }
  }

  // Step 5: Detect progressive chains (each item builds on previous)
  // A simple heuristic: if item i+1 contains keywords from item i, it's building
  let chainStart = -1;
  let chainLength = 0;
  for (let i = 0; i < thinking.length - 1; i++) {
    if (keywordOverlap(itemKeywords[i].keywords, itemKeywords[i + 1].keywords) > 0.3) {
      if (chainStart === -1) {
        chainStart = i;
        chainLength = 2;
      } else if (i === chainStart + chainLength - 1) {
        chainLength++;
      }
    } else {
      if (chainLength >= 3) break; // Found a chain
      chainStart = -1;
      chainLength = 0;
    }
  }

  if (chainLength >= 3) {
    const chainIndices = Array.from({ length: chainLength }, (_, k) => chainStart + k);
    const firstSnippet = thinking[chainStart].length > 10
      ? thinking[chainStart].slice(0, 10) + "…"
      : thinking[chainStart];
    const lastSnippet = thinking[chainStart + chainLength - 1].length > 10
      ? thinking[chainStart + chainLength - 1].slice(0, 10) + "…"
      : thinking[chainStart + chainLength - 1];
    insights.push({
      text: `你的思考有一个清晰的递进：从「${firstSnippet}」开始，一步步深入到「${lastSnippet}」——这不是跳跃，而是在自己的思考中挖掘出了更深的层次。`,
      source: chainIndices.map((i) => `思考记录${i + 1}`).join("→") + "（递进链）",
    });
  }

  // Step 6: Fill remaining slots with diverse perspectives
  // Track which indices were used WITHOUT depending on regex parsing
  const usedSet = new Set<number>();

  // Collect all indices used by cluster insights
  for (const cluster of clusters) {
    for (const it of cluster.items) usedSet.add(it.index);
  }
  // Collect contradiction indices
  for (const fc of foundContradictions) usedSet.add(fc);
  // Collect chain indices
  if (chainLength >= 3) {
    for (let k = 0; k < chainLength; k++) usedSet.add(chainStart + k);
  }

  const unusedItems = thinking
    .map((t, i) => ({ text: t, index: i }))
    .filter((item) => !usedSet.has(item.index));

  // Generate meta-insights from unused items
  for (let i = 0; i < unusedItems.length && insights.length < 4; i += 2) {
    if (i + 1 < unusedItems.length) {
      const a = unusedItems[i], b = unusedItems[i + 1];
      const s1 = a.text.length > 10 ? a.text.slice(0, 10) + "…" : a.text;
      const s2 = b.text.length > 10 ? b.text.slice(0, 10) + "…" : b.text;
      insights.push({
        text: `「${s1}」和「${s2}」看似是独立的思考碎片，但把它们放在一起读，也许会发现一个你还没有明确说出来的观点。`,
        source: `思考记录${a.index + 1}、${b.index + 1}`,
      });
    } else if (i < unusedItems.length && insights.length < 3) {
      const item = unusedItems[i];
      const s = item.text.length > 12 ? item.text.slice(0, 12) + "…" : item.text;
      insights.push({
        text: `「${s}」——这条思考值得深挖。如果不急着下结论，顺着这个方向再问自己一个问题，可能会打开新的空间。`,
        source: `思考记录${item.index + 1}`,
      });
    }
  }

  // If still empty (shouldn't happen with 4+ items), add anchor-based insight
  if (insights.length === 0) {
    const shortAnchor = anchor.length > 20 ? anchor.slice(0, 20) + "…" : anchor;
    insights.push({
      text: `关于「${shortAnchor}」，你的思考触及了多个角度。试着把其中最让你兴奋的那个点单独拎出来，先不急着覆盖全部。`,
      source: "你的思考记录",
    });
  }

  // Limit to 3-5 insights
  return insights.slice(0, 5);
}
