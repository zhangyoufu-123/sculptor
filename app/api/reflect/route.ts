import { NextRequest } from "next/server";

export const runtime = "nodejs";

// ── POST /api/reflect ──────────────────────────────────────
// 回望者：帮助作者看清自己的思维路径

interface ReflectRequest {
  anchor: string;
  outline: any[];
  content: string;
}

interface ReflectResponse {
  reflection: {
    questionEvolution: string;
    patterns: string[];
    stats: {
      wordCount: number;
      sectionCount: number;
    };
  };
}

function generateMockReflection(anchor: string, outline: any[], content: string): ReflectResponse {
  const wordCount = content.replace(/\s/g, "").length;
  const sectionCount = outline.length || 1;

  // 从 anchor 中提取初始问题的关键词
  const anchorWords = anchor.length > 0
    ? anchor.slice(0, 20)
    : "某个问题";

  // 基于内容长度推断演变路径
  let questionEvolution: string;
  if (wordCount < 200) {
    questionEvolution = `你最初围绕「${anchorWords}」展开思考，但篇幅较短，问题的边界尚未充分展开。`;
  } else if (wordCount < 800) {
    questionEvolution = `你最初围绕「${anchorWords}」展开思考。在写作过程中，问题从初始的提问逐步深入到更具体的层面，开始触及问题的结构性成因。`;
  } else {
    questionEvolution = `你最初围绕「${anchorWords}」展开思考。随着写作的推进，问题经历了明显的演变：从表面的现象描述，到追问背后的机制，最终触及了更底层的逻辑。你的思维路径呈现出由外而内、由表及里的特征。`;
  }

  // 生成模式观察
  const patterns: string[] = [];
  if (content.includes("例如") || content.includes("比如") || content.includes("举例")) {
    patterns.push("倾向于通过具体案例进行论证");
  }
  if (content.includes("首先") || content.includes("其次") || content.includes("最后") || content.includes("第一")) {
    patterns.push("使用递进式结构组织论证");
  }
  if (content.includes("但是") || content.includes("然而") || content.includes("不过")) {
    patterns.push("习惯于先陈述再转折的辩证思维");
  }
  if (content.includes("？") || content.includes("?") || content.includes("问题")) {
    patterns.push("以提问驱动思考，用问题引导写作方向");
  }
  if (content.includes("历史") || content.includes("过去") || content.includes("传统")) {
    patterns.push("经常引用历史视角来支撑论点");
  }
  if (content.includes("总结") || content.includes("综上") || content.includes("总之")) {
    patterns.push("在段落结尾倾向进行归纳总结");
  }

  // 至少保证有一条模式
  if (patterns.length === 0) {
    patterns.push("以平实的陈述方式展开分析");
    patterns.push("注重逻辑连贯性，段落之间衔接自然");
  }

  return {
    reflection: {
      questionEvolution,
      patterns,
      stats: { wordCount, sectionCount },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ReflectRequest = await request.json();

    const { anchor = "", outline = [], content = "" } = body;

    // Mock mode: generate plausible reflection based on input patterns
    const result = generateMockReflection(anchor, outline, content);

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("POST /api/reflect error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
