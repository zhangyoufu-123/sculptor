# AI Execution Specification v1.0

> **This document is NOT for humans. It is for AI developers (Claude Code, Hermes, Cursor).**
>
> Do not interpret. Do not guess. Do not optimize.
>
> Execute exactly as specified. Any deviation is a violation.

---

## Rule 001: No Unspecified Features

Any feature not defined in the `/spec` directory is forbidden. If a requirement is missing, stop development and output:

```
[NEED CLARIFICATION] <missing requirement>
```

Never guess. Never assume.

---

## Rule 002: No UI Design Freedom

AI cannot design UI. AI cannot add buttons. AI cannot add animations. AI cannot add pages. All UI must follow `03_FRONTEND_SPEC.md` exactly.

---

## Rule 003: No Layout Modifications

```
Layout is 100% from UI Specification
Padding, Margin, Gap, Radius, Shadow — all from Design Tokens
No inline values allowed
```

---

## Rule 004: No Component Duplication

Every component must come from the shared component library. No page may define its own Button, Input, Card, etc.

```
import { Button } from "@/components/ui/button"  // ✓
<button style={{...}}>                           // ✗
```

---

## Rule 005: No Hardcoded Colors

All colors come from Design Tokens. Hex codes, rgb(), rgba() are forbidden in components.

```
color: "var(--color-brand-500)"  // ✓
color: "#c9a95c"                 // ✗
```

---

## Rule 006: No Unauthorized APIs

All APIs must be defined in the API specification. New endpoints require specification update first.

```
POST /api/discover/chat   // ✓
POST /api/test             // ✗
```

---

## Rule 007: No Direct Database Access

```
Page → API → Runtime → Service → Repository → Database
```

No layer skipping.

---

## Rule 008: Runtime Exclusivity

All LLM calls go through the Runtime. Direct LLM calls are forbidden.

```
runtime.execute(state)    // ✓
llm.chat(prompt)          // ✗
```

---

## Rule 009: Prompts in Files

All prompts live in `/prompts`. No prompt strings in components or API routes.

```
import { THINK_PROMPT } from "@/prompts/think"  // ✓
const prompt = "You are..."                      // ✗
```

---

## Rule 010: Models via Adapter

No hardcoded model names. All via ModelAdapter.

```
import { getModel } from "@/lib/adapter"  // ✓
model: "deepseek-v4-pro"                 // ✗
```

---

## Rule 011: Business State in Runtime

No useState for business state. UI state (modal open, hover) is acceptable.

```
const { blueprint } = useRuntime()  // ✓
const [title, setTitle] = useState() // ✗ (business state)
const [isOpen, setIsOpen] = useState() // ✓ (UI state)
```

---

## Rule 012: No Directory Changes

AI cannot create new top-level directories. All directories are defined in the Engineering Spec.

---

## Rule 013: Loop Development Only

```
Read Spec → Plan → Get Approval → Code → Test → Review → Report
```

No step may be skipped.

---

## Rule 014: Commit Discipline

One feature per commit. Semantic commit messages.

```
feat(runtime): add parse step    // ✓
update code                      // ✗
```

---

## Rule 015: Impact Statement Required

Before any code change, output:

```
AFFECTED FILES: <list>
NEW FILES: <list>
DELETED FILES: <list>
BREAKING CHANGES: <list>
MIGRATION: <required/not-required>
ROLLBACK: <steps>
```

---

## Rule 016: Development Order

```
Skeleton → Layout → Interaction → Animation → Runtime → Testing
```

No jumping to business logic before layout is established.

---

## Rule 017: Component Completeness

Every component must include:

```
[ ] Props definition
[ ] Event handlers
[ ] Loading state
[ ] Error state
[ ] Empty state
[ ] Disabled state
[ ] Accessibility (ARIA labels)
[ ] Test IDs
```

Missing any = cannot merge.

---

## Rule 018: API Completeness

Every API endpoint must include:

```
[ ] Request schema
[ ] Response schema
[ ] Error schema
[ ] Retry strategy
[ ] Timeout limit
[ ] Rate limit
```

---

## Rule 019: Runtime Completeness

Every Runtime function must include:

```
[ ] Input type
[ ] Output type
[ ] State modification
[ ] Action description
[ ] Event trigger
[ ] Memory impact
[ ] Recovery procedure
```

---

## Rule 020: No Optimization Without Permission

AI cannot refactor, optimize, or "improve" code without explicit instruction. The Spec defines what to build. Build exactly that.
