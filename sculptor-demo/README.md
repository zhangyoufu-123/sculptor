# Sculptor — Adversarial Reading Engine

Analyze any article (URL or paste) to surface core claims, supporting arguments, counterarguments, hidden assumptions, decision risks, and a verdict score. Built for the hackathon demo — simplicity and visual impact first.

## Core Innovation: Self-Refine Agent Loop

Sculptor does NOT use a single AI call. It runs a **5-step agent loop** that mimics adversarial peer review:

1. **PERCEIVE** — Extract & normalize article text (Jina Reader → Cheerio fallback)
2. **ANALYZE** — Extract core claim, arguments, assumptions
3. **CRITIQUE** — The AI reviews its own output for logical gaps & missing evidence
4. **REFINE** — Fix the output based on the critique
5. **OUTPUT** — Return full trace (initial → critique → final)

This self-healing architecture prevents hallucinations and strengthens reasoning before the user sees results.

## Tech Stack

| Layer     | Choice                    |
| --------- | ------------------------- |
| Frontend  | Next.js 14 (App Router)   |
| Styling   | Tailwind CSS              |
| AI        | DeepSeek (OpenAI-compat)  |
| Parser    | Jina Reader + Cheerio     |
| Database  | Supabase PostgreSQL       |
| Deploy    | Vercel                    |

## Getting Started

### 1. Clone and install

```bash
cd sculptor-demo
npm install
```

### 2. Environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable                       | Required | Description                             |
| ------------------------------ | -------- | --------------------------------------- |
| `DEEPSEEK_API_KEY`             | Yes      | Your DeepSeek API key                   |
| `DEEPSEEK_BASE_URL`            | No       | Defaults to `https://api.deepseek.com`  |
| `NEXT_PUBLIC_SUPABASE_URL`     | No*      | Supabase project URL                    |
| `SUPABASE_SERVICE_ROLE_KEY`    | No*      | Supabase service role key               |
| `NEXT_PUBLIC_MOCK_MODE`        | No       | Set `true` to skip AI calls (demo)      |

\* Supabase is optional. The app works without it — results just won't be persisted.

### 3. Supabase (optional)

If you want persistence, run `supabase-schema.sql` in your Supabase SQL Editor.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

### POST /api/analyze

**Request:**

```json
{ "url": "https://example.com/article" }
```

or

```json
{ "text": "Paste full article text here..." }
```

**Response (full agent trace):**

```json
{
  "initial": {
    "core_claim": "string",
    "arguments": ["string"],
    "assumptions": ["string"]
  },
  "critique": {
    "logical_issues": ["string"],
    "missing_evidence": ["string"],
    "confidence": 0-100
  },
  "final": {
    "core_claim": "string",
    "bull_case": ["string"],
    "bear_case": ["string"],
    "hidden_assumptions": ["string"],
    "decision_risks": ["string"],
    "verdict": { "score": 0-100, "label": "Strong|Medium|Weak" }
  }
}
```

## UI Columns

| Column | Content |
|--------|---------|
| Left   | URL / text input form |
| Middle | Final analysis with expandable agent self-critique toggle |
| Right  | Verdict score (color-coded), hidden assumptions, decision risks |

## Deployment (Vercel)

1. Push to GitHub.
2. Import repo in Vercel.
3. Add environment variables in Vercel dashboard.
4. Deploy — zero config.

**Function timeout:** The API route has `maxDuration = 60` (Vercel Pro/Hobby). The agent loop makes 3 AI calls (~15-30s total). This is safe within the 60s limit.

**Mock mode:** Set `NEXT_PUBLIC_MOCK_MODE=true` to demo without an API key.

## Project Structure

```
sculptor-demo/
├── app/
│   ├── api/analyze/route.ts   # POST /api/analyze endpoint
│   ├── globals.css             # Tailwind imports + scrollbar
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main 3-column page
├── components/
│   ├── InputPanel.tsx          # URL + text input form
│   ├── AnalysisPanel.tsx       # Final analysis + critique toggle
│   └── RiskPanel.tsx           # Verdict score + risks
├── lib/
│   ├── deepseek.ts             # 5-step agent loop (3 AI calls)
│   ├── mock-data.ts            # Fallback full trace for demo
│   ├── parser.ts               # Jina Reader + Cheerio extraction
│   ├── prompts.ts              # 3 prompts: ANALYZE, CRITIQUE, REFINE
│   └── supabase.ts             # Supabase client + save helper
├── types/
│   └── analysis.ts             # AgentTrace, InitialAnalysis, Critique, etc.
├── public/
├── .env.local.example
├── supabase-schema.sql
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## License

MIT
