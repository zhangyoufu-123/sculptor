# Sculptor — Project Handoff Document

## 概述

Sculptor 是一个认知工作室（Cognitive Studio），帮助用户从一个模糊念头成长为一篇完整作品。不是 AI 写作工具，而是基于三阶段认知循环的 Mentor Session。

```
站点: http://localhost:3000
仓库: github.com/zhangyoufu-123/sculptor (main 分支)
提交数: 15 commits (精简后)
```

---

## 工程目录完整清单 (60 files, ~13K lines)

```
sculptor/
│
├── app/                                 # Next.js 14 App Router
│   ├── page.tsx                         # GET / — Life Dashboard
│   ├── layout.tsx                       # Root layout (theme, fonts)
│   ├── globals.css                      # DESIGN.md tokens (497 lines)
│   │
│   ├── discover/page.tsx                # GET /discover — Mentor Session
│   ├── write/page.tsx                   # GET /write — Craft Editor
│   ├── reflect/page.tsx                 # GET /reflect — 回望
│   ├── architect/page.tsx               # GET /architect → 307 /discover
│   ├── auth/signin/page.tsx             # GET /auth/signin
│   │
│   └── api/
│       ├── discover/chat/route.ts       # ★ 核心 — 三阶段管道 + DeepSeek
│       ├── discover/outline/route.ts    # 从思考生成大纲
│       ├── chat/route.ts                # Ghost Thinking + inline AI
│       ├── reflect/route.ts             # 写作回顾
│       ├── documents/route.ts           # 文档 CRUD
│       ├── documents/[id]/route.ts      # 单文档操作
│       └── auth/[...nextauth]/route.ts  # NextAuth
│
├── lib/ai/                              # ★ AI 核心引擎
│   ├── cognitive-pipeline.ts            # 三阶段认知循环
│   ├── cognitive-engine.ts              # World Model + 4 层引擎
│   ├── semantic-grounding.ts            # SPO 提取 + 禁止上下文污染
│   ├── world-model.ts                   # 会话认知画像
│   ├── discipline-router.ts             # 8 学科知识上下文
│   ├── mentor-llm.ts                    # 自由文本回复（mock）
│   ├── cognitive-diagnoser.ts           # 7 阶段思维状态机
│   ├── knowledge-hub.ts                 # 8 领域 × 43 条知识
│   ├── verifier.ts                      # 事实/推理/不确定分类
│   ├── vector_store.py                  # TF-IDF 零下载向量存储
│   ├── ingest.py                        # 知识导入脚本
│   ├── retrieve.py                      # Python 搜索服务
│   ├── retrieval-bridge.ts              # TS ↔ Python 子进程桥
│   ├── mock-responses.ts                # Mock 模式标志
│   ├── ghost-ranker.ts                  # Ghost 候选排序
│   ├── context-memory.ts                # 上下文记忆（含 TS 错误）
│   └── agents/
│       ├── types.ts                     # Agent 类型定义
│       ├── index.ts                     # Agent 工厂
│       └── pipeline.ts                  # 遗留 orchestrator（注释标注）
│
├── components/
│   ├── EditorCanvas.tsx                 # TipTap 编辑器封装
│   ├── ParagraphCards.tsx               # 段落卡片 + 拖拽排序
│   ├── AIBubble.tsx                     # 内联 AI 操作按钮
│   ├── SuggestionPreview.tsx            # AI 建议预览
│   ├── CommandPalette.tsx               # ⌘K 命令面板
│   ├── StyleSetup.tsx                   # 风格设置
│   ├── Reflection.tsx                   # 回望视图
│   ├── ErrorBoundary.tsx                # React 错误边界
│   └── shared/
│       └── ThemeSwitcher.tsx            # 主题切换
│
├── hooks/
│   └── useGhostText.ts                  # Ghost Thinking hook
│
├── extensions/
│   ├── ai/GhostText.ts                  # TipTap Ghost Text 扩展
│   └── ui/SelectionGlow.ts              # 选区高亮扩展
│
├── lib/                                 # 基础库
│   ├── deepseek.ts                      # DeepSeek API 客户端
│   ├── store.ts                         # Zustand UI Store
│   ├── local-store.ts                   # localStorage 封装
│   ├── editor/extensions.ts             # TipTap 扩展配置
│   ├── supabase.ts                      # Supabase stub 客户端
│   └── style/instant-preference.ts      # 即时偏好存储
│
├── types/
│   ├── editor.ts                        # Editor 相关类型
│   └── architect.ts                     # ArchitectNode 类型（仍被使用）
│
├── docs/
│   ├── SHIG.md                          # 设计宪法 (1,414 lines)
│   └── plans/                           # 历史计划文档 (5 files)
│
├── DESIGN.md                            # Design Token 定义
├── vercel.json                          # Vercel 部署配置
├── .env.local                           # DeepSeek API Key + MOCK_MODE
├── next.config.js                       # Next.js 配置
├── tsconfig.json                        # TypeScript 配置
├── tailwind.config.ts                   # Tailwind 配置（仅 DESIGN.md tokens）
├── package.json                         # 依赖声明
├── middleware.ts                        # NextAuth 中间件
├── auth.ts                              # NextAuth 配置
│
├── supabase/                            # Supabase 迁移（9 files, 未使用）
├── supabase-schema.sql                  # Schema 定义（未使用）
├── public/templates/                    # 写作模板 (5 JSON, 未使用)
│
└── docs/plans/                          # 历史开发计划 (5 .md)
```

---

## 数据流全景

```
用户浏览器
  │
  ├─ GET / → page.tsx
  │    └─ localStorage: sculpt-anchor
  │
  ├─ GET /discover → discover/page.tsx
  │    └─ POST /api/discover/chat
  │         ├─ Stage 1: semantic-grounding.ts (SPO + domains)
  │         ├─ Stage 2: cognitive-pipeline.ts (3 hypotheses)
  │         ├─ Stage 3: DeepSeek v4-pro (system prompt + context)
  │         └─ Response: { response, understanding, stageGates }
  │              └─ POST /api/discover/outline → localStorage
  │
  ├─ GET /write → write/page.tsx
  │    ├─ localStorage → ParagraphCards
  │    ├─ EditorCanvas (TipTap)
  │    └─ Ghost Text (useGhostText.ts → chat/route.ts)
  │
  └─ GET /reflect → reflect/page.tsx
       └─ localStorage → Reflection
```

---

## AI 引擎详解

### 三阶段认知循环 (cognitive-pipeline.ts)

```
User Input
  │
  ▼
Stage 1: Understand（规则引擎，不输出给用户）
  ├─ SPO 提取: 主语-谓语-宾语
  ├─ 真实问题推断
  ├─ 学科映射 → discipline-router.ts
  ├─ 争议概念识别
  └─ 禁止上下文污染
  │
  ▼
Stage 2: Reason（规则引擎，不输出给用户）
  ├─ 生成 2-4 个竞争假设
  ├─ 评分 + 选择倾向
  └─ 证据需求标注
  │
  ▼
Stage 3: Dialogue（DeepSeek v4-pro，唯一输出）
  ├─ system prompt: 口语化 + 以听为先 + 不确定
  ├─ user content: grounding + hypotheses + thinking + round count
  ├─ temperature: 0.75, top_p: 0.9, max_tokens: 400
  └─ → 自由文本回复
```

### World Model (world-model.ts)

```
每个会话维护一个完整的认知画像：
  anchor, topic, domain, stage, phase,
  userThinking[], discoveries[], openQuestions[],
  supportingEvidence[], counterEvidence[],
  currentPosition, confidence, unknowns[],
  stateChanges[] (每轮追踪认知变化)
```

### Discipline Router (discipline-router.ts)

```
8 学科，各有独立知识框架：
  HCI/产品设计  AI/技术  教育  哲学
  社会/文化     商业     写作  历史
```

---

## API 接口速查

| 方法 | 路径 | 用途 | 输入 | 输出 |
|------|------|------|------|------|
| POST | /api/discover/chat | 核心讨论 | `{anchor, thinking, ideas, history}` | `{response, understanding, stageGates}` |
| POST | /api/discover/outline | 生成大纲 | `{anchor, thinking, ideas}` | `{outline: [{level, title, notes}]}` |
| POST | /api/chat | Ghost+内联 AI | `{text, intent, documentId}` | SSE stream |
| POST | /api/reflect | 写作回顾 | `{anchor, content, outline}` | `{questionEvolution, patterns}` |
| GET/PATCH | /api/documents | 文档管理 | - | - |

---

## 关键技术决策

1. **Mock 模式关闭** — `NEXT_PUBLIC_MOCK_MODE=false`，DeepSeek 真实 API
2. **模型** — `deepseek-v4-pro`（`deepseek-chat` 即将弃用）
3. **无外部数据库** — 无 PostgreSQL/Redis/Docker，纯 localStorage + TF-IDF
4. **CSS** — 内联样式 + CSS 变量（DESIGN.md tokens），无 Tailwind/CSS Modules
5. **编辑器** — TipTap (React)，非 contentEditable 裸写
6. **Ghost 默认 ON** — 右侧"思考中"（金色），可点击切换

---

## 当前存在的问题

### 🔴 严重

1. **context-memory.ts 有 TypeScript 编译错误**
   - `Cannot find module '@/lib/supabase'` → supabase stub 路径问题
   - `Cannot find module '@/types/editor'` → 类型定义导入问题
   - 文件被 `lib/ai/agents/pipeline.ts` 和 `lib/ai/agents/index.ts` 引用
   - **影响**: 不影响运行（webpack 允许），但 IDE 报红

2. **retrieval-bridge.ts 有 esModuleInterop 错误**
   - 不影响编译但 IDE 提示
   
3. **write/page.tsx 引用 TopBar 已删除**
   - 之前 commit 已移除 import，但可能有残留引用

### 🟡 中等

4. **对话轮次计数不稳定**
   - `history` 数组依赖前端传回，刷新后丢失
   - World Model 在服务端重建时会丢失 stateChanges
   - **建议**: localStorage 持久化 session state

5. **ParagraphCard 节点与编辑器同步弱**
   - 段落匹配仅靠关键词搜索，不精确
   - 拖拽排序只影响 UI，不联动编辑器内容

6. **Discover 页面的 API 响应不显示在 Thinking Board**
   - 右侧面板只显示 `{mentorResponse}`，不显示 hypotheses/stageGates
   - 理解度分数、阶段门控在前端不可见

7. **Reflection 页面数据依赖 localStorage**
   - 如果用户直接访问 `/reflect`，无数据则重定向 `/write`
   - 没有服务端持久化

### 🟢 轻微

8. **Python 向量存储未被正式使用**
   - TF-IDF 引擎完整但 RetrieverAgent 优先走 Knowledge Hub 静态数据
   - `retrieve.py` 路径导入路径依赖项目根目录

9. **Supabase 迁移全部注册但未连接**
   - 9 个迁移文件 + schema.sql + supabase.ts stub
   - Mock 模式不需要但文件存在

10. **Write 页面缺少文档标题编辑**
    - `documentTitle` 状态存在但不可编辑
    - 显示为 `<span>` 非 `<input>`

11. **Ghost Text 质量依赖 useGhostText hook**
    - Mock 模式下的提示是模板
    - 真实模式下走 DeepSeek 但上下文有限

---

## 我觉得不够好的地方

1. **三阶段管道 Stages 1&2 是规则引擎，不是 LLM** — 当前 Understand 和 Reason 完全靠关键词匹配和正则表达式。真正"教授级"应该是让 LLM 做这两个阶段。但目前的 mock 规则引擎已经足够支撑 MVP 的对话质量。

2. **DeepSeek 的交流风格还可以更自然** — system prompt 中有 Few-Shot 示例，但模型偶尔还是会回归"助手"格式。需要更多 Few-Shot 示例（至少 5 个）覆盖不同对话阶段。

3. **World Model 没有持久化** — 服务端 Map 存储，重启丢失。应该迁移到文件或 SQLite。

4. **没有多轮对话的上下文压缩** — Constitution 说"永不截断上下文"，但 1M token 上下文是浪费。缺少聪明的 context summarization。

5. **Write 页面 A I太被动** — Ghost 只在光标停留 800ms 后触发。没有主动的"论证检查"或"反例提示"。

6. **组件之间的数据流不清晰** — write/page.tsx 仍然是 480 行的大文件，状态管理分散。应该拆出 useWriteSession hook。

7. **没有实际的 A/B 测试或对话质量度量** — 无法量化"这一轮是否推动了认知变化"。只有 Constitution §4 的布尔检查。

---

## 开发环境

```
macOS 26.3 (Sequoia 15.3)
Node.js 22+
Python 3.9 (numpy, scikit-learn)
无 Homebrew / 无 PostgreSQL / 无 Docker
代理慢 — 不适合下载大模型
```

## 常用命令

```bash
# 启动（清理端口 + 重建）
for p in $(seq 3000 3010); do kill -9 $(lsof -ti :$p) 2>/dev/null; done
rm -rf .next && npm run dev

# 验证 mock 状态
curl -s -X POST localhost:3000/api/discover/chat \
  -H "Content-Type: application/json" \
  -d '{"anchor":"test","thinking":[],"ideas":[],"history":[]}' \
  | jq '.realLLM'

# 导入知识库到向量存储
python3 lib/ai/ingest.py --ingest

# 构建
npm run build
```

## .env.local 关键变量

```
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
NEXT_PUBLIC_MOCK_MODE=false
```
