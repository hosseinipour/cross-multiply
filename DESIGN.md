---
name: Cross Multiply
description: A tactile multiply-first puzzle system for quick, cozy logic breaks.
colors:
  app-bg: "oklch(96% 0.025 191)"
  panel-bg: "color-mix(in oklch, var(--surface) 88%, oklch(92% 0.055 180))"
  panel-muted: "color-mix(in oklch, var(--surface) 72%, oklch(88% 0.07 175))"
  panel-border: "color-mix(in oklch, var(--border) 72%, oklch(72% 0.06 185))"
  board-shell: "color-mix(in oklch, var(--surface) 82%, oklch(88% 0.075 185))"
  cell-bg: "oklch(99% 0.012 172)"
  cell-hover: "oklch(95% 0.035 170)"
  cell-border: "oklch(82% 0.045 180)"
  cell-highlight: "linear-gradient(180deg, oklch(72% 0.14 169) 0%, oklch(58% 0.14 174) 100%)"
  cell-highlight-text: "oklch(18% 0.035 185)"
  target-bg: "oklch(97% 0.028 92)"
  target-border: "oklch(83% 0.08 92)"
  accent: "oklch(56% 0.12 170)"
  accent-strong: "oklch(43% 0.12 172)"
  accent-soft: "oklch(91% 0.065 170)"
  accent-pop: "oklch(69% 0.17 45)"
  berry: "oklch(61% 0.18 346)"
  lemon: "oklch(86% 0.14 92)"
  sky: "oklch(72% 0.13 225)"
  success: "oklch(60% 0.13 153)"
  danger: "oklch(60% 0.18 24)"
  text-primary: "var(--fg)"
  text-secondary: "oklch(38% 0.028 235)"
  text-muted: "var(--muted)"
  text-faint: "oklch(62% 0.022 235)"
typography:
  display:
    fontFamily: "'Sohne', 'Avenir Next', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "normal"
  headline:
    fontFamily: "'Trebuchet MS', 'Avenir Next', var(--font-display)"
    fontSize: "clamp(1.2rem, 3vw, 2rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "var(--font-body)"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-body)"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-body)"
    fontSize: "0.75rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0.18em"
rounded:
  xs: "999px"
  sm: "1rem"
  md: "1.2rem"
  lg: "1.75rem"
  xl: "2rem"
spacing:
  xs: "0.375rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.cell-highlight-text}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  button-ghost:
    backgroundColor: "{colors.panel-muted}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xs}"
    padding: "0.75rem"
  tool-button-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "0.75rem"
  puzzle-cell:
    backgroundColor: "{colors.cell-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    size: "aspect-square"
  target-badge:
    backgroundColor: "{colors.target-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    size: "aspect-square"
---

# Design System: Cross Multiply

## 1. Overview

**Creative North Star: "The Pocket Puzzle Table"**

Cross Multiply should feel like a small, well-made puzzle table that fits in a quick break. The surface is warm, tactile, and compact: the board is the object, and every surrounding system exists to help a player make the next confident mark.

The design uses softly tinted cyan-green neutrals, pill-sized status objects, chunky numeric cells, and restrained celebratory color. It is not a classroom worksheet and it is not a casino reward machine. It should reward quiet mastery: useful feedback, short copy, forgiving tap targets, and enough playfulness to make multiplication feel like puzzle material.

The visual system explicitly rejects the PRODUCT.md anti-references: school worksheet energy, casino or mobile-game grind patterns, sterile math-tool minimalism, neon arcade styling, and corporate SaaS conventions.

**Key Characteristics:**

- Board-first hierarchy, with progression systems visually secondary.
- Tactile cells that depress, lift, lock, hide, and resolve through state.
- OKLCH colors tuned for light and dark modes, never pure black or pure white as the visible default.
- Dense but friendly controls for quick mobile sessions.
- State copy that should be short, plain, and encouraging.

## 2. Colors

The palette is a restrained aqua table with warm yellow rewards, berry mystery states, and sky-blue teaching states.

### Primary

- **Table Teal** (`accent`): The primary action and selected-state color. Use it for the current mode, selected cells, progress fill, and main dialog actions.
- **Deep Table Teal** (`accent-strong`): The label and secondary emphasis color for active system language.
- **Soft Table Wash** (`accent-soft`): The selected background for active tools, current bands, and small status emphasis.

### Secondary

- **Warm Lemon Reward** (`lemon`): Use for stars, difficulty badges, locked-cell tags, and hint gates. It means reward or temporary attention, not general decoration.
- **Berry Mystery** (`berry`): Use for cloaked, blind, and hidden information states.
- **Sky Rule** (`sky`): Use for teaching tips, seals, and temporary constraint explanations.

### Tertiary

- **Clean Solve Green** (`success`): Use only for completed missions, solved dialogs, and confirmed success states.
- **Soft Mistake Red** (`danger`): Use only for heart loss, wrong flashes, and blocked recovery moments.
- **Amber Pop** (`accent-pop`): Use only as the hint-count badge or another tiny count marker.

### Neutral

- **Breathing App Aqua** (`app-bg`): The outer page background and theme anchor.
- **Quiet Panel** (`panel-bg`): The default surface for buttons, cards, dialogs, and panels.
- **Muted Panel** (`panel-muted`): The second neutral layer for grouped controls and side panels.
- **Board Shell** (`board-shell`): The framed surface directly behind the board.
- **Cell Paper** (`cell-bg`): The resting state for playable cells.
- **Target Paper** (`target-bg`): The resting state for row and column products.
- **Primary Text** (`text-primary`): Main text and numbers.
- **Secondary Text** (`text-secondary`): Supporting copy, descriptions, and lower-priority labels.
- **Muted Text** (`text-muted`): Section labels and compact metadata.
- **Faint Text** (`text-faint`): Disabled or resolved state text.

### Named Rules

**The Board Owns Color Rule.** Saturated color belongs first to the board and live puzzle state. Progression, missions, and chapter admin must stay softer than the cells.

**The No Pure Black Overlay Rule.** Modal overlays must stay tinted toward the app background. Use the existing `oklch(15% 0.02 230 / 0.5)` approach or a warmer equivalent, never `#000` or plain `black`.

**The Reward Is Rare Rule.** Lemon, berry, sky, success, and danger are state colors. They must not become broad decorative backgrounds.

## 3. Typography

**Display Font:** `Sohne`, `Avenir Next`, system UI fallback
**Body Font:** system UI with `SF Pro Text` fallback
**Label/Mono Font:** no mono; numeric puzzle objects use `Trebuchet MS`, `Avenir Next`, and the display stack with tabular numbers.

**Character:** The type is product-native and sturdy. Labels are compact and uppercase; puzzle numbers are heavy, tabular, and almost tile-like.

### Hierarchy

- **Display** (900, `3rem` to `3.75rem`, 1 line-height): Level title and major result titles only.
- **Headline** (900, `clamp(1.2rem, 3vw, 2rem)`, 1 line-height): Board numbers, target values, and result metrics.
- **Title** (700-900, `0.875rem` to `1rem`, 1.25 line-height): Card headings, mission names, modifier titles, and tool labels.
- **Body** (400-500, `0.875rem`, 1.45 line-height): Modifier descriptions, result descriptions, and supporting copy. Keep prose under 75ch.
- **Label** (800-900, `0.7rem` to `0.75rem`, `0.18em` to `0.36em` tracking, uppercase): Section labels, status chips, and compact metadata.

### Named Rules

**The Numbers Are Objects Rule.** Board values, targets, levels, and progress counts use the `game-number` treatment with tabular figures. Do not set puzzle numbers in the normal body stack.

**The Label Density Rule.** Uppercase labels are allowed because the interface is compact, but they must stay short. If a label wraps awkwardly, rewrite it before shrinking it.

## 4. Elevation

Cross Multiply uses a hybrid of tonal layering, inset pressure, and soft ambient shadows. Resting surfaces are not flat, but the depth should feel like physical game pieces, not floating SaaS cards. Cells and buttons use inset bottom shadows to imply pressable material; dialogs and board shells use larger ambient shadows to separate moments of focus.

### Shadow Vocabulary

- **Soft Lift** (`0 9px 18px var(--shadow-soft)`): Resting playable cells and small active objects.
- **Board Lift** (`0 20px 44px var(--shadow-board)`): The board shell and large framed puzzle surface.
- **Dialog Lift** (`0 24px 80px var(--shadow-board)`): Result, unlock, and failure dialogs.
- **Inset Press** (`inset 0 -2px 0 color-mix(in oklch, var(--panel-border) 45%, transparent)`): Neutral buttons and panels.
- **Selected Press** (`inset 0 -5px 0 color-mix(in oklch, var(--accent-strong) 42%, transparent)`): Selected cells only.

### Named Rules

**The Pressable Depth Rule.** If a control can be tapped repeatedly, it may use an inset bottom shadow. If it is just information, prefer tonal contrast and border over lift.

**The Dialogs Are Moments Rule.** Large ambient shadows are reserved for dialogs and the board shell. Repeated side-panel cards should not compete with the board.

## 5. Components

### Buttons

- **Shape:** Compact buttons use circular or softly rounded geometry (`999px` for icon buttons, `1rem` to `1.25rem` for action buttons).
- **Primary:** Table Teal background with selected-cell text, heavy label, and soft glow. Use for "New board", "Next level", and single-confirm actions.
- **Hover / Focus:** Hover lifts by `translateY(-0.125rem)` and shifts border or background toward the accent. Focus must keep a visible ring or high-contrast outline.
- **Secondary / Ghost / Tertiary:** Neutral panel backgrounds, panel borders, inset press shadows, and primary text. Use these for retry, reroll, theme, and utility actions.

### Chips

- **Style:** Rounded full pills, compact horizontal padding, strong uppercase labels, icon plus text when the state is not obvious.
- **State:** Neutral chips report counts; lemon chips gate hints or attention; berry chips hide information; sky chips teach constraints; danger chips warn.

### Cards / Containers

- **Corner Style:** Main surfaces use generous rounded corners (`1.75rem` to `2rem`), while inner cards use tighter rounded corners (`1.1rem` to `1.2rem`).
- **Background:** Board and dialog surfaces use the shared `puzzle-surface` and `dialog-surface` treatments. Side panels use `panel-muted`; nested information tiles use `panel-bg`.
- **Shadow Strategy:** Board shells and dialogs get ambient lift. Inner cards get inset press shadows only.
- **Border:** Use `panel-border` consistently. Avoid colored side stripes.
- **Internal Padding:** Side panels use `1rem`; dialogs use `1.5rem`; board shells use `0.5rem` on mobile and `1rem` to `1.5rem` above small screens.

### Inputs / Fields

There are no text fields in the current game surface. If inputs are added later, use the button vocabulary: `panel-bg`, `panel-border`, `1rem` radius, visible focus, and no placeholder-only labels.

### Navigation

Navigation is game-state navigation, not site navigation. Difficulty is a horizontal scroll rail of compact chapter cards; utility actions are icon buttons. On mobile, keep the current tool and board-adjacent controls near the board or bottom thumb zone.

### Puzzle Cell

The puzzle cell is the signature component. It is square, heavy-numbered, bordered, and tactile. Resting cells use Cell Paper; hover lifts and brightens; selected cells use the Table Teal gradient, selected press shadow, and a short `goodPop` animation; erased cells become muted with a diagonal slash. Blocked cells use dashed borders, low opacity, and short bottom labels such as Seal, Cloak, Echo, or Hold.

### Target Badge

Target badges are square product markers at the row and column edges. Visible targets use Target Paper and an inset bottom shadow. Hidden targets use dashed borders and either Fog/Blind labels. Ciphered targets show factor chips and a tiny "Factors" label. Resolved targets disappear without adding visual noise.

## 6. Do's and Don'ts

### Do:

- **Do** keep the board, targets, current mode, hearts, and next useful action visually dominant.
- **Do** use OKLCH tokens from `src/index.css` and Tailwind theme bindings rather than ad hoc hex colors.
- **Do** treat Select, Erase, Fog, Blind, Cipher, No Echo, and Hold as teachable state language. Explain each at the point it first matters.
- **Do** use `game-number` for board values, target products, level numbers, and result metrics.
- **Do** preserve light and dark mode parity when changing any token or component state.
- **Do** make touch targets at least 44px high for repeated mobile actions.
- **Do** use short, warm result copy. The player should feel sharper, not scolded.

### Don't:

- **Don't** create school worksheet energy with sterile grids, plain arithmetic labels, or teacherly instruction blocks.
- **Don't** add casino or mobile-game grind patterns: no noisy reward loops, manipulative streak chrome, or oversized currency systems.
- **Don't** drift into sterile math-tool minimalism. The cells should feel tactile, not like a spreadsheet.
- **Don't** use neon arcade styling, high-chroma blacklight palettes, or glow as the main identity.
- **Don't** use corporate SaaS conventions such as hero-metric layouts, generic glass cards, or dashboard-first hierarchy.
- **Don't** bury the puzzle under side-panel systems. Missions, modifiers, chapter progress, and unlocks are secondary to the active board.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe.
- **Don't** use gradient text, decorative glassmorphism, nested cards, or pure black and white defaults.
