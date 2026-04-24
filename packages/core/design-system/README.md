# @repo/design-system

**Single source of truth for design tokens, CSS variables, and Tailwind configuration across the monorepo.**

## Overview

This package provides the complete design system for the LEGO MOC Inventory application, implementing the Dark Academia aesthetic.

### Design Philosophy

- **Dark Academia** - Warm earth tones, forest greens, and burgundy accents inspired by old libraries and scholarly elegance
- **Dual-Theme** - Light mode (warm cream, olive green, sand beige) and dark mode (deep charcoal, forest green, burgundy)
- **Approachable & Inviting** - Warm tones that feel welcoming, not sterile
- **Accessible** - WCAG 2.1 AA compliant color contrasts and interaction patterns

### Design System Reference

The interactive design system site lives at `apps/web/app-design-system` and serves as the canonical visual reference:

```bash
pnpm --filter @repo/app-design-system dev   # http://localhost:8036
```

Pages: Typography, Colors, Layout, Components, Patterns, Style Guide

## Installation

```bash
pnpm add @repo/design-system
```

## Usage

### Import Design Tokens (CSS)

```css
/* In your global CSS file */
@import '@repo/design-system/design-tokens.css';
```

### Use Tailwind Preset

```js
// tailwind.config.js
import designSystemPreset from '@repo/design-system/tailwind-preset'

export default {
  presets: [designSystemPreset],
  // ... your config
}
```

## Design Tokens

### Color Palette

Colors use oklch for perceptual uniformity. See `apps/web/app-design-system/app/globals.css` for exact values.

#### Light Mode (Dark Academia Light)

- **Background** `oklch(0.95 0.015 85)` - Warm cream
- **Foreground** `oklch(0.32 0.015 145)` - Dark olive-gray
- **Primary** `oklch(0.40 0.06 135)` - Darker olive green
- **Secondary** `oklch(0.85 0.02 80)` - Sand beige
- **Accent** `oklch(0.72 0.04 140)` - Soft sage
- **Destructive** `oklch(0.48 0.14 25)` - Darker burgundy
- **Muted** `oklch(0.88 0.018 80)` - Lighter sand

#### Dark Mode (Dark Academia Dark)

- **Background** `oklch(0.18 0.012 55)` - Deep warm charcoal
- **Foreground** `oklch(0.93 0.012 80)` - Brighter warm cream
- **Primary** `oklch(0.55 0.10 160)` - Brighter forest green
- **Secondary** `oklch(0.30 0.018 55)` - Urbane Bronze warm brown
- **Accent** `oklch(0.55 0.14 25)` - Brighter burgundy
- **Destructive** `oklch(0.55 0.16 25)` - Brighter burgundy for visibility

#### Chart Colors

Five theme-coordinated chart colors available as `--chart-1` through `--chart-5`.

### Typography

**Font Families:**

- **Heading:** Cormorant Garamond (`font-heading`) - Headings, titles, display text
- **Body:** Lora (`font-body`) - Body text, descriptions, paragraphs
- **Mono:** Geist Mono (`font-mono`) - Numbers, codes, technical data
- **Sans:** Geist (`font-sans`) - UI elements, navigation

**Type Scale (Responsive):**

- **H1:** `text-3xl md:text-4xl lg:text-5xl font-bold font-heading`
- **H2:** `text-2xl md:text-3xl lg:text-4xl font-bold font-heading`
- **H3:** `text-xl md:text-2xl font-bold font-heading`
- **H4:** `text-lg md:text-xl font-semibold font-heading`
- **Body:** `text-base font-body leading-relaxed`
- **Small:** `text-sm font-body`
- **Data:** `text-sm font-mono`

Default line-height: 1.6 (set on body).

### Spacing Scale

4px base unit (0.25rem):

- **1** = 4px
- **2** = 8px
- **3** = 12px
- **4** = 16px
- **6** = 24px
- **8** = 32px
- **12** = 48px
- **16** = 64px
- **20** = 80px

### Responsive Spacing

| Element           | Mobile | Tablet (md) | Desktop (lg) |
| ----------------- | ------ | ----------- | ------------ |
| Layout Gap        | gap-4  | gap-6       | gap-8        |
| Container Padding | px-4   | px-6        | px-8         |
| Section Spacing   | py-12  | py-16       | py-20        |
| Card Gap          | gap-4  | gap-6       | gap-6        |

### Common Patterns

```
Container:  max-w-7xl mx-auto px-4 md:px-6 lg:px-8
Section:    py-12 md:py-16 lg:py-20
Card Grid:  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6
```

### Border Radius

- **sm** = 2px
- **base** = 4px
- **md** = 6px
- **lg** = 8px (default for cards, buttons)
- **xl** = 12px
- **2xl** = 16px
- **full** = 9999px (circular)

## Animations

All animations follow these principles:

- **Purposeful** - Every animation serves a functional purpose
- **Subtle** - Gentle motion that reinforces the warm, scholarly aesthetic
- **Fast** - Micro-interactions complete in 150-300ms
- **Accessible** - Respects `prefers-reduced-motion`

## Dark Mode

Enable dark mode by adding the `dark` class to your root element. The Dark Academia dark theme uses deep warm charcoal backgrounds with brighter forest green and burgundy accents.

## Migration History

- **v1.0.0** - Cyberpunk theme (Inter + JetBrains Mono, glow effects, sky/amber)
- **v2.0.0** - Nature-Inspired theme (Geist + Geist Mono, teal/sage/taupe)
- **v3.0.0** - Dark Academia theme (Cormorant Garamond + Lora + Geist Mono, oklch colors, warm earth tones)

## Contributing

When adding new design tokens:

1. Add to `design-tokens.css` first (single source of truth)
2. Reference in `tailwind-preset.js` using CSS variables
3. Update the design system site at `apps/web/app-design-system`
4. Document in this README

## Resources

- [Design System Site](../../apps/web/app-design-system) - Interactive reference (port 8036)
- [Style Guide](../../apps/web/app-design-system/docs/STYLE_GUIDE.md) - Quick reference
- [v0 Rules](../../apps/web/app-design-system/docs/V0_RULES.md) - For v0.dev generation
- [Tailwind CSS Documentation](https://tailwindcss.com)

---

**Version:** 3.0.0
**Theme:** Dark Academia
**Status:** Active
