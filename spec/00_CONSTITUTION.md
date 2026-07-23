# Sculptor Constitution v1.0

> The Engineering Standard of Cognitive Writing Runtime
>
> Think Clearly. Write Naturally. Deliver Professionally.

## Preamble

Sculptor is not a writing tool. Sculptor is not an AI chat product. Sculptor is a **Cognitive Writing Runtime** — a system that guides a human from a vague thought to a publishable work, with AI as a subordinate component, never the driver.

This Constitution defines what Sculptor IS, what it is NOT, and what must never happen. Any violation of these principles is grounds for immediate rollback.

---

## Article I: Runtime Sovereignty

**Runtime is the brain. LLM is the CPU.**

```
User → Runtime → State → Plan → LLM → Execute → Update State
```

Never:

```
User → Prompt → LLM → Reply
```

The Runtime decides what to do next. The LLM only expresses the decision. Any code path that bypasses the Runtime is forbidden.

---

## Article II: State Over History

**State is truth. History is log.**

```
State { goal, blueprint, current_step, completeness }
```

Never:

```
history = [{ user: "...", assistant: "..." }]
```

All decisions derive from State. History is for debugging only. Never pass raw chat history to the LLM — always pass structured State.

---

## Article III: Writing Over Chat

**Sculptor builds works. Not conversations.**

The product journey is:

```
Thought → Blueprint → Outline → Draft → Delivery
```

Not:

```
Chat → Chat → Chat → (maybe a draft)
```

Every interaction must advance the Blueprint. If a conversation turn does not change the Blueprint, it failed.

---

## Article IV: Delivery Over Generation

**The user's success metric is a deliverable document. Not a good AI response.**

A PDF that needs no additional editing. A Word file that meets journal formatting. A Markdown post ready to publish. If the user cannot deliver a completed work, Sculptor failed — regardless of how "natural" the AI sounded.

---

## Article V: Trust First

**Never hallucinate. Always verify.**

- Every claim that enters the user's document must have a source
- AI-generated text must be distinguishable from user-written text
- The user always has the final edit
- Confidence scores are visible, never hidden

---

## Article VI: Human First

**The human is the author. The AI is the assistant.**

- AI never writes more than the user asks for
- AI never interrupts the user's flow state
- Ghost Text is a suggestion, never a replacement
- The user's voice is preserved, never overwritten

---

## Article VII: Minimum Surface

**Show less. Do more.**

- No feature exists until it is the most important thing
- Every button, every animation, every pixel must answer: "Does this reduce the distance from thought to delivery?"
- If it doesn't, remove it

---

## Article VIII: Blueprint Before Text

**Structure precedes prose.**

```
Blueprint → Outline → Paragraph → Sentence → Word
```

Never:

```
User types → AI completes
```

The Blueprint is the source of truth. The text is a rendering of the Blueprint.

---

## Article IX: Single Source of Truth

**The Spec is law. The code is implementation.**

If the Spec and the code disagree, the Spec is correct. Fix the code.

---

## Article X: AI Subordination

**AI is a tool. Never a co-author.**

- AI cannot decide scope
- AI cannot decide structure
- AI cannot decide style
- AI cannot decide when to stop

The Runtime decides all of these. The AI executes.
