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

  // v8.0: 任务类型感知的结构提取，替换泛型"论点一/论点二"
  const genreLabel = getGenreLabel(genre);
  
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
      label: `${genreLabel}：第一个核心段落`,
      notes: `基于 ${charCount} 字内容的主体结构`,
      children: [],
    },
    {
      id: "n3",
      type: "custom",
      label: `扩展：支撑材料与补充`,
      notes: "需要补充数据或案例的段落",
      children: ["n4"],
    },
    {
      id: "n4",
      type: "custom",
      label: "收尾与总结",
      notes: "回扣开篇，归纳核心观点",
      children: [],
    },
  ];

  return nodes;
}

/** 根据任务类型返回中文标签 */
function getGenreLabel(genre: string): string {
  switch (genre) {
    case "论文": return "论述";
    case "博客": return "要点";
    case "公众号": return "章节";
    case "报告": return "发现";
    case "邮件": return "要点";
    case "演讲": return "要点";
    case "日记": return "记录";
    default: return "段落";
  }
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
