import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `你是一位资深写作编辑，正在阅读用户刚刚写完的段落。请用中文输出 JSON 格式的诊断：

{
  "mirrorPlayback": "用一句话回放这段的核心内容（≤30字）",
  "readerQuestion": "站在读者的角度，提出一个最想知道但文中可能未充分回答的问题（≤40字）",
  "microAlerts": ["3条以内的微提醒，每条≤20字，关注：逻辑漏洞、表达重复、缺少过渡、论证力度不足"]
}

要求：
- mirrorPlayback 要准确概括，不要评价
- readerQuestion 要尖锐但有建设性，帮助作者改进
- microAlerts 要具体，指出具体问题，不要泛泛而谈
- 如果段落质量很好，microAlerts 可以为空数组`;

function mockAnalyze(text: string) {
  const len = text.replace(/\s/g, "").length;
  const alerts: string[] = [];
  if (len > 500) alerts.push("这段偏长，建议拆分");
  if (len < 80) alerts.push("这段较短，可考虑展开");
  
  const hasContrast = /但是|然而|不过|却/.test(text);
  if (len > 150 && !hasContrast) alerts.push("缺少转折或对比，论证可能单薄");
  
  const hasEvidence = /例如|比如|数据|研究|表明|显示/.test(text);
  if (len > 200 && !hasEvidence) alerts.push("缺少具体例证或数据支撑");

  return {
    mirrorPlayback: `这段在论述${text.slice(0, 15).replace(/[，。！？、]/g, "")}相关话题，共 ${len} 字`,
    readerQuestion: hasEvidence
      ? "论据充分，但结论是否可以更明确？"
      : "作为读者，我想看到一个具体的例子来理解你的观点",
    microAlerts: alerts.slice(0, 3),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    if (!text || text.length < 20) {
      return Response.json({
        mirrorPlayback: "文本太短，无法分析。请写完一个完整段落后再试。",
        readerQuestion: "",
        microAlerts: [],
      });
    }

    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 400));
      return Response.json(mockAnalyze(text));
    }

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `请分析以下段落：\n\n${text.slice(0, 2000)}` },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    return Response.json(JSON.parse(content));
  } catch (err) {
    return Response.json({
      mirrorPlayback: "分析暂时不可用",
      readerQuestion: "",
      microAlerts: [],
      error: (err as Error).message,
    }, { status: 200 }); // Return 200 so frontend doesn't break
  }
}
