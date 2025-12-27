# @repo/design-system

**Single source of truth for design tokens, CSS variables, and Tailwind configuration across the monorepo.**

## Overview

This package provides the complete design system for the LEGO MOC Inventory application, implementing the nature-inspired aesthetic defined in the frontend specification.

### Design Philosophy

- **Nature-Inspired** - Earthy, calming colors (teal, sage, taupe) that evoke natural landscapes
- **Clean & Modern** - Minimalist approach that lets LEGO imagery shine
- **Approachable & Inviting** - Warm tones that feel welcoming, not sterile
- **Accessible** - WCAG 2.1 AA compliant color contrasts and interaction patterns

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

#### Primary - Teal Family
- **Teal 600** `#1B5E6D` - Primary buttons, headers, key elements
- **Teal 400** `#5FA3B8` - Secondary interactive elements, dark mode primary
- **Teal 800** `#0F4654` - Hover states, emphasis
- **Teal 950** `#082B34` - Dark mode backgrounds

#### Accent - Sage/Green Family
- **Sage 500** `#A8B8A3` - Accents, highlights, focus states
- **Forest Green 900** `#2D5F4F` - Success states, confirmations

#### Neutral - Taupe/Earth Family
- **Neutral 100** `#F5F1ED` - Light mode primary background
- **Neutral 50** `#F9F7F5` - Light mode secondary background
- **Neutral 500** `#9B8B7E` - Secondary text
- **Neutral 900** `#2C2C2C` - Primary text (charcoal)

#### Semantic Colors
- **Success** `#2D5F4F` - Forest Green
- **Warning** `#D4A574` - Warm Ochre
- **Error** `#A85B4B` - Terracotta Red
- **Info** `#5FA3B8` - Soft Teal

### Typography

**Font Families:**
- **Primary:** Geist (sans-serif) - Clean, modern, highly legible
- **Monospace:** Geist Mono - For code, part numbers, technical data

**Type Scale:**
- **H1:** 3rem (48px), 700 weight, 1.2 line height
- **H2:** 2.25rem (36px), 700 weight, 1.25 line height
- **H3:** 1.875rem (30px), 600 weight, 1.3 line height
- **H4:** 1.5rem (24px), 600 weight, 1.375 line height
- **H5:** 1.25rem (20px), 600 weight, 1.5 line height
- **Body:** 1rem (16px), 400 weight, 1.5 line height
- **Small:** 0.875rem (14px), 400 weight, 1.5 line height
- **Caption:** 0.75rem (12px), 400 weight, 1.5 line height

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

### Border Radius
- **sm** = 2px
- **base** = 4px
- **md** = 6px
- **lg** = 8px (default for cards, buttons)
- **xl** = 12px
- **2xl** = 16px
- **full** = 9999px (circular)

### Shadows
- **sm** - Subtle elevation
- **base** - Default card shadow
- **md** - Hover state elevation
- **lg** - Modal/popover elevation
- **xl** - Maximum elevation

## Animations

All animations follow these principles:
- **Purposeful** - Every animation serves a functional purpose
- **Subtle** - Gentle, calming motion that reinforces the earthy aesthetic
- **Fast** - Micro-interactions complete in 150-300ms
- **Accessible** - Respects `prefers-reduced-motion`

### Available Animations

- `animate-fade-in` - Fade in (200ms)
- `animate-fade-out` - Fade out (200ms)
- `animate-slide-in` - Slide in from bottom (300ms)
- `animate-modal-open` - Modal scale + fade (250ms)
- `animate-toast-slide-in` - Toast slide from right (300ms)
- `animate-shimmer` - Skeleton loading shimmer (1500ms)
- `animate-accordion-down` - Accordion expand (300ms)
- `animate-button-press` - Button press feedback (100ms)
- `animate-card-hover` - Card hover lift (200ms)

### Easing Curves

- **Standard:** `cubic-bezier(0.4, 0.0, 0.2, 1)` - ease-in-out
- **Entrance:** `cubic-bezier(0.0, 0.0, 0.2, 1)` - ease-out
- **Exit:** `cubic-bezier(0.4, 0.0, 1, 1)` - ease-in

## Dark Mode

The design system includes a nature-inspired dark theme that maintains the earthy aesthetic:

- **Background:** Deep teal (#082B34)
- **Foreground:** Light taupe (#F9F7F5)
- **Primary:** Brighter teal (#5FA3B8) for visibility
- **Accent:** Desaturated sage for calm feel

Enable dark mode by adding the `dark` class to your root element.

## Migration from Previous Version

### Breaking Changes

1. **Font Family Changed**
   - **Before:** Inter + JetBrains Mono
   - **After:** Geist + Geist Mono
   - **Action:** Update font imports in your apps

2. **Cyberpunk Elements Removed**
   - Removed: `glow-*` colors, `surface-*` colors, gradient stops
   - Removed: `animate-glow-pulse`, `shadow-glow-*`
   - **Action:** Replace with standard colors and shadows

3. **Dark Mode Updated**
   - **Before:** Cyberpunk theme (sky blue, amber, glow effects)
   - **After:** Nature-inspired (teal, sage, earthy tones)
   - **Action:** Review dark mode implementations

4. **New Typography Size**
   - Added: `text-5xl` (48px) for H1 headings
   - **Action:** Update H1 elements to use `text-5xl`

## Contributing

When adding new design tokens:
1. Add to `design-tokens.css` first (single source of truth)
2. Reference in `tailwind-preset.js` using CSS variables
3. Document in this README
4. Update frontend specification if needed

## Resources

- [Frontend Specification](../../../docs/front-end-spec.md)
- [Design Handoff Stories](../../../docs/stories/design-handoff-stories.md)
- [Tailwind CSS Documentation](https://tailwindcss.com)

---

**Version:** 2.0.0  
**Last Updated:** 2025-12-10  
**Status:** Aligned with Frontend Specification v1.0

