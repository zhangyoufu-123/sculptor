import { NextRequest } from "next/server";

export const runtime = "nodejs";

// ── 内存存储（模块级变量，单实例） ─────────────────────────

const STORAGE_KEY = "sculptor-writing-rules";

// 注意：服务端无法访问浏览器的 localStorage，这里使用模块级内存变量。
// 客户端通过组件直接读写 localStorage，API 路由保持兼容接口。
let rulesStore = "";

// ── GET /api/author/memory ─────────────────────────────────
// 返回当前的写作规则

export async function GET(_request: NextRequest) {
  try {
    return Response.json({ rules: rulesStore });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("GET /api/author/memory error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// ── POST /api/author/memory ────────────────────────────────
// 更新写作规则
// Body: { rules: string }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.rules === "string") {
      rulesStore = body.rules;
    }

    return Response.json({
      rules: rulesStore,
      message: "写作规则已更新",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("POST /api/author/memory error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
