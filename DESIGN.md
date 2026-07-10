---
version: alpha
name: Sculptor Write
description: AI writing companion — warm-tone dark theme with gold accents. Codex-inspired minimalism meets editorial gravitas.

colors:
  primary: "#1E1B1A"
  secondary: "#262220"
  tertiary: "#2E2A27"
  elevated: "#36312D"
  text-primary: "#EBE4D9"
  text-secondary: "#BFB5A4"
  text-tertiary: "#8A8074"
  gold: "#c9a95c"
  gold-hover: "#d4b86a"
  gold-active: "#b8934a"
  accent-warm: "#C49A6C"
  success: "#4CAF50"
  warning: "#e6a817"
  error: "#e05d5d"
  border: "#3D3732"
  border-light: "#2E2A27"
  ghost-text: "#8A7A6A"

typography:
  h1:
    fontFamily: "'Source Serif 4', serif"
    fontSize: 56px
    fontWeight: 200
    letterSpacing: "0.05em"
  h2:
    fontFamily: "var(--font-ui)"
    fontSize: 20px
    fontWeight: 600
  body-lg:
    fontFamily: "'Source Serif 4', serif"
    fontSize: 18px
    lineHeight: 1.8
  body-md:
    fontFamily: "'Source Serif 4', serif"
    fontSize: 14px
    lineHeight: 1.7
  ui-sm:
    fontFamily: "var(--font-ui)"
    fontSize: 11px
    fontWeight: 500
  ui-md:
    fontFamily: "var(--font-ui)"
    fontSize: 13px
    fontWeight: 500

rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 20px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px

layout:
  sidebar-left: 280px
  sidebar-right: 320px
  editor-max: 680px
  sidebar-collapsed: 48px

components:
  btn-primary:
    backgroundColor: "{colors.gold}"
    textColor: "#1E1B1A"
    rounded: "{rounded.lg}"
    padding: "14px 48px"
  btn-primary-hover:
    backgroundColor: "{colors.gold-hover}"
  btn-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    border: "1px solid {colors.border}"
  btn-icon:
    size: 36px
    rounded: "{rounded.md}"
  card-default:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border}"
  card-elevated:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border-light}"
  input-field:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  ghost-text:
    textColor: "{colors.ghost-text}"
    typography: body-md
  status-dot-active:
    backgroundColor: "{colors.success}"
    size: 8px
    rounded: "{rounded.sm}"
  status-dot-paused:
    backgroundColor: "{colors.gold}"
    size: 8px
    rounded: "{rounded.sm}"
---

## Overview

Sculptor Write is an AI-powered Chinese writing companion. The interface follows a
three-column layout: structure map (left 280px) → editor (center, max 680px) →
EchoWall companion (right 320px). All panels collapse to 48px.

**Design philosophy: Codex minimalism × editorial warmth.**
- Dark but warm — not cold black, but "warm night" (#1E1B1A)
- Gold (#c9a95c) is the sole accent color for interaction
- Typography: Source Serif 4 for reading, system sans-serif for controls
- Cards use layered elevations (primary → secondary → tertiary → elevated)
- Space follows a strict 4px grid

## Colors

- **Primary (#1E1B1A):** Warm black — page background. Like a leather-bound book.
- **Secondary (#262220):** Panel background. Slightly lighter for depth.
- **Tertiary (#2E2A27):** Input fields, active states.
- **Elevated (#36312D):** Modals, dropdowns, tooltips — highest surface.
- **Gold (#c9a95c):** The ONLY action color. Buttons, links, active states, carets.
  Never use gold for decoration — only for interaction.
- **Accent Warm (#C49A6C):** Secondary emphasis. Writing tips, micro-alerts, subtle highlights.
- **Success (#4CAF50):** Completion indicators, word count met.
- **Warning (#e6a817):** Save unsaved, logic warnings.
- **Error (#e05d5d):** Delete confirmations, critical alerts.
- **Ghost Text (#8A7A6A):** Inline AI suggestions — muted but distinguishable.

## Typography

Font stack priority:
- **Body:** Source Serif 4 → Noto Serif SC → Georgia → serif. Editor uses 18px/1.8.
- **UI:** -apple-system → PingFang SC → Microsoft YaHei → sans-serif. 11-13px for controls.
- **Mono:** JetBrains Mono → Fira Code → SF Mono. Code snippets only.

### Type Scale
- **H1:** 56px, weight 200, letter-spacing 0.05em — used ONLY for "Sculptor" title on landing
- **H2:** 20px, weight 600 — panel headers
- **Body LG:** 18px/1.8 — editor content
- **Body MD:** 14px/1.7 — reading content in cards
- **UI SM:** 11px — labels, hints, metadata
- **UI MD:** 13px — button text, node titles

## Layout & Spacing

4px grid system. All spacing must be multiples of 4.

**Three-column layout:**
```
[280px StructureMap] [flex:1 Editor max:680px] [320px EchoWall]
         ↕ collapse to 48px each
```

**Internal padding:**
- Card padding: 10-12px
- Section gaps: 8px
- Panel headers: 10px 14px
- Footer: 8px 14px

## Elevation & Depth

Flat hierarchy — no shadows for depth. Depth is communicated through background
color layering exclusively:

1. **Page bg:** `--bg-primary` (#1E1B1A)
2. **Panel bg:** `--bg-secondary` (#262220)
3. **Input/active:** `--bg-tertiary` (#2E2A27)
4. **Modal/elevated:** `--bg-elevated` (#36312D)

The only exception: gold glow (`box-shadow: 0 0 30px rgba(201,169,92,0.2)`) on
primary buttons and brand mark — used sparingly to draw attention.

## Shapes

- **Border radius:** 4px (buttons, inputs) → 8px (cards) → 10px (diagnosis card) → 12px (modals) → 20px (brand mark)
- **Borders:** 1px solid, `--border` for emphasis, `--border-light` for separation
- **Status dots:** 8px circles, gold or green with subtle glow

## Components

### btn-primary
The only high-emphasis action. Gold background, dark text. Hover: translateY(-2px)
+ increased glow shadow. Disabled: opacity 0.5, no hover. Used for: "开始写作",
"发送", "采纳".

### btn-secondary
Transparent with border. Hover: border turns gold. Used for: "忽略", "取消".

### btn-icon
36×36px transparent. Hover: bg turns tertiary. Active: scale(0.95). Used for:
collapse/expand arrows, theme switcher, close buttons.

### Card (diagnosis / inspiration)
Background: `--bg-primary`. Border: `--border`. Sections separated by
`border-top: 1px solid var(--border-light)`. Content transitions use 0.4s ease.

### Inspiration item
8px padding, 8px radius. High-priority items get a subtle gold border and
rgba(201,169,92,0.04) background. Action buttons (采纳/忽略/👍/👎) at bottom-right.

### Ghost Text
ProseMirror decoration. Color: `--ghost-text` (#8A7A6A). Appears at cursor
after 400ms pause. Tab to accept, Esc to dismiss.

### Diagnosis card sections
1. Mirror playback (📖): Source Serif 4, 12px, `--text-secondary`
2. Reader question (👁): Source Serif 4 italic, 12px, `--gold`
3. Micro alerts (⚡): System UI, 11px, `--color-accent-warm`

## Do's and Don'ts

### Do
- ✅ Use CSS variables exclusively — never hardcode hex values
- ✅ Gold (#c9a95c) only for interactive elements
- ✅ Source Serif 4 for all reading/editor content
- ✅ Background layering for depth, not shadows
- ✅ 4px grid for all spacing
- ✅ Smooth transitions (0.15s-0.4s ease) on all state changes

### Don't
- ❌ No blue, purple, or other accent colors — only gold and warm tones
- ❌ No box shadows for depth (except gold glow)
- ❌ No rounded corners below 4px or above 20px
- ❌ No font sizes between 11-13px for UI (use 11 or 13, not 12)
- ❌ No hardcoded rgba values — use CSS variables
- ❌ No `!important` overrides
