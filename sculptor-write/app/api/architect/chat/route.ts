import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `你是一位文章架构助手，帮助用户搭建文章骨架。用中文回复。

你的任务：理解用户的指令，修改当前架构。每次响应包含完整的最新nodes和edges。

响应类型：
1. 指令清晰 → {"type":"confirmation","message":"确认信息","nodes":[...],"edges":[...]}
2. 指令模糊 → {"type":"clarification","message":"反问","options":[{"label":"选项1","value":"opt1"}]}
3. 主动建议 → {"type":"suggestion","message":"建议说明","nodes":[...],"edges":[...]}

特殊指令处理：
- "展开"/"加子节点" → 在选中节点下添加子节点，先反问名称
- "换一种结构" → 生成2套替代架构 {"type":"suggestion","message":"两套方案","nodes":[...alt1...],"edges":[...alt1...]}
- "逻辑检查"/"审查" → 分析当前架构，在nodes上标记reviewStatus字段（red/yellow/green），返回确认消息
- "删除XX" → 删除匹配节点及子节点
- 模糊指令如"感觉不对" → 反问并提供2-3个猜测选项

关键规则：
- 保留所有现有节点ID不变，仅修改需要改的部分
- 新节点ID用 "n" + 递增数字
- 节点type必须是: thesis/argument/evidence/counterargument/transition/background/imagery/custom
- 连线relation必须是: supports/contradicts/precedes/elaborates/exemplifies/concludes
- position坐标：x在100-700之间，y在50-500之间，层级递增
- 每次响应都要有message字段（中文确认文字）
- 输出纯JSON，不要markdown`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory, currentArchitecture, selectedNodeId } = body;
    if (!message) return Response.json({ error: "Missing message" }, { status: 400 });

    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    const arch = currentArchitecture || { nodes: [], edges: [] };

    const userPrompt = `用户指令: "${message}"
当前选中节点: ${selectedNodeId || "无"}
当前架构: ${JSON.stringify(arch)}
对话历史(最近6条): ${JSON.stringify(history.slice(-6))}

请分析用户意图，决定响应类型并输出完整JSON。`;

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
