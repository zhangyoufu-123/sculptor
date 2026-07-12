import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Mock: Socratic questions based on anchor topic ──────────

/**
 * Extract meaningful keywords from Chinese anchor text.
 * Splits by common delimiters and prioritizes nouns/verbs over particles.
 */
function extractKeywords(text: string): string[] {
  // Split by common Chinese delimiters and punctuation
  const segments = text.split(/的|是|为什么|怎么|什么|？|\?|，|,|、|和|与|或|了|吗|呢|吧|在|把|被|让|对|从|到/);

  const words: string[] = [];
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    // Extract meaningful word segments (2-6 chars) — skip single chars
    if (trimmed.length >= 2 && trimmed.length <= 6) {
      words.push(trimmed);
    } else if (trimmed.length > 6) {
      // Break longer segments into 2-4 char chunks
      for (let i = 0; i < trimmed.length - 1; i += 2) {
        const chunk = trimmed.slice(i, Math.min(i + 4, trimmed.length));
        if (chunk.length >= 2 && !words.includes(chunk)) words.push(chunk);
      }
    }
  }

  // Deduplicate and limit to 2-6 key terms, preferring longer terms
  const unique = [...new Set(words)];
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, 6);
}

/**
 * Detect the domain of the anchor text to pick appropriate question templates.
 */
function detectDomain(keywords: string[]): "tech" | "society" | "general" {
  const techSignals = [
    "AI", "人工智能", "算法", "技术", "产品", "代码", "程序", "模型",
    "数据", "互联网", "软件", "硬件", "系统", "架构", "接口", "协议",
    "自动化", "智能", "机器人", "机器学习", "深度学习", "神经网络",
  ];
  const societySignals = [
    "社会", "文化", "政治", "经济", "教育", "制度", "阶级", "群体",
    "历史", "传统", "价值观", "伦理", "道德", "法律", "权力", "权利",
    "公平", "自由", "平等", "现象", "趋势", "时代", "代际",
  ];

  const allWords = keywords.join(" ");
  const techScore = techSignals.filter((s) => allWords.includes(s)).length;
  const societyScore = societySignals.filter((s) => allWords.includes(s)).length;

  if (techScore > societyScore && techScore > 0) return "tech";
  if (societyScore > techScore && societyScore > 0) return "society";
  return "general";
}

/**
 * Generate questions that specifically reference keywords from the user's anchor text.
 * Uses 5 question patterns depending on conversation round.
 */
function getMockQuestions(anchor: string, history?: { role: string; content: string }[]): string[] {
  const topic = anchor?.trim() || "这个话题";
  const keywords = extractKeywords(topic);
  const domain = detectDomain(keywords);
  const roundCount = history?.filter((m) => m.role === "user").length || 0;

  // If no keywords extracted (very short anchor), use one keyword = the anchor itself
  const kws = keywords.length > 0 ? keywords : [topic];

  const questions: string[] = [];

  // Pattern 1: Challenge assumption (always include one)
  if (domain === "tech") {
    questions.push(
      `{0}这种设计，是解决了一个真问题，还是创造了一个假需求？`.replace("{0}", kws[0])
    );
  } else if (domain === "society") {
    questions.push(
      `{0}这个现象背后，是什么样的社会结构在推动？`.replace("{0}", kws[0])
    );
  } else {
    questions.push(
      `你提到{0}——在你看来，这个问题的核心矛盾到底是什么？`.replace("{0}", kws[0])
    );
  }

  // Pattern 2: Ask for a specific example
  if (kws.length >= 2) {
    questions.push(
      `说到{0}，能举一个具体的例子吗？不是抽象描述，是一个真实场景。`.replace("{0}", kws[1])
    );
  } else {
    questions.push(
      `关于{0}，有没有一个具体的场景或案例能说明你的关切？`.replace("{0}", kws[0])
    );
  }

  // Pattern 3: Explore counter-perspective
  if (domain === "tech") {
    const kw = kws.length >= 2 ? kws[1] : kws[0];
    questions.push(
      `除了{0}，有没有完全不同的技术路径可以实现同样的目标？`.replace("{0}", kw)
    );
  } else if (domain === "society") {
    const kw = kws.length >= 2 ? kws[1] : kws[0];
    questions.push(
      `如果把{0}放在更长的历史维度中，它只是暂时的还是永久的？`.replace("{0}", kw)
    );
  } else {
    const kw = kws.length >= 3 ? kws[2] : kws[0];
    questions.push(
      `如果{0}的反面才是真相，你会怎么论证？`.replace("{0}", kw)
    );
  }

  // Pattern 4: Based on conversation round
  if (roundCount < 3) {
    // Early rounds: elevate thinking level
    if (kws.length >= 3) {
      questions.push(
        `你说到{0}和{1}，这两者之间有没有更深层的联系？`.replace("{0}", kws[0]).replace("{1}", kws[Math.min(kws.length - 1, 2)])
      );
    } else if (kws.length >= 2) {
      questions.push(
        `在{0}这个问题上，有没有一个你已经默认接受但从未审视过的前提？`.replace("{0}", kws[0])
      );
    } else {
      questions.push(
        `关于{0}，你内心里有没有一个不敢说的观点？`.replace("{0}", kws[0])
      );
    }
  } else {
    // Later rounds: closing / summarizing questions (Principle 3)
    if (kws.length >= 2) {
      questions.push(
        `回顾关于{0}和{1}的讨论，你觉得我们已经找到足够的方向了吗？`.replace("{0}", kws[0]).replace("{1}", kws[1])
      );
    } else {
      questions.push(
        `经过这些讨论，如果把关于{0}的思考浓缩成一句话，会是什么？`.replace("{0}", kws[0])
      );
    }
  }

  // Ensure exactly 3-4 questions
  return questions.slice(0, 4);
}

// ── POST /api/discover/chat ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
    };

    const topic = anchor?.trim() || "这个话题";

    // Mock mode: return keyword-aware questions
    if (isMockMode()) {
      return Response.json({ questions: getMockQuestions(topic, history) });
    }

    // Real mode: use DeepSeek
    const client = createClient();

    const systemPrompt = `你是 Mentor，不是 Assistant。你的三个原则：
1. 绝不抢答案。用户问问题，你用问题回应，引导用户自己找到答案。
2. 不断提高思考层级。从具体现象上升到抽象问题，从个人经历上升到普遍规律。
3. 知道什么时候闭嘴。对话超过3轮后，开始帮助用户总结而不是继续发散。最后一轮应该问：'你觉得我们已经找到足够的方向了吗？'

每次回复3-4个问题。问题应该让用户自己发现答案。不要打招呼，不要总结，不要给出观点。只输出问题，每行一个，不要编号。`;

    const historyText = history?.length
      ? "\n\n之前的对话：\n" + history.map((m) => `${m.role === "user" ? "用户" : "你"}: ${m.content}`).join("\n")
      : "";

    const userContent = `用户正在思考的话题是："${topic}"。${historyText}\n\n请提出3-4个苏格拉底式问题，帮助用户深入探索这个话题。每行一个问题，不要编号，不要前缀。`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.9,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const questions = raw
      .split("\n")
      .map((l) => l.replace(/^\d+[.、)\s]+/, "").trim())
      .filter((l) => l.length > 4 && (l.endsWith("？") || l.endsWith("?") || l.length > 10))
      .slice(0, 4);

    if (questions.length === 0) {
      return Response.json({ questions: getMockQuestions(topic) });
    }

    return Response.json({ questions });
  } catch (error) {
    console.error("[discover/chat]", error);
    // Fallback to mock on error
    const topic = "这个话题";
    return Response.json({ questions: getMockQuestions(topic) });
  }
}
