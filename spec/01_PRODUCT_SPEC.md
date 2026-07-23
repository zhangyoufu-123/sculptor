# Product Specification v1.0

## 1. Product Journey

```
Home → Thinking → Blueprint → Writing → Delivery
```

### Home
- Single input: "今天想写什么？"
- 6 example topics as quick-start pills
- Previous session card (if exists)
- "开始思考 →" button

### Thinking (Discover)
- Left (60%): AI discussion panel
- Right (40%): Blueprint progress panel
- Blueprint shows: slot list with ✓/●/○ status
- Progress bar (gold, animated, 0-100%)
- "生成大纲 ✨" button when blueprint complete

### Blueprint → Outline
- Blueprint compiles into structured outline
- Each slot becomes an outline node
- User can rearrange/edit before entering writing

### Writing (Write)
- TipTap editor with Ghost Text
- Ghost suggests structure, not sentences
- Blueprint visible as reference panel

### Delivery
- Export: Word, PDF, Markdown, LaTeX
- Verification: citation check, formatting check
- Final review before delivery

## 2. Page Specifications

### Home Page

```
Desktop: 1440px
Header: 64px
Hero: 520px
Gap: 48px
Input: 760px wide, 18px radius
Placeholder: "今天想写什么？"
Example pills: 6 topics below input
```

### Discover Page

```
Desktop: 1440px
Left panel: 60% width (discussion)
Right panel: 40% width (blueprint)
Top bar: 48px
Progress bar: horizontal pill-style
Input: full width, 12px padding, 8px radius
Buttons: gold (#c9a95c) background, white text
```

### Write Page

```
Desktop: 1440px
Editor: 75% width
Reference panel: 25% width
Ghost text: inline, gray, 0.4 opacity
Font: Georgia or Source Serif 4
```

## 3. Design Tokens

```
Colors:
  bg-primary: #faf8f5 (warm white)
  bg-panel: #ffffff
  gold: #c9a95c
  text-primary: #2c2416
  text-secondary: #6b5e4a
  border: #e8e0d5

Typography:
  font-body: Georgia, Source Serif 4
  font-ui: system-ui, -apple-system
  size-xl: 28px
  size-lg: 20px
  size-md: 16px
  size-sm: 14px
  size-xs: 12px

Radius:
  button: 8px
  card: 12px
  input: 8px
  pill: 99px

Animation:
  hover: 150ms ease-out
  progress: 500ms ease-out
  fade: 300ms ease-out
```

## 4. Interaction Patterns

### Input
- Enter: submit answer
- Shift+Enter: newline

### Ghost Text
- Appears at 800ms pause
- Tab: accept suggestion
- Escape: dismiss

### Node Interaction
- Click: expand
- Right-click: context menu (confirm/challenge/branch)
- Drag: reorder

### Commands
- ⌘K: command palette
- Space: add node (in canvas)

## 5. Acceptance Criteria

| Metric | Target |
|--------|--------|
| First impression understanding | ≤ 15 seconds |
| "AI understands me" after round 1 | ≥ 80% |
| Blueprint completeness | ≥ 90% |
| Export requires no manual editing | Yes |
| Time to first deliverable | ≤ 30 minutes |
