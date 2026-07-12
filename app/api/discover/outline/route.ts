import { NextRequest } from "next/server";
import { createClient } from "@/lib/deepseek";
import { isMockMode } from "@/lib/ai/mock-responses";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── POST /api/discover/outline ───────────────────────────────

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
        outline: generateMockOutline(topic, thinking, ideas),
      });
    }

    const client = createClient();

    const systemPrompt = `你是写作架构师。根据用户的锚点话题、思考记录和相关素材，生成一个清晰的文章大纲。

大纲格式要求：
- 用JSON格式返回，结构为 { "outline": [{ "level": 1|2, "title": "章节标题", "notes": "简要说明" }] }
- level 1 为主要章节，level 2 为子章节
- 标题简洁有力
- 章节之间逻辑连贯
- 3-6个主要章节`;

    const thinkingText = thinking?.length
      ? "\n思考记录：\n" + thinking.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "";

    const ideasText = ideas?.length
      ? "\n相关素材：\n" + ideas.map((i) => `- ${i}`).join("\n")
      : "";

    const userContent = `锚点话题："${topic}"${thinkingText}${ideasText}\n\n请根据以上内容生成文章大纲。`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(raw);

    return Response.json({
      outline: data.outline || generateMockOutline(topic, thinking, ideas),
    });
  } catch (error) {
    console.error("[discover/outline]", error);
    const topic = "这个话题";
    return Response.json({
      outline: generateMockOutline(topic, [], []),
    });
  }
}

// ── Mock outline generator ───────────────────────────────────

/**
 * Extract keywords from text for outline generation.
 */
function extractOutlineKeywords(text: string): string[] {
  const segments = text.split(/的|是|为什么|怎么|什么|？|\?|，|,|、|和|与|或|了|吗|呢|吧/);
  const words: string[] = [];
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.length >= 2 && trimmed.length <= 6) {
      words.push(trimmed);
    }
  }
  return [...new Set(words)].slice(0, 8);
}

/**
 * Detect which outline structure type is most appropriate based on thinking content.
 */
type StructureType = "DIALECTIC" | "LAYERED" | "CASE_STUDY" | "INQUIRY";

function detectStructureType(thinking: string[]): StructureType {
  const allText = thinking.join(" ");

  // Check for contrasting signals → DIALECTIC
  const contrastSignals = ["但是", "然而", "另一方面", "相反", "不过", "可是", "却", "矛盾"];
  const contrastCount = contrastSignals.filter((s) => allText.includes(s)).length;
  if (contrastCount >= 2) return "DIALECTIC";

  // Check for causal signals → LAYERED
  const causalSignals = ["因为", "原因", "导致", "所以", "因此", "由于", "根源", "本质"];
  const causalCount = causalSignals.filter((s) => allText.includes(s)).length;
  if (causalCount >= 2) return "LAYERED";

  // Check for specific examples/products → CASE_STUDY
  const exampleSignals = ["比如", "例如", "案例", "具体", "苹果", "谷歌", "微信", "抖音",
    "特斯拉", "OpenAI", "ChatGPT", "iPhone", "App", "产品", "实例", "场景"];
  const exampleCount = exampleSignals.filter((s) => allText.includes(s)).length;
  if (exampleCount >= 2) return "CASE_STUDY";

  // Check for question-driven thinking → INQUIRY
  const inquirySignals = ["为什么", "怎么", "什么是", "如何", "？", "?"];
  const inquiryCount = inquirySignals.filter((s) => allText.includes(s)).length;
  if (inquiryCount >= 3) return "INQUIRY";

  // Default: LAYERED
  return "LAYERED";
}

/**
 * Generate an outline whose structure and content reflect what was actually discussed.
 */
function generateMockOutline(
  anchor: string,
  thinking: string[],
  ideas: string[]
): { level: number; title: string; notes: string }[] {
  const topic = anchor.slice(0, 30) || "这个话题";

  // Extract keywords from the anchor and thinking items for interpolation
  const anchorKws = extractOutlineKeywords(anchor);
  const allThinkingText = thinking.join(" ");
  const thinkingKws = extractOutlineKeywords(allThinkingText);

  // Merge keywords, prefer anchor keywords first, then thinking keywords
  const allKws = [...new Set([...anchorKws, ...thinkingKws])];
  const kw = (idx: number) => allKws[idx] || topic;

  const structureType = detectStructureType(thinking);

  // Build outline based on detected structure type
  const outline: { level: number; title: string; notes: string }[] = [];

  switch (structureType) {
    case "DIALECTIC": {
      // Position A → Position B → Synthesis → Conclusion
      outline.push(
        { level: 1, title: `问题的提出：${kw(0)}的两种面孔`, notes: `从${kw(0)}看似矛盾的两种说法切入，引出核心张力` },
        { level: 1, title: `立场一：${kw(0)}的正面论述`, notes: thinking[0] ? `展开「${thinking[0].slice(0, 20)}」这一侧的逻辑` : "展开正面立场" },
        { level: 2, title: "支持的理由", notes: "梳理支持这一立场的论据与事实" },
        { level: 2, title: "隐含的前提", notes: "这一立场默认接受了哪些假设？" },
        { level: 1, title: `立场二：${kw(1) || "反面"}的挑战`, notes: thinking.length >= 2 ? `回应「${thinking[1].slice(0, 20)}」所代表的另一面` : "展开对立面的论证" },
        { level: 2, title: "反方的核心论据", notes: "质疑与挑战的合理性" },
        { level: 2, title: "反方忽视了什么", notes: "反面立场自身的盲点" },
        { level: 1, title: `超越对立：${kw(0)}的第三种可能`, notes: "不是简单折中，而是跳出二元框架重新定义问题" },
        { level: 1, title: "结论：张力中的洞察", notes: "总结两种立场碰撞出的新认识" },
      );
      break;
    }

    case "CASE_STUDY": {
      // Context → Case → Analysis → Generalization
      outline.push(
        { level: 1, title: `为什么从${kw(0)}说起`, notes: `以${kw(0)}这个具体案例切入，说明它为什么值得深入分析` },
        { level: 1, title: `${kw(0)}：一个具体的解剖`, notes: "详细展开案例，呈现关键事实与细节" },
        { level: 2, title: "关键事实", notes: "不评价，只呈现" },
        { level: 2, title: "令人意外的细节", notes: "那些容易忽略但至关重要的点" },
        { level: 1, title: `从${kw(0)}看到什么`, notes: "从案例中提炼出规律和模式" },
        { level: 2, title: "表层现象", notes: "容易被看到的问题" },
        { level: 2, title: "深层机制", notes: thinking.length >= 2 ? `结合「${thinking[1].slice(0, 15)}…」的分析` : "隐藏在现象背后的驱动力" },
        { level: 1, title: `不只是${kw(0)}`, notes: "将这个案例的分析推广到更一般的结论" },
        { level: 1, title: "行动启示", notes: "从分析中能得出什么可以应用的洞察" },
      );
      break;
    }

    case "INQUIRY": {
      // The Question → Exploration → What We Found → Open Questions
      outline.push(
        { level: 1, title: `一个真正的问题：${topic}`, notes: `不是给答案，而是先定义什么是一个好问题` },
        { level: 1, title: `第一个追问：${kw(0)}意味着什么`, notes: thinking[0] ? `从「${thinking[0].slice(0, 20)}」出发深度追问` : "剥开第一层" },
        { level: 2, title: "直觉的反应", notes: "我们不经思考的第一反应是什么" },
        { level: 2, title: "停下来想一想", notes: "第一反应可能漏掉了什么" },
        { level: 1, title: `第二个追问：${kw(1) || "换个角度"}`, notes: thinking.length >= 2 ? `结合「${thinking[1].slice(0, 20)}」换一个方向` : "从另一个方向探索" },
        { level: 2, title: "新的线索", notes: "这个方向上发现了什么" },
        { level: 1, title: "我们发现了什么", notes: "总结追问过程中的关键收获" },
        { level: 1, title: "仍然没有答案的问题", notes: "诚实地留下开放的空间，比强行结论更有力" },
      );
      break;
    }

    case "LAYERED":
    default: {
      // Problem → Surface → Deep → Solution → Implication
      outline.push(
        { level: 1, title: `${kw(0)}：一个被忽视的问题`, notes: thinking[0] ? `从「${thinking[0].slice(0, 20)}」切入，指出问题为什么重要` : "提出问题的现实意义" },
        { level: 1, title: "表象：我们看到了什么", notes: "梳理最直接可见的现象和普遍认知" },
        { level: 2, title: `关于${kw(1) || topic}的常见说法`, notes: "梳理主流观点和常规理解" },
        { level: 2, title: "这些说法忽略的部分", notes: "指出现有理解的局限" },
        { level: 1, title: "深层：真正在发生什么", notes: thinking.length >= 2 ? `从「${thinking[1].slice(0, 20)}」深入分析` : "挖掘表象之下的驱动力" },
        { level: 2, title: "结构性原因", notes: "不是个人选择，是系统机制" },
        { level: 2, title: "被忽视的关联", notes: thinking.length >= 3 ? `联系到「${thinking[2].slice(0, 20)}」` : "不同因素之间隐秘的相互作用" },
        { level: 1, title: "出路：可能的解法与代价", notes: "不是简单方案，而是诚实评估每种路径的利弊" },
        { level: 1, title: `重新理解${kw(0)}`, notes: "经过层层分析后，对最初的问题形成新的认识" },
      );
      break;
    }
  }

  // Append idea references if available
  if (ideas.length > 0) {
    outline.push({
      level: 1,
      title: "参考资料",
      notes: ideas.slice(0, 5).join("、"),
    });
  }

  return outline;
}
