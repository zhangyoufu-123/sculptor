# Sculptor v2 — AI Writing & Adversarial Reading Engine

Sculptor is a dual-mode AI-powered tool: **Write** (AI-assisted writing with style control) and **Analyze** (adversarial reading engine that critiques articles).

## Modes

### ✏️ Write Mode
AI writing assistant inside a TipTap rich text editor. Select text → choose intent (rewrite/continue/explain) → get 3 AI-generated alternatives with style control.

- **Rewrite** — rephrase selected text in your chosen style
- **Continue** — extend from cursor with matching tone
- **Explain** — simplify selected text

Style controls: tone, density, sentence rhythm, punctuation, imagery vocabulary.

### 🔍 Analyze Mode
5-step self-refine agent loop that critically analyzes any article:

1. **PERCEIVE** — Extract text (Jina Reader URL → Cheerio fallback)
2. **ANALYZE** — Core claim, arguments, assumptions
3. **CRITIQUE** — AI self-reviews for logical gaps & missing evidence
4. **REFINE** — Fix output based on critique
5. **OUTPUT** — Full trace (initial → critique → final) + verdict score

Output: core claim, bull/bear case, hidden assumptions, decision risks, verdict (0-100).

## Tech Stack

| Layer     | Choice                    |
| --------- | ------------------------- |
| Frontend  | Next.js 14 (App Router)   |
| Editor    | TipTap (ProseMirror)      |
| State     | Zustand                   |
| Styling   | Tailwind CSS              |
| AI        | DeepSeek (OpenAI-compat)  |
| Parser    | Jina Reader + Cheerio     |
| Database  | Supabase PostgreSQL       |
| Deploy    | Vercel                    |

## Quick Start

```bash
cd sculptor-write
npm install
cp .env.local.example .env.local
# Edit .env.local with your DeepSeek API key
npm run dev
```

Open http://localhost:3000. Toggle between ✏️ Write and 🔍 Analyze in the top bar.

### Mock Mode

Set `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local` to demo without an API key. Both Write and Analyze modes return realistic mock data.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes (non-mock) | DeepSeek API key |
| `DEEPSEEK_BASE_URL` | No | Defaults to `https://api.deepseek.com` |
| `NEXT_PUBLIC_MOCK_MODE` | No | Set `true` to skip AI calls |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |

## API

### POST /api/analyze

Analyze an article through the 5-step agent loop.

**Request:** `{ "url": "https://..." }` or `{ "text": "..." }`

**Response (AgentTrace):**
```json
{
  "initial": { "core_claim": "...", "arguments": [...], "assumptions": [...] },
  "critique": { "logical_issues": [...], "missing_evidence": [...], "confidence": 65 },
  "final": {
    "core_claim": "...",
    "bull_case": [...], "bear_case": [...],
    "hidden_assumptions": [...], "decision_risks": [...],
    "verdict": { "score": 68, "label": "Medium" }
  }
}
```

### POST /api/write/suggest

Stream AI writing suggestions via SSE.

**Request:** `{ "selectedText": "...", "intent": "rewrite|continue|explain", "style": {...} }`

**Response:** SSE stream with `{ type: "option", index, text, styleShift }` events.

## Project Structure

```
sculptor-write/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts     # 5-step agent loop
│   │   └── write/suggest/route.ts  # SSE writing suggestions
│   ├── page.tsx                 # Dual-mode main page
│   ├── layout.tsx               # Root layout + ErrorBoundary
│   └── globals.css
├── components/
│   ├── ErrorBoundary.tsx        # React error boundary
│   ├── TopBar.tsx               # Mode switch + style panel
│   ├── EditorCanvas.tsx         # TipTap editor (Write mode)
│   ├── AIBubble.tsx             # Floating AI action button
│   ├── SuggestionPreview.tsx    # AI suggestion cards
│   ├── InputPanel.tsx           # URL/text input (Analyze mode)
│   ├── AnalysisPanel.tsx        # 3-tab analysis display
│   └── VerdictCard.tsx          # Score + risks display
├── lib/
│   ├── deepseek.ts              # analyze/critique/refine helpers
│   ├── parser.ts                # Jina Reader + Cheerio
│   ├── store.ts                 # Zustand UI state
│   └── ai/
│       ├── promptBuilder.ts     # System prompt builder
│       ├── styleEngine.ts       # Style → natural language
│       └── intentParser.ts      # Intent → instructions
└── types/
    ├── analysis.ts              # AgentTrace types
    └── editor.ts                # Style, Intent, StreamEvent types
```

## Engineering

- **Race condition protection**: AbortController cancels stale requests
- **45s timeout**: Requests auto-abort, no infinite waits
- **ErrorBoundary**: Catches render errors, prevents whitescreen
- **Defensive parsing**: All AI JSON responses validated with fallbacks
- **Mock mode**: Full realistic responses for demo/testing

## License

MIT
