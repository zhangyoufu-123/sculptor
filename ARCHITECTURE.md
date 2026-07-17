# Sculptor v1.0 — Enterprise Architecture

## 1. System Overview

Sculptor is a Cognitive Operating System that helps users grow a vague thought into a finished work through a six-phase pipeline: Capture → Mentor → Insight → Outline → Writing → Reflection. The system is built on a Goal-Driven Cognitive Runtime that replaces traditional LLM chat with a state machine architecture.

```
                    User Browser
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         /discover    /write     /reflect
         (Map+Chat)   (Editor)   (Retrospect)
              │          │          │
              └──────────┼──────────┘
                         │
              ┌──────────▼──────────┐
              │    ContextBar       │  ← Global state (Zustand)
              │  Proposition/Assumptions/Progress │
              └─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   API Layer         │
              │  /api/discover/chat │
              │  /api/discover/outline│
              │  /api/chat          │
              │  /api/reflect       │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  Cognitive Runtime  │
              │  Goal→Move→Primitive│
              │  + Few-Shot + ColdStart│
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  DeepSeek v4-pro    │
              │  (Expression only)  │
              └─────────────────────┘
```

## 2. Module Boundaries & Contracts

### 2.1 Frontend Modules

| Module | Path | Responsibility | Boundary |
|--------|------|---------------|----------|
| Life Dashboard | `app/page.tsx` | Entry point, anchor input | localStorage: `sculptor-anchor` |
| Mentor Session | `app/discover/page.tsx` | Dual mode: ThinkingMap + Text Chat | API: `POST /api/discover/chat` |
| Thinking Map | `components/ThinkingMap.tsx` | React Flow visual canvas | Read: Zustand `useStore()` |
| Craft Editor | `app/write/page.tsx` | TipTap editor + Ghost | API: `POST /api/chat` |
| Reflection | `app/reflect/page.tsx` | Post-writing retrospect | localStorage: `sculptor-last-content` |
| ContextBar | `components/ContextBar.tsx` | Global thinking dashboard | Read/Write: Zustand `useStore()` |
| ParagraphCards | `components/ParagraphCards.tsx` | Structure node display | State: props from write page |
| CommandPalette | `components/CommandPalette.tsx` | Global ⌘K commands | Event: keyboard handler |

**Interface Contract**:
- ContextBar reads `useStore()` — never writes directly to pages
- Discover page writes `mentorResponse` to local state, syncs proposition to `useStore()`
- Write page reads outline from localStorage, syncs title to `useStore().proposition`

### 2.2 API Contracts

| Endpoint | Method | Input | Output | Auth |
|----------|--------|-------|--------|------|
| `/api/discover/chat` | POST | `{anchor, thinking[], ideas[], history[], state?}` | `{response, state, goalAchieved, move, coldStart}` | None (MVP) |
| `/api/discover/outline` | POST | `{anchor, thinking, ideas}` | `{outline: [{level, title, notes}]}` | None |
| `/api/chat` | POST | `{text, intent, documentId}` | SSE stream | None |
| `/api/reflect` | POST | `{anchor, content, outline}` | `{questionEvolution, patterns}` | None |

**Error Contract**: All endpoints return `{response: "fallback message", phase: "warmup"}` on error. Status codes: 200 (success), 500 (internal).

### 2.3 AI Runtime Modules

| Module | Path | Responsibility | Dependency |
|--------|------|---------------|------------|
| Cognitive Runtime | `lib/ai/cognitive-runtime.ts` | Goal→Move→Primitive state machine | moves, primitives, goal-builder |
| Moves | `lib/ai/moves.ts` | 8 Move definitions + selector | runtime-state |
| Primitives | `lib/ai/primitives.ts` | 11 Primitive executors + LLM call | deepseek, few-shots |
| Goal Builder | `lib/ai/goal-builder.ts` | Goal inference + cold start + reframe | deepseek |
| Few-Shots | `lib/ai/few-shots.ts` | 24 examples across 18 genres | — |
| Semantic Grounding | `lib/ai/semantic-grounding.ts` | SPO extraction + forbidden context | — |
| Blueprint Types | `lib/ai/blueprint-types.ts` | ArticleBlueprint + 8 structures + 6 review dims | — |
| Blueprint Builder | `lib/ai/blueprint-builder.ts` | Blueprint accumulation + outline gen | blueprint-types, reviewer |
| Reviewer | `lib/ai/reviewer.ts` | 6-dimension review + peer perspectives | blueprint-types |
| Mentor LLM | `lib/ai/mentor-llm.ts` | Free-form response (mock fallback) | world-model |
| World Model | `lib/ai/world-model.ts` | Session cognitive state | — |
| Discipline Router | `lib/ai/discipline-router.ts` | 8 discipline contexts | — |
| Knowledge Hub | `lib/ai/knowledge-hub.ts` | 8 domains, 43 evidence items | — |
| Verifier | `lib/ai/verifier.ts` | Fact/inference/uncertain classification | — |
| Vector Store | `lib/ai/vector_store.py` | TF-IDF search (40 items) | numpy |
| Mock Responses | `lib/ai/mock-responses.ts` | `isMockMode()` gate | — |

**Contract**: `runCognitiveStep(input, state) → {response, newState, goalAchieved, move, coldStart}`

### 2.4 State Management

```
Zustand (lib/store.ts)
├── useUIStore — Editor state (selectedText, writingState, suggestions)
└── useStore   — Context state (proposition, assumptions, progress, evidenceCount, position)

localStorage
├── sculptor-anchor         — Capture text
├── sculptor-ideas           — Ideas array
├── sculptor-discover-outline — Generated outline
├── sculptor-last-content    — Last editor content
├── sculptor-thinking-memory — {rules, patterns}
└── sculptor-focus-tip       — Focus mode flag
```

## 3. Data Flow

### 3.1 Discovery Flow
```
User enters anchor on / → localStorage: sculptor-anchor
  → /discover loads anchor → POST /api/discover/chat
    → Cognitive Runtime: Goal → Move → Primitive → DeepSeek
      → Response + ColdStart returned
        → ContextBar updates proposition + assumptions
        → ThinkingMap renders nodes
        → Chat view shows response text
  → User confirms direction → POST again with thinking[]
    → Move advances (UNDERSTAND→EXPLORE→CHALLENGE→...)
      → Goal distance decreases
        → Outline suggested when completeness > 80%
```

### 3.2 Writing Flow
```
Outline from discover → localStorage: sculptor-discover-outline
  → /write loads outline → ParagraphCards rendered
    → User types in TipTap → Ghost triggered at 800ms pause
      → POST /api/chat → SSE stream of suggestions
        → Ghost candidates appear inline
```

### 3.3 Reflection Flow
```
User clicks "完成" → /write saves content to localStorage
  → /reflect loads content → POST /api/reflect
    → Returns questionEvolution + patterns
```

## 4. Security Boundaries

### 4.1 Input Validation
- All API inputs typed via TypeScript interfaces — no implicit `any`
- `anchor` trimmed and sanitized: `.replace(/[<>]/g, "")` — prevents XSS in ContextBar display
- `history` array validated: only `{role, content}` allowed
- Round count capped at `history.filter(m => m.role === "user").length` — can't be forged

### 4.2 API Security
- `maxDuration: 60` — prevents runaway DeepSeek calls
- Error catch returns generic message — no stack traces leaked
- `.env.local` is gitignored — API keys never committed
- `isMockMode()` gate prevents real API calls when disabled

### 4.3 Frontend Security
- React auto-escapes JSX — XSS prevention
- Zustand store only accessible client-side
- No `dangerouslySetInnerHTML` except in layout.tsx theme script

### 4.4 Dependency Scanning
- `npm audit` run on install — reactflow has 0 critical vulnerabilities
- All Python deps (numpy) are pinned

## 5. Performance & Scalability

### 5.1 Current State
- Single-user MVP, no database, no horizontal scaling
- All state in-memory (Cognitive Runtime Map) + localStorage
- DeepSeek latency: ~2-8s per call (acceptable for MVP)
- React Flow: <50 nodes renders at 60fps

### 5.2 Future Scalability
- Replace in-memory WorldModel Map with SQLite/PostgreSQL
- Add WebSocket for real-time ContextBar updates across pages
- Redis for session caching if multi-instance needed
- Evaluate DeepSeek latency optimization (streaming, caching)

## 6. Deployment

### 6.1 Vercel (Current)
```
vercel.json: framework=nextjs, region=hkg1
Auto-deploy on push to main
Environment: DEEPSEEK_API_KEY, NEXT_PUBLIC_MOCK_MODE
```

### 6.2 Production Checklist
- [x] API keys in environment, not code
- [x] Error boundaries on all pages (ErrorBoundary component)
- [x] No hardcoded URLs (all via env or relative)
- [ ] Rate limiting on API routes (not implemented — single user)
- [ ] Monitoring/alerting (not implemented)
- [ ] CI/CD with automated tests (not implemented)

## 7. Technical Debt & Refactoring Plan

### 7.1 Immediate (this sprint)
- [ ] Remove remaining `any` casts in discover/page.tsx (line 42: `as any` for world)
- [ ] Deduplicate CSS styles in discover page (900+ lines of inline styles)
- [ ] Extract useDiscoverySession hook from discover page

### 7.2 Short-term (next 2 sprints)
- [ ] React Flow node interactions → trigger CLI commands
- [ ] Ghost Text real-time feedback on write page
- [ ] ContextBar progress synced with actual Runtime completeness
- [ ] Write page: title input editable (currently static span)

### 7.3 Medium-term
- [ ] Multi-session persistence (SQLite)
- [ ] WebSocket for real-time ContextBar sync
- [ ] Full test suite (unit + E2E with Playwright)
- [ ] Memory module: store user patterns across sessions
