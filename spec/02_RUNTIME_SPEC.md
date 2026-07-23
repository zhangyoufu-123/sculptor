# Runtime Specification v1.0

> The Runtime is the brain of Sculptor. LLM is the CPU.
> The Runtime decides. The LLM expresses.

## 1. Runtime Architecture

```
User Input
    │
    ▼
┌─────────┐
│  Parse   │  ← Understand what user said
└────┬────┘
     ▼
┌──────────┐
│ Understand│  ← Update Blueprint state
└────┬─────┘
     ▼
┌──────────┐
│  Missing  │  ← Find the biggest gap
└────┬─────┘
     ▼
┌──────────┐
│  Think    │  ← Decide what to do next
└────┬─────┘
     ▼
┌──────────┐
│  Update   │  ← Apply changes to state
└────┬─────┘
     ▼
┌──────────┐
│  Output   │  ← Call LLM, return response
└──────────┘
```

## 2. Runtime State

```typescript
interface RuntimeState {
  goal: string;              // The user's core objective
  genre: string;             // Detected writing genre
  blueprint: BlueprintSlot[];// The growing structure
  completeness: number;      // 0-100%
  outline: string[];         // Generated outline
  outputReady: boolean;      // Can generate outline?
  round: number;             // Conversation round
  wasReset: boolean;         // Did user say "说错了"?
}

interface BlueprintSlot {
  key: string;               // Unique slot identifier
  label: string;             // Human-readable label
  value: string;             // Accumulated content
  confidence: number;        // 0-1
  status: "empty" | "filling" | "stable";
}
```

## 3. Genre → Blueprint Mapping

Each genre maps to a specific set of slots:

| Genre | Slots |
|-------|-------|
| 议论文 | 核心论点, 论证角度, 关键论据, 反方观点, 结论 |
| 散文 | 核心意象, 触发场景, 感官细节, 情感转折, 结尾感悟 |
| 小说 | 人物, 冲突, 高潮, 世界观, 结局 |
| 论文 | 研究问题, 方法, 发现, 讨论, 局限, 贡献 |
| 公众号 | 切入点, 共鸣点, 核心观点, 金句, CTA |
| ... | 18 genres total |

## 4. Confidence Scoring

```
base: 0.3
+ length > 30 chars: +0.15
+ length > 80 chars: +0.10
+ sensory details (看到/听到/闻到): +0.15
+ emotional content (开心/难过/震撼): +0.10
+ logical connectors (因为/所以/但是): +0.10
+ numeric data: +0.10
─────────────────────────
max: 1.0
```

Stable threshold: ≥ 0.70 or 3+ inputs on same slot

## 5. Gap Detection

```
1. outputReady → OUTPUT (override everything)
2. No stable slots → WELCOME
3. All stable → OUTPUT
4. Filling with conf < 0.7 → DEEPEN
5. Filling with conf ≥ 0.7 → CONFIRM
6. Empty slot exists → FILL_NEW
```

## 6. Signal Detection

| Signal | Pattern | Action |
|--------|---------|--------|
| 开始写/可以写了 | `/开始写\|写吧\|生成大纲/` | Mark all filling slots stable, trigger output |
| 说错了/不对 | `/说错了\|搞错了\|重新来/` | Reset current slot, set wasReset |
| 好了/可以了 | `/好了\|没问题\|就这样/` | Mark current slot stable |

## 7. LLM Call Contract

```
Runtime calls LLM with:
  - system: OUTPUT_PROMPT (fixed)
  - user: thought (context + task)

LLM returns: response text (≤ 150 chars standard, ≤ 300 chars output)

Constraints:
  - t=0.7 (standard), t=0.3 (output mode)
  - max_tokens=400
  - model: via deepseek client
```

## 8. Output Modes

**Standard**: Ask one question. Stay on current slot. Demand sensory/emotional detail.

**Output**: Present results. No questions. Show blueprint. Guide to outline generation.

**Welcome**: Introduce yourself. One warm sentence. Ask for initial thought.

**Reset**: Acknowledge the change. Ask for new direction. Do not apologize.
