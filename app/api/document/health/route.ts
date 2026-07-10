import { NextRequest } from "next/server";
import { isMockMode } from "@/lib/ai/mock-responses";
import type { HealthReport } from "@/types/health";

export const runtime = "nodejs";
export const maxDuration = 30;

const MOCK_HEALTH_REPORT: HealthReport = {
  overallScore: 72,
  dimensions: {
    characterConsistency: 80,
    timeline: 65,
    logicChain: 70,
    duplicates: 85,
  },
  findings: [
    {
      type: "characterConsistency",
      severity: "warning",
      message: "角色「老陈」在第 3 段首次出现，但前文未做任何介绍，读者可能困惑其身份和与主线的关系。",
      position: 342,
      snippet: "老陈推门进来，手里拎着一袋橘子，脸上带着那种让人安心的笑。他没说话，只是把橘子放在桌上。",
    },
    {
      type: "timeline",
      severity: "error",
      message: "第 2 段描述的是「初春的清晨」，而第 4 段突然跳到「深秋的傍晚」，中间缺少时间过渡或说明。",
      position: 567,
      snippet: "深秋的傍晚，梧桐叶铺满了整条巷子，踩上去沙沙作响。她站在巷口，望着远处那扇亮着灯的窗。",
    },
    {
      type: "logicChain",
      severity: "warning",
      message: "论点「AI 会取代人类作家」缺乏论据支撑，建议补充数据、案例或引用。",
      position: 892,
      snippet: "毫无疑问，AI 最终会取代人类作家，这只是时间问题。到那时，所有的文学创作都将由算法完成。",
    },
    {
      type: "duplicates",
      severity: "info",
      message: "第 5 段与第 8 段的结尾高度相似，几乎重复了相同的意象和措辞，建议合并或差异化处理。",
      position: 1024,
      snippet: "月光洒在湖面上，像碎银子一样铺满了整个水面，微风吹过，泛起一圈圈涟漪。",
    },
    {
      type: "duplicates",
      severity: "info",
      message: "以下段落与前方段落高度相似（相似度 92%），可能为无意识重复。",
      position: 1456,
      snippet: "月光洒在湖面上，像碎银子一样铺满了整个水面，夜风轻拂，涟漪一圈圈荡开。",
    },
  ],
  generatedAt: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return Response.json(
        { error: "缺少文档文本" },
        { status: 400 }
      );
    }

    // 文档过长时截断以避免性能问题
    const truncatedText = text.length > 50000 ? text.slice(0, 50000) : text;

    if (isMockMode()) {
      // 模拟处理延迟
      await new Promise((r) => setTimeout(r, 800));
      return Response.json({
        ...MOCK_HEALTH_REPORT,
        generatedAt: new Date().toISOString(),
      });
    }

    // 真实模式：调用 DeepSeek 进行文档健康分析
    try {
      const OpenAI = (await import("openai")).default;

      const client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      });

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `你是一位资深的文学编辑，负责对文档进行四维度健康检查。

请分析以下四个维度：

1. characterConsistency（角色一致性）：检查是否有突然出现但未介绍的角色，或角色行为前后矛盾。
2. timeline（时间线）：检查时间跳跃是否有解释，时序是否清晰连贯。
3. logicChain（逻辑链）：检查论点是否有论据支撑，推理是否存在跳跃或漏洞。
4. duplicates（重复段落）：检查是否存在高度相似（>85%）的段落或意象重复。

返回 JSON 格式：
{
  "overallScore": 75,
  "dimensions": {
    "characterConsistency": 80,
    "timeline": 70,
    "logicChain": 75,
    "duplicates": 85
  },
  "findings": [
    {
      "type": "characterConsistency|timeline|logicChain|duplicates",
      "severity": "error|warning|info",
      "message": "中文描述",
      "position": 数字（文档中字符偏移量，估算即可）,
      "snippet": "相关文本片段"
    }
  ]
}

规则：
- overallScore 为 0-100 整数
- 各维度评分为 0-100 整数
- 只返回真实存在的问题，无问题则 findings 为空数组
- message 使用中文
- severity：error 表示严重问题，warning 表示需关注，info 表示提示`,
          },
          {
            role: "user",
            content: `请对以下文档进行健康检查：\n\n"""\n${truncatedText}\n"""`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("AI 返回空内容");
      }

      const parsed = JSON.parse(content);

      const report: HealthReport = {
        overallScore: parsed.overallScore ?? 100,
        dimensions: {
          characterConsistency: parsed.dimensions?.characterConsistency ?? 100,
          timeline: parsed.dimensions?.timeline ?? 100,
          logicChain: parsed.dimensions?.logicChain ?? 100,
          duplicates: parsed.dimensions?.duplicates ?? 100,
        },
        findings: (parsed.findings || []).map((f: Record<string, unknown>) => ({
          type: f.type || "logicChain",
          severity: f.severity || "info",
          message: String(f.message || ""),
          position: Number(f.position) || 0,
          snippet: String(f.snippet || ""),
        })),
        generatedAt: new Date().toISOString(),
      };

      return Response.json(report);
    } catch (err) {
      console.error("Document health check error:", err);
      // 降级：返回空报告
      return Response.json({
        overallScore: 100,
        dimensions: {
          characterConsistency: 100,
          timeline: 100,
          logicChain: 100,
          duplicates: 100,
        },
        findings: [],
        generatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return Response.json({ error: msg }, { status: 500 });
  }
}
