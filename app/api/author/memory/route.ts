import { NextRequest } from "next/server";
import { isMockMode } from "@/lib/ai/mock-responses";
import {
  getDefaultMemory,
  applyForbiddenFilter,
  buildMemoryContext,
} from "@/lib/ai/author-memory";
import type { AuthorMemory } from "@/types/author";

export const runtime = "nodejs";

// ── 内存存储（模块级变量，单实例） ─────────────────────────

let memoryStore: AuthorMemory = getDefaultMemory();

// ── GET /api/author/memory ─────────────────────────────────
// 返回当前作者记忆（Mock 模式下始终返回默认数据）

export async function GET(_request: NextRequest) {
  try {
    // Mock 模式：始终返回默认数据
    if (isMockMode()) {
      return Response.json({
        memory: getDefaultMemory(),
        context: buildMemoryContext(getDefaultMemory()),
        mock: true,
      });
    }

    return Response.json({
      memory: memoryStore,
      context: buildMemoryContext(memoryStore),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("GET /api/author/memory error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// ── POST /api/author/memory ────────────────────────────────
// 更新作者记忆
// Body: { preferences?, dislikes?, habits?, masterpieces?, forbiddenExpressions? }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      preferences,
      dislikes,
      habits,
      masterpieces,
      forbiddenExpressions,
    } = body as Partial<AuthorMemory>;

    // Mock 模式：不更新实际存储，但返回更新后的结果（模拟成功）
    if (isMockMode()) {
      const mockMemory = getDefaultMemory();

      // 将用户提交的字段合并到默认数据上（仅用于响应预览）
      const updatedMock: AuthorMemory = {
        preferences: preferences ?? mockMemory.preferences,
        dislikes: dislikes ?? mockMemory.dislikes,
        habits: habits ?? mockMemory.habits,
        masterpieces: masterpieces ?? mockMemory.masterpieces,
        forbiddenExpressions:
          forbiddenExpressions ?? mockMemory.forbiddenExpressions,
      };

      return Response.json({
        memory: updatedMock,
        context: buildMemoryContext(updatedMock),
        mock: true,
        message: "作者记忆已更新（Mock 模式，未持久化）",
      });
    }

    // 生产模式：更新内存存储
    if (preferences !== undefined) {
      memoryStore.preferences = preferences;
    }
    if (dislikes !== undefined) {
      memoryStore.dislikes = dislikes;
    }
    if (habits !== undefined) {
      memoryStore.habits = habits;
    }
    if (masterpieces !== undefined) {
      memoryStore.masterpieces = masterpieces;
    }
    if (forbiddenExpressions !== undefined) {
      memoryStore.forbiddenExpressions = forbiddenExpressions;
    }

    return Response.json({
      memory: memoryStore,
      context: buildMemoryContext(memoryStore),
      message: "作者记忆已更新",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("POST /api/author/memory error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// ── 额外导出：禁语过滤端点（POST /api/author/memory/filter） ──
// 用于客户端调用过滤文本，不必自己导入 lib

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (typeof text !== "string") {
      return Response.json(
        { error: "缺少 text 字段" },
        { status: 400 }
      );
    }

    const memory = isMockMode() ? getDefaultMemory() : memoryStore;
    const filtered = applyForbiddenFilter(text, memory);
    const removedCount = text.length - filtered.length;

    return Response.json({
      original: text,
      filtered,
      removedExpressions: removedCount > 0 ? "已移除禁忌表达" : "未发现禁忌表达",
      charDiff: removedCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("PUT /api/author/memory error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
