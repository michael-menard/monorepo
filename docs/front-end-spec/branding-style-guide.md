# Branding & Style Guide

## Visual Identity

**Brand Guidelines:** "LEGO Cyberpunk" — the structured, playful spirit of LEGO meets sleek futuristic UI patterns. Warm, vibrant colors with translucent surfaces, glowing accents, and purposeful micro-animations.

**Design Philosophy:** Organized LEGO collection meets futuristic control panel. Think premium display cases with subtle neon edge lighting — technically sophisticated but warmly inviting.

## Theme Mode

**Default:** Dark mode is the primary experience. Light mode available as secondary option.

**Dark Mode Background:** `bg-gradient-to-br from-slate-950 to-slate-900` — deep, rich slate gradient that makes LEGO colors pop.

## Color Palette

### Core Colors

| Color Type | Hex Code | Tailwind    | Usage                                       |
| ---------- | -------- | ----------- | ------------------------------------------- |
| Primary    | #0ea5e9  | sky-500     | Main actions, links, primary buttons        |
| Secondary  | #64748b  | slate-500   | Secondary actions, supporting elements      |
| Accent     | #f59e0b  | amber-500   | Highlights, notifications, special features |
| Tertiary   | #8b5cf6  | violet-500  | Creative elements, inspiration features     |
| Success    | #10b981  | emerald-500 | Confirmations, successful actions           |
| Warning    | #f59e0b  | amber-500   | Cautions, important notices                 |
| Error      | #ef4444  | red-500     | Errors, destructive actions                 |
| Info       | #3b82f6  | blue-500    | Information, tips, guidance                 |

### Glow Accent Colors (Cyberpunk Enhancement)

| Glow Type    | Value            | Usage                                    |
| ------------ | ---------------- | ---------------------------------------- |
| Primary Glow | `sky-500/30`     | Card borders, focus rings, active states |
| Accent Glow  | `amber-500/30`   | Highlight borders, special features      |
| Success Glow | `emerald-500/30` | Success state borders                    |
| Error Glow   | `red-500/30`     | Error state borders                      |

### Surface Colors (Dark Mode)

| Surface          | Value          | Usage                     |
| ---------------- | -------------- | ------------------------- |
| Background       | `slate-950`    | Page background base      |
| Card Background  | `slate-900/50` | Translucent card surfaces |
| Card Border      | `slate-700/50` | Default card borders      |
| Elevated Surface | `slate-800/50` | Nested elements, inputs   |
| Muted Text       | `slate-400`    | Secondary text, labels    |
| Foreground       | `slate-100`    | Primary text              |

## Typography

### Font Families

- **Primary:** Inter (clean, modern, excellent readability)
- **Mono:** JetBrains Mono (piece counts, part numbers, technical data)
- **Display:** Inter (headings, large text)

### Type Scale

| Element | Size            | Weight | Line Height |
| ------- | --------------- | ------ | ----------- |
| H1      | 2.25rem (36px)  | 700    | 1.2         |
| H2      | 1.875rem (30px) | 600    | 1.3         |
| H3      | 1.5rem (24px)   | 600    | 1.4         |
| H4      | 1.25rem (20px)  | 500    | 1.4         |
| Body    | 1rem (16px)     | 400    | 1.6         |
| Small   | 0.875rem (14px) | 400    | 1.5         |
| Caption | 0.75rem (12px)  | 400    | 1.4         |

### Mono Typography (Technical Data)

Use `font-mono text-xs tracking-wider uppercase` for:

- Part numbers and piece counts
- Status labels (LIVE, SYNCING, COMPLETE)
- Technical specifications
- Progress percentages

## Component Styling

### Card Surfaces (Glassmorphism)

All cards use translucent surfaces with subtle blur and glow borders:

```css
/* Base Card */
.card-base {
  @apply bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-lg;
}

/* Card with Primary Glow (active/featured) */
.card-glow-primary {
  @apply bg-slate-900/50 border border-sky-500/30 backdrop-blur-sm rounded-lg;
}

/* Card with Accent Glow (highlighted) */
.card-glow-accent {
  @apply bg-slate-900/50 border border-amber-500/30 backdrop-blur-sm rounded-lg;
}
```

### Progress Bars (Gradient Style)

```css
/* Primary Progress */
.progress-primary {
  @apply bg-gradient-to-r from-sky-400 to-teal-600 rounded-full;
}

/* Accent Progress */
.progress-accent {
  @apply bg-gradient-to-r from-amber-400 to-orange-500 rounded-full;
}

/* Success Progress */
.progress-success {
  @apply bg-gradient-to-r from-emerald-400 to-green-600 rounded-full;
}
```

### Status Badges

```css
/* Live/Active Badge */
.badge-live {
  @apply bg-slate-800/50 text-sky-400 border border-sky-500/50 text-xs font-mono uppercase tracking-wider;
}

/* With pulsing indicator dot */
.badge-live-dot {
  @apply h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse mr-1.5;
}
```

### Form Inputs

```css
/* Cyberpunk Input */
.input-cyber {
  @apply bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-md
         text-slate-100 placeholder:text-slate-500
         focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30;
}
```

## Animation Guidelines

### ✅ Encouraged Animations

**Micro-animations for feedback:**

- Staged SVG path reveals (checkmarks, icons) using Framer Motion spring physics
- Subtle opacity/scale transitions on element mount (0.2-0.4s)
- Pulsing dots for live/active status indicators
- Progress bar fill animations

**Framer Motion Pattern (Success Checkmark Example):**

```tsx
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.2, type: 'spring', duration: 1.5, bounce: 0.2 },
      opacity: { delay: i * 0.2, duration: 0.2 },
    },
  }),
}
```

### ❌ Avoid These Animations

- **NO rotate transforms on hover** — feels gimmicky, not premium
- **NO animated backgrounds** (blobs, particles) — too distracting
- **NO continuous motion** — only animate on user interaction or state change
- **NO translateY hover on cards** — keep cards stable, use border glow instead

### Card Hover States

Cards should NOT move on hover. Instead, enhance the glow border:

```css
/* Card hover - glow enhancement only */
.card-base:hover {
  @apply border-sky-500/40;
  /* NO transform, NO translateY */
}
```

## Iconography

**Icon Library:** Lucide React (consistent, modern, accessible icons with excellent React integration)

**Icon Colors in Dark Mode:**

- Default: `text-slate-400`
- Active/Accent: `text-sky-500` or `text-amber-500`
- On hover: `text-slate-100`

**Usage Guidelines:** Use 16px, 20px, 24px sizes consistently. Maintain 2px stroke width. Include proper alt text or aria-labels.

## Spacing & Layout

**Grid System:** CSS Grid and Flexbox with Tailwind CSS spacing scale (4px base unit)

**Spacing Scale:** 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

**Card Corner Radius:** `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs/buttons, `rounded-full` for badges and pills

## CSS Custom Properties

Add these to your globals.css for the cyberpunk theme:

```css
:root {
  /* Glow utilities */
  --glow-primary: 0 0 20px rgba(14, 165, 233, 0.15);
  --glow-accent: 0 0 20px rgba(245, 158, 11, 0.15);

  /* Card surfaces */
  --card-bg: rgba(15, 23, 42, 0.5); /* slate-900/50 */
  --card-border: rgba(51, 65, 85, 0.5); /* slate-700/50 */
  --card-border-glow: rgba(14, 165, 233, 0.3); /* sky-500/30 */
}
```
