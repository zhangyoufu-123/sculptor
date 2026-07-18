import { NextRequest } from "next/server";
import {
  createBlueprint,
  findNextTask,
  executeBlueprintTask,
  updateSlot,
  confirmSlot,
  type Blueprint,
} from "@/lib/ai/blueprint-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/discover/chat
 *
 * Blueprint Runtime: Blueprint → find gaps → assign task → LLM executes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anchor, history, thinking, ideas, blueprint: bpJson } = body as {
      anchor: string;
      history?: { role: string; content: string }[];
      thinking?: string[];
      ideas?: string[];
      blueprint?: Blueprint;
    };

    const input = anchor?.trim() || "这个话题";
    const lastUserMsg = history?.filter((m) => m.role === "user").pop()?.content || "";

    // Load or create Blueprint
    let bp: Blueprint = bpJson || createBlueprint(input, detectGenre(input));

    // If user said something, update the current active slot
    const activeSlot = bp.slots.find((s) => s.status === "filling");
    if (lastUserMsg && activeSlot) {
      // Check if user is confirming
      if (/好了|可以了|没问题|差不多了|满意|就这样/.test(lastUserMsg)) {
        bp = confirmSlot(bp, activeSlot.key);
      } else {
        bp = updateSlot(bp, activeSlot.key, lastUserMsg);
      }
    }

    // Find next task
    const task = findNextTask(bp, lastUserMsg);

    // Execute with LLM
    const response = await executeBlueprintTask(task);

    return Response.json({
      response,
      blueprint: bp,
      task: task.type,
      completeness: bp.completeness,
      outlineReady: bp.outlineReady,
      activeSlot: task.slot?.label || null,
    });
  } catch (error) {
    console.error("[discover/chat]", error);
    return Response.json({
      response: "我们继续——你现在最想聊什么？",
      blueprint: null,
      task: "welcome",
      completeness: 0,
      outlineReady: false,
      activeSlot: null,
    });
  }
}

function detectGenre(input: string): string {
  if (input.includes("议论文") || input.includes("观点") || input.includes("认为")) return "议论文";
  if (input.includes("散文") || input.includes("回忆") || input.includes("故事")) return "散文";
  if (input.includes("游记") || input.includes("旅行")) return "游记";
  if (input.includes("小说") || input.includes("角色")) return "小说";
  if (input.includes("论文") || input.includes("研究")) return "论文";
  if (input.includes("公众号") || input.includes("文案")) return "公众号";
  if (input.includes("日记")) return "日记";
  return "议论文";
}
