import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/deepseek";
import { getSupabase } from "@/lib/supabase";
import { isMockMode } from "@/lib/ai/mock-responses";
import { ARCHITECT_CHAT_SYSTEM_PROMPT, buildArchitectChatPrompt } from "@/lib/ai/prompts/architect-chat";
import { getRecentCanvasChanges, getUserPreferences } from "@/lib/ai/architect-memory";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── v5.2: Topic extraction ──────────────────────────────────

/** Strip common prefixes to extract the user's core topic */
function extractTopic(messages: string[]): string {
  // Use the first user message that isn't a trigger word or short answer
  for (const m of messages) {
    const cleaned = m
      .replace(/^论证|^论述|^探讨|^分析|^关于|^谈谈|^我想写|^我想/, "")
      .replace(/的必要性|的意义|的重要性|的利弊|的影响$/g, "")
      .trim();
    if (cleaned.length >= 4 && !/^可以了|^生成|^够了|^没问题|^开始/.test(cleaned)) {
      return cleaned;
    }
  }
  return messages[0]?.replace(/^论证|^论述|^探讨|^分析/, "").trim() || "这个话题";
}

/** Get all user answers from conversation history */
function getUserAnswers(hist: { role: string; content: string }[]): string[] {
  return hist.filter(m => m.role === "user").map(m => m.content);
}

// ── v5.2: Dynamic node factories ────────────────────────────

function n(id: string, label: string, type: string, children: string[] = [], tip?: string) {
  return { id, label, type, children, writingTip: tip };
}

function q(label: string, value: string) {
  return { label, value };
}

/** Build skeleton nodes for Round 0 */
function buildSkeletonNodes(topic: string) {
  return [
    n("n1", `论${topic}`, "thesis", ["n3", "n4"], "用一句鲜明论断提出你的核心观点"),
    n("n2", `当我们谈论${topic}时，我们在谈论什么？`, "hook", [], "用一个反问或设问引发读者思考"),
    n("n3", `什么是${topic}？`, "background", [], `简要介绍${topic}的背景与定义`),
    n("n4", `为什么${topic}如此重要？`, "argument", [], "展开第一个核心论据"),
  ];
}

/** Build argument nodes for Round 1 */
function buildArgumentNodes(topic: string, _answers: string[]) {
  return [
    n("n5", `${topic}的第一个关键维度`, "argument", ["n9"], `从第一个角度深入论证${topic}`),
    n("n6", `${topic}的第二个关键维度`, "argument", ["n10"], `从第二个角度深入论证${topic}`),
    n("n7", `对${topic}的常见质疑`, "counterargument", ["n11"], "客观呈现反方的核心论据"),
    n("n9", `数据与研究：${topic}的事实基础`, "evidence", [], "引用研究数据支撑论点"),
    n("n10", `案例分析：${topic}的现实映照`, "evidence", [], "用具体案例让论证落地"),
  ];
}

/** Build final nodes for Round 2 */
function buildFinalNodes(topic: string, _answers: string[]) {
  return [
    n("n8", `回应质疑：为什么${topic}仍然成立`, "rebuttal", ["n12"], "反驳对方论点，强化己方立场"),
    n("n11", `关于${topic}的更多证据`, "evidence", [], "补充支持性论据"),
    n("n12", `${topic}给我们的启示`, "conclusion", [], "总结全文，升华主题"),
  ];
}

/** Build full architecture for final generation */
function buildFullArchitecture(topic: string, _genre: string) {
  return {
    type: "confirmation",
    message: `已完成关于「${topic}」的论证架构`,
    nodes: [
      n("n1", `论${topic}`, "thesis", ["n4", "n5", "n6", "n7"], "核心论点：用一句鲜明论断提出立场"),
      n("n2", `当我们谈论${topic}时，我们在谈论什么？`, "hook", ["n3"], "开篇钩子：引发读者兴趣"),
      n("n3", `${topic}的背景与现状`, "background", [], "交代背景：为什么这个话题值得讨论"),
      n("n4", `论点一：${topic}的第一个核心维度`, "argument", ["n8"], "展开第一个论证方向"),
      n("n5", `论点二：${topic}的深层逻辑`, "argument", ["n9"], "从另一个角度深化论证"),
      n("n6", `论点三：${topic}的现实意义`, "argument", ["n10"], "将论证与现实联系起来"),
      n("n7", `对${topic}的反方观点`, "counterargument", ["n11"], "客观呈现不同声音"),
      n("n8", `证据一：关于${topic}的数据与研究`, "evidence", [], "用事实数据支撑论点"),
      n("n9", `证据二：${topic}的案例分析`, "evidence", [], "用具体案例说明"),
      n("n10", `证据三：${topic}的跨领域视角`, "evidence", [], "从其他领域获取支撑"),
      n("n11", `回应质疑：为什么${topic}仍然成立`, "rebuttal", ["n12"], "反驳并强化己方立场"),
      n("n12", `结论：${topic}给我们的启示`, "conclusion", [], "总结升华，留下余韵"),
    ],
    edges: [],
    highlight_nodes: ["n4"],
    suggestion: { type: "missing_evidence", message: `建议为「${topic}」的第一个论点补充具体数据或案例`, node_id: "n4", auto_fix_available: true },
  };
}

// ── v5.2: Dynamic deep questioning ──────────────────────────

function getDeepQuestion(
  round: number,
  message: string,
  hist: { role: string; content: string }[],
) {
  const topic = extractTopic(getUserAnswers(hist));
  const answers = getUserAnswers(hist);

  switch (round) {
    case 0:
      return {
        type: "clarification",
        message: `好的，我先为「${topic}」搭建一个基本框架。\n\n**第一个问题：这个论证的根本出发点是什么？**`,
        options: [
          q("从理论/学术角度分析", "理论角度"),
          q("从社会现实/案例分析", "现实角度"),
          q("从个人经验/观察出发", "个人视角"),
          q("从批判/反思角度切入", "批判视角"),
        ],
        round: 1,
        nodes: buildSkeletonNodes(topic),
      };

    case 1:
      return {
        type: "clarification",
        message: `框架在扩展。现在我想确认——\n\n**关于「${topic}」，你打算从哪几个方向展开论证？有没有需要反驳的观点？**`,
        options: [
          q("我有一个明确的对立观点需要反驳", "有对立观点"),
          q("我的论证是正面展开的，不需要专门反驳", "正面展开"),
          q("我想先正面论证，再回应可能的质疑", "先正后反"),
          q("我想用辩证的方式，正反两面同时推进", "辩证推进"),
        ],
        round: 2,
        nodes: buildArgumentNodes(topic, answers),
      };

    case 2:
    default:
      return {
        type: "clarification",
        message: `核心框架已就位。最后一个问题——\n\n**关于「${topic}」，你希望读者读完最后一句产生什么感受？**`,
        options: [
          q("受到启发，想要采取行动", "启发行动"),
          q("被说服，认同文章的观点", "被说服"),
          q("陷入沉思，重新审视这个问题", "沉思反思"),
          q("感到震撼，看到问题的新维度", "感到震撼"),
          q("✅ 可以了，生成完整架构", "生成架构"),
        ],
        round: 3,
        nodes: buildFinalNodes(topic, answers),
      };
  }
}

// ── v5.1 legacy: Genre-specific clarification (preserved) ──

function getMockClarification(genre: string) {
  const q = (label: string, value: string) => ({ label, value });
  switch (genre) {
    case "议论文": return { type: "clarification", message: "好的，我们来梳理议论文的要素。你的核心立场是什么？", options: [q("我完全支持这个观点", "完全支持"), q("我持反对态度", "完全反对"), q("我有比较折中的看法", "折中态度")] };
    case "记叙文": return { type: "clarification", message: "好的，我们来构思这个故事。", options: [q("这是真实的个人经历", "真实经历"), q("这是一个虚构的故事", "虚构故事"), q("基于真实事件改编", "真实改编")] };
    case "散文": return { type: "clarification", message: "散文贵在真情实感。先确认情感基调：", options: [q("温暖的回忆", "温暖"), q("淡淡的忧伤", "忧伤"), q("冷静的思考", "冷静"), q("豁达的感悟", "豁达")] };
    case "游记": return { type: "clarification", message: "说说这次旅行。先确定写作重点：", options: [q("以风景描写为主", "风景为主"), q("以个人感悟为主", "感悟为主"), q("风景与感悟并重", "两者并重")] };
    case "说明文": return { type: "clarification", message: "先明确说明对象和读者基础：", options: [q("读者对这个概念完全不了解", "零基础"), q("读者有了解但存在误解", "有误解"), q("读者已有基础", "有基础")] };
    default: return { type: "clarification", message: "在搭建架构之前，先了解几个关键问题：", options: [q("我想表达一个明确的观点", "表达观点"), q("我想讲述一个故事", "讲述故事"), q("我想分享一种感受", "分享感受")] };
  }
}

// ── Main route handler ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";
    const body = await request.json();
    const { message, conversationHistory, currentArchitecture, selectedNodeId } = body;
    if (!message) return Response.json({ error: "Missing message" }, { status: 400 });

    // Mock mode — dynamic topic-aware architecture (v5.2)
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 300));
      const genreMatch = (message || "").match(/^\[文体：(.+?)\]/);
      const genre = genreMatch ? genreMatch[1] : "议论文";
      const hist = Array.isArray(conversationHistory) ? conversationHistory : [];
      const prevUserMsgCount = hist.filter((m: { role: string }) => m.role === "user").length - 1;
      const triggerWords = /可以了|生成架构|开始搭建|搭建架构|够了|没问题|开始吧|生成|确认/;
      const shouldGenerate = triggerWords.test(message) && prevUserMsgCount >= 0;
      const topic = extractTopic(getUserAnswers(hist));

      // Deep questioning with interleaved nodes
      if (!shouldGenerate && !genreMatch && prevUserMsgCount <= 2) {
        const round = prevUserMsgCount;
        const questions = getDeepQuestion(round, message, hist);
        const partialNodes = questions.nodes || [];
        
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            for (const node of partialNodes) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "node", node })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: questions.type, message: questions.message, options: questions.options, round: questions.round })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      }

      // Genre-prefixed first message
      if (!shouldGenerate && genreMatch && prevUserMsgCount <= 0) {
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

      // Generate full architecture (after questioning or trigger)
      const mock = buildFullArchitecture(topic, genre);
      persistConversation(userId, body.documentId, message, JSON.stringify(mock));
      const nodes = mock.nodes || [];

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const enq = (data: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

          enq({ type: "progress", stage: "analyzing", message: `正在综合关于「${topic}」的观点...`, progress: 10 });
          await delay(500);
          enq({ type: "progress", stage: "structuring", message: "正在构建逻辑框架...", progress: 40 });
          await delay(500);
          enq({ type: "progress", stage: "generating", message: "正在生成节点...", progress: 60 });
          for (let i = 0; i < nodes.length; i++) {
            enq({ type: "node", node: nodes[i], progress: 60 + Math.floor((i + 1) / nodes.length * 30) });
            await delay(120);
          }
          await delay(200);
          enq({ type: "confirmation", message: mock.message, nodes, edges: mock.edges || [], highlight_nodes: mock.highlight_nodes || [], suggestion: mock.suggestion || null });
          enq({ type: "progress", stage: "done", message: `架构生成完成，共 ${nodes.length} 个节点`, progress: 100 });
          enq({ type: "done" });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // ── Real mode (DeepSeek) ─────────────────────────────────
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
      model: "deepseek-chat", temperature: 0.5, max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ARCHITECT_CHAT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    const parsed = JSON.parse(content);

    if (parsed.nodes) {
      parsed.nodes = parsed.nodes.map((n: Record<string, unknown>) => ({
        ...n, label: n.label || n.title || "未命名",
        notes: n.notes || n.description || undefined, children: n.children || [],
      }));
    }
    if (parsed.edges) {
      parsed.edges = parsed.edges.map((e: Record<string, unknown>) => ({
        id: e.id || e._id, from: e.from || e.source, to: e.to || e.target,
        relation: e.relation || "supports",
      }));
    }

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

async function persistConversation(
  userId: string, documentId: string | undefined,
  userMessage: string, aiResponse: string,
) {
  try {
    if (userId === "anonymous" || !documentId) return;
    const supabase = getSupabase();
    await supabase.from("architect_conversations").insert({ document_id: documentId, user_id: userId, role: "user", content: userMessage });
    await supabase.from("architect_conversations").insert({ document_id: documentId, user_id: userId, role: "assistant", content: aiResponse });
  } catch { /* */ }
}
