import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/deepseek";
import { getSupabase } from "@/lib/supabase";
import { isMockMode } from "@/lib/ai/mock-responses";
import { ARCHITECT_CHAT_SYSTEM_PROMPT, buildArchitectChatPrompt } from "@/lib/ai/prompts/architect-chat";
import { getRecentCanvasChanges, getUserPreferences } from "@/lib/ai/architect-memory";

export const runtime = "nodejs";
export const maxDuration = 60;

// v4.2 mock: full argumentative architecture with hook/rebuttal/conclusion
const MOCK_V4_RESPONSE = {
  type: "confirmation",
  message: "经典论证架构：学校抑制学习",
  nodes: [
    { id: "n1", label: "学校体系在抑制而非促进真正的学习", type: "thesis", position: { x: 400, y: 30 }, children: ["n4", "n5", "n6"], writingTip: "用一句立场鲜明的论断句提出核心论点" },
    { id: "n2", label: "如果拿A就代表掌握了吗？", type: "hook", position: { x: 400, y: 120 }, children: [], writingTip: "用一个反问句挑起读者共鸣与思考" },
    { id: "n3", label: "美国标准化测试体系的历史", type: "background", position: { x: 200, y: 120 }, children: [], writingTip: "简要介绍教育评估体系的历史背景" },
    { id: "n4", label: "灌输式教学导致知识迅速遗忘", type: "argument", position: { x: 150, y: 220 }, children: ["n8"], writingTip: "分析灌输式教学与长期记忆的矛盾" },
    { id: "n5", label: "统一进度忽视个体学习差异", type: "argument", position: { x: 400, y: 220 }, children: ["n9"], writingTip: "对比不同学习速度学生的失落感" },
    { id: "n6", label: "考试压力扼杀内在学习动机", type: "argument", position: { x: 650, y: 220 }, children: ["n10"], writingTip: "论述外部压力如何摧毁自发兴趣" },
    { id: "n7", label: "标准化测试确保教育公平", type: "counterargument", position: { x: 400, y: 330 }, children: ["n11"], writingTip: "客观呈现反方的核心论据" },
    { id: "n8", label: "艾宾浩斯遗忘曲线：一周遗忘70%", type: "evidence", position: { x: 100, y: 310 }, children: [], writingTip: "引用经典心理学研究数据作为支撑" },
    { id: "n9", label: "落后学生放弃，优等生感到无聊", type: "evidence", position: { x: 350, y: 310 }, children: [], writingTip: "描述统一教学对不同学生的负面效果" },
    { id: "n10", label: "学生将学习与枯燥、沮丧关联", type: "evidence", position: { x: 600, y: 310 }, children: [], writingTip: "分析负面情感如何影响长期学习态度" },
    { id: "n11", label: "公平不应以牺牲深度学习为代价", type: "rebuttal", position: { x: 400, y: 420 }, children: [], writingTip: "反驳核心：公平与质量可以兼得" },
    { id: "n12", label: "改变教育是为下一代负责", type: "conclusion", position: { x: 400, y: 510 }, children: [], writingTip: "以呼吁行动的句式总结全文核心观点" },
  ],
  edges: [
    { id: "e1", from: "n2", to: "n3", relation: "precedes" },
    { id: "e2", from: "n3", to: "n1", relation: "precedes" },
    { id: "e3", from: "n1", to: "n4", relation: "elaborates" },
    { id: "e4", from: "n1", to: "n5", relation: "elaborates" },
    { id: "e5", from: "n1", to: "n6", relation: "elaborates" },
    { id: "e6", from: "n4", to: "n8", relation: "exemplifies" },
    { id: "e7", from: "n5", to: "n9", relation: "exemplifies" },
    { id: "e8", from: "n6", to: "n10", relation: "exemplifies" },
    { id: "e9", from: "n1", to: "n7", relation: "contradicts" },
    { id: "e10", from: "n7", to: "n11", relation: "supports" },
    { id: "e11", from: "n11", to: "n12", relation: "concludes" },
  ],
  highlight_nodes: ["n4"],
  suggestion: {
    type: "missing_evidence",
    message: "'灌输式教学'论点的证据可以补充具体研究数据",
    node_id: "n4",
    auto_fix_available: true,
  },
};

// Genre-aware mock architectures for mock mode
function getMockArchitecture(genre: string) {
  const n = (id: string, label: string, type: string, children: string[] = [], tip?: string) =>
    ({ id, label, type, position: { x: 400, y: 50 }, children, writingTip: tip });

  const basicSuggestion = {
    type: "missing_evidence" as const,
    message: "建议为关键论点补充具体数据或案例",
    node_id: "n4",
    auto_fix_available: true,
  };

  switch (genre) {
    case "记叙文": return {
      type: "confirmation", message: "已生成记叙文架构",
      nodes: [
        n("n1", "那年夏天，毕业旅行的最后一站", "hook", [], "用一句话抓住毕业旅行的独特氛围"),
        n("n2", "出发前的忐忑与期待", "background", [], "交代毕业背景和大家的心情"),
        n("n3", "火车上的六个小时", "scene", [], "描写车厢里的声音、窗外流动的风景"),
        n("n4", "洱海边的日出", "scene", [], "用感官细节描绘日出时刻的光与温度"),
        n("n5", "古城迷路记", "scene", [], "写迷路中的意外发现和小插曲"),
        n("n6", "离别前的火锅", "climax", [], "写大家围坐火锅时的对话和情绪"),
        n("n7", "青春就是一场没有返程的旅行", "reflection", [], "用一句话总结青春的不可逆与珍贵"),
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", relation: "precedes" },
        { id: "e2", from: "n2", to: "n3", relation: "precedes" },
        { id: "e3", from: "n3", to: "n4", relation: "precedes" },
        { id: "e4", from: "n4", to: "n5", relation: "precedes" },
        { id: "e5", from: "n5", to: "n6", relation: "precedes" },
        { id: "e6", from: "n6", to: "n7", relation: "concludes" },
      ],
      highlight_nodes: ["n6"], suggestion: basicSuggestion,
    };

    case "散文": return {
      type: "confirmation", message: "已生成散文架构",
      nodes: [
        n("n1", "黄昏是一天中最安静的时刻", "hook", [], "用一个意象切入主题，定下全文情绪基调"),
        n("n2", "窗外梧桐叶的影子", "imagery", [], "描写日光渐暗时梧桐叶的形态和光影"),
        n("n3", "远处传来的琴声", "imagery", [], "写琴声带来的听觉联想和情感波动"),
        n("n4", "记忆里的那个夏天", "imagery", [], "由当前意象联想到过去的相似场景"),
        n("n5", "时间如流水，我如行舟", "reflection", [], "从具体意象升华到普遍的人生感悟"),
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", relation: "precedes" },
        { id: "e2", from: "n2", to: "n3", relation: "precedes" },
        { id: "e3", from: "n3", to: "n4", relation: "precedes" },
        { id: "e4", from: "n4", to: "n5", relation: "concludes" },
      ],
      highlight_nodes: ["n2"], suggestion: basicSuggestion,
    };

    case "说明文": return {
      type: "confirmation", message: "已生成说明文架构",
      nodes: [
        n("n1", "为什么天空是蓝色的？", "hook", [], "用一个日常生活现象引发读者好奇心"),
        n("n2", "瑞利散射原理", "definition", [], "用简洁的语言解释核心原理"),
        n("n3", "短波长光更容易散射", "component", [], "用生活类比帮助理解波长概念"),
        n("n4", "日落时为什么变红？", "component", [], "用对比法解释同一原理的另一现象"),
        n("n5", "实验模拟：牛奶与水", "step", [], "给出一个可亲手验证的简单实验"),
        n("n6", "理解天空就是理解光的魔法", "summary", [], "总结原理并用诗意的语言收尾"),
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", relation: "supports" },
        { id: "e2", from: "n2", to: "n3", relation: "supports" },
        { id: "e3", from: "n2", to: "n4", relation: "supports" },
        { id: "e4", from: "n3", to: "n5", relation: "supports" },
        { id: "e5", from: "n4", to: "n6", relation: "supports" },
        { id: "e6", from: "n5", to: "n6", relation: "supports" },
      ],
      highlight_nodes: ["n3"], suggestion: basicSuggestion,
    };

    case "报告": return {
      type: "confirmation", message: "已生成报告架构",
      nodes: [
        n("n1", "新型电池技术的市场前景分析", "background", [], "概述研究背景和问题重要性"),
        n("n2", "对比分析法：固态电池 vs 锂离子", "methodology", [], "说明对比框架和评估维度"),
        n("n3", "固态电池成本下降趋势明显", "finding", [], "用具体数据和图表支撑成本分析"),
        n("n4", "储能密度提升达40%", "finding", [], "突出性能突破的关键数字"),
        n("n5", "供应链成熟仍需3-5年", "finding", [], "指出当前局限和时间预期"),
        n("n6", "建议分阶段投资布局", "conclusion", [], "从分析结论导出可操作建议"),
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", relation: "precedes" },
        { id: "e2", from: "n2", to: "n3", relation: "supports" },
        { id: "e3", from: "n2", to: "n4", relation: "supports" },
        { id: "e4", from: "n2", to: "n5", relation: "supports" },
        { id: "e5", from: "n3", to: "n6", relation: "supports" },
        { id: "e6", from: "n4", to: "n6", relation: "supports" },
        { id: "e7", from: "n5", to: "n6", relation: "supports" },
      ],
      highlight_nodes: ["n3"], suggestion: basicSuggestion,
    };

    case "游记": return {
      type: "confirmation", message: "已生成游记架构",
      nodes: [
        n("n1", "凌晨四点，京都还在沉睡", "hook", [], "用一句话定下整篇游记的基调与氛围"),
        n("n2", "为什么选在枫叶季出发？", "departure", [], "写明出发的缘由、同行者和期待心情"),
        n("n3", "伏见稻荷的千本鸟居", "scene", [], "描写鸟居的视觉震撼：颜色、光线、空间感"),
        n("n4", "岚山的竹林小径", "scene", [], "重点写竹林中的声音和穿过叶缝的光"),
        n("n5", "偶遇的茶道老人", "scene", [], "描写老人的仪态、茶道的细节及内心触动"),
        n("n6", "京都的颜色是寂静的", "impression", [], "总结旅途的整体感受，提炼一个关键词"),
        n("n7", "旅行不是为了抵达，而是为了出发", "reflection", [], "以一句有哲理的感悟收束全文"),
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2", relation: "precedes" },
        { id: "e2", from: "n2", to: "n3", relation: "precedes" },
        { id: "e3", from: "n3", to: "n4", relation: "precedes" },
        { id: "e4", from: "n4", to: "n5", relation: "precedes" },
        { id: "e5", from: "n5", to: "n6", relation: "precedes" },
        { id: "e6", from: "n6", to: "n7", relation: "concludes" },
      ],
      highlight_nodes: ["n6"], suggestion: basicSuggestion,
    };

    default: // 议论文
      return { ...MOCK_V4_RESPONSE };
  }
}

/** Mock clarification questions by genre (v5.1 guided questioning) */
function getMockClarification(genre: string): { type: string; message: string; options: { label: string; value: string }[]; followUp?: string } {
  const q = (label: string, value: string) => ({ label, value });
  switch (genre) {
    case "议论文": return { type: "clarification", message: "好的，我们来梳理议论文的要素。", options: [q("我完全支持这个观点", "完全支持"), q("我持反对态度", "完全反对"), q("我有比较折中的看法", "折中态度")], followUp: "你的核心立场是什么？能想到哪些支撑论据？" };
    case "记叙文": return { type: "clarification", message: "好的，我们来构思这个故事。", options: [q("这是真实的个人经历", "真实经历"), q("这是一个虚构的故事", "虚构故事"), q("基于真实事件改编", "真实改编")], followUp: "故事发生在什么时候、什么地方？" };
    case "散文": return { type: "clarification", message: "散文贵在真情实感。先确认情感基调：", options: [q("温暖的回忆", "温暖"), q("淡淡的忧伤", "忧伤"), q("冷静的思考", "冷静"), q("豁达的感悟", "豁达")], followUp: "你脑海中反复出现的是什么意象？" };
    case "游记": return { type: "clarification", message: "说说这次旅行。先确定写作重点：", options: [q("以风景描写为主", "风景为主"), q("以个人感悟为主", "感悟为主"), q("风景与感悟并重", "两者并重")], followUp: "最让你印象深刻的景点或时刻是什么？" };
    case "说明文": return { type: "clarification", message: "先明确说明对象和读者基础：", options: [q("读者对这个概念完全不了解", "零基础"), q("读者有了解但存在误解", "有误解"), q("读者已有基础", "有基础")], followUp: "用一句话能说清你要解释的概念吗？" };
    default: return { type: "clarification", message: "在搭建架构之前，先了解几个关键问题：", options: [q("我想表达一个明确的观点", "表达观点"), q("我想讲述一个故事", "讲述故事"), q("我想分享一种感受", "分享感受")] };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";
    const body = await request.json();
    const { message, conversationHistory, currentArchitecture, selectedNodeId } = body;
    if (!message) return Response.json({ error: "Missing message" }, { status: 400 });

    // Mock mode — genre-aware responses with progress + guided questions (v5.1)
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 300));
      const genreMatch = (message || "").match(/^\[文体：(.+?)\]/);
      const genre = genreMatch ? genreMatch[1] : "议论文";
      const hist = Array.isArray(conversationHistory) ? conversationHistory : [];
      const isFirstMessage = hist.length <= 1; // Only this user message, no prior exchange

      // v5.1: On first message, return guided questions instead of architecture
      if (isFirstMessage && genreMatch) {
        const questions = getMockClarification(genre);
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(questions)}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      // Follow-up: generate architecture with progress
      const mock = getMockArchitecture(genre);
      persistConversation(userId, body.documentId, message, JSON.stringify(mock));

      const nodes = mock.nodes || [];
      const edges = mock.edges || [];

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const enq = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

          // Stage 1: analyzing
          enq({ type: "progress", stage: "analyzing", message: "正在分析你的写作意图...", progress: 10 });
          await delay(400);

          // Stage 2: structuring
          enq({ type: "progress", stage: "structuring", message: "正在构建结构框架...", progress: 40 });
          await delay(500);

          // Stage 3: generating — push nodes one by one
          enq({ type: "progress", stage: "generating", message: "正在生成节点...", progress: 60 });
          for (let i = 0; i < nodes.length; i++) {
            enq({ type: "node", node: nodes[i], progress: 60 + Math.floor((i + 1) / nodes.length * 30) });
            await delay(120);
          }

          // Stage 4: send edges + metadata
          await delay(200);
          enq({
            type: "confirmation",
            message: mock.message,
            nodes,
            edges,
            highlight_nodes: mock.highlight_nodes || [],
            suggestion: mock.suggestion || null,
          });

          enq({ type: "progress", stage: "done", message: `架构生成完成，共 ${nodes.length} 个节点`, progress: 100 });
          enq({ type: "done" });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // Fetch dual-end sync context (canvas changes + user preferences)
    const manualChanges = await getRecentCanvasChanges(body.documentId);
    const userPreferences = await getUserPreferences(userId);

    const userPrompt = buildArchitectChatPrompt({
      message,
      currentArchitecture: currentArchitecture || { nodes: [], edges: [] },
      selectedNodeId: selectedNodeId || null,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      manualChanges: manualChanges || undefined,
      userPreferences: userPreferences || undefined,
    });

    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITECT_CHAT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);

    // Normalize nodes: DeepSeek sometimes uses title/description instead of label/notes
    if (parsed.nodes) {
      parsed.nodes = parsed.nodes.map((n: Record<string, unknown>) => ({
        ...n,
        label: n.label || n.title || "未命名",
        notes: n.notes || n.description || undefined,
        children: n.children || [],
      }));
    }

    // Normalize edges: DeepSeek sometimes uses source/target instead of from/to
    if (parsed.edges) {
      parsed.edges = parsed.edges.map((e: Record<string, unknown>) => ({
        id: e.id || e._id,
        from: e.from || e.source,
        to: e.to || e.target,
        relation: e.relation || "supports",
      }));
    }

    // Persist conversation to DB (best-effort)
    persistConversation(userId, body.documentId, message, content);

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

/** Best-effort conversation persistence. Never throws. */
async function persistConversation(
  userId: string,
  documentId: string | undefined,
  userMessage: string,
  aiResponse: string,
) {
  try {
    if (userId === "anonymous" || !documentId) return;
    const supabase = getSupabase();
    await supabase.from("architect_conversations").insert({
      document_id: documentId,
      user_id: userId,
      role: "user",
      content: userMessage,
    });
    await supabase.from("architect_conversations").insert({
      document_id: documentId,
      user_id: userId,
      role: "assistant",
      content: aiResponse,
    });
  } catch {
    // Silently skip persistence failures
  }
}
