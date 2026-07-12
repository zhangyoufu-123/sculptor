import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "@/lib/ai/mock-responses";
import { detectGenre } from "@/lib/ai/genre-detector";

export const runtime = "nodejs";
export const maxDuration = 30;

// v8.0: Generate outline FROM existing content (not from scratch)
// Called when user writes 300+ chars and clicks "整理为结构"

function mockGenerateNodes(content: string): Array<{
  id: string;
  type: string;
  label: string;
  notes: string;
  children: string[];
}> {
  const genre = detectGenre(content);
  const charCount = content.length;

  // Extract potential section from content
  const lines = content.split("\n").filter((l) => l.trim().length > 10);
  const firstSentence = lines[0]?.slice(0, 30) || "正文";

  // v8.0: Generic 3-tier structure based on content length
  const nodes = [
    {
      id: "n1",
      type: "hook",
      label: `开头：${firstSentence}...`,
      notes: "从已有内容中提取的开篇",
      children: ["n2", "n3"],
    },
    {
      id: "n2",
      type: "custom",
      label: "展开：论点一",
      notes: `基于 ${charCount} 字内容的第一层展开`,
      children: [],
    },
    {
      id: "n3",
      type: "custom",
      label: "深入：论点二",
      notes: "需要补充数据或案例的第二层",
      children: ["n4"],
    },
    {
      id: "n4",
      type: "custom",
      label: "收尾与总结",
      notes: "回扣开篇，升华主题",
      children: [],
    },
  ];

  return nodes;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, title } = body as { content: string; title?: string };

    if (!content || content.trim().length < 100) {
      return NextResponse.json(
        { error: "内容太短，至少需要 100 字" },
        { status: 400 }
      );
    }

    let nodes;

    if (isMockMode()) {
      // Simulate processing delay
      await new Promise((r) => setTimeout(r, 800));
      nodes = mockGenerateNodes(content);
    } else {
      // Real mode: call DeepSeek to analyze content and generate structure
      // TODO: implement real structure generation from content
      nodes = mockGenerateNodes(content);
    }

    return NextResponse.json({
      nodes,
      title: title || "无标题",
      charCount: content.length,
    });
  } catch (error) {
    console.error("from-content error:", error);
    return NextResponse.json(
      { error: "结构生成失败" },
      { status: 500 }
    );
  }
}
