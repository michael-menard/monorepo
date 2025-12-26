# Design System Migration Guide

**From:** v1.0.0 (Cyberpunk Theme)  
**To:** v2.0.0 (Nature-Inspired Theme)  
**Date:** 2025-12-10

## Overview

This migration updates the design system to align with the frontend specification, moving from a cyberpunk aesthetic to a nature-inspired, earthy design language.

## Breaking Changes

### 1. Font Family Update

**Before:**
```css
--font-primary: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

**After:**
```css
--font-primary: 'Geist', sans-serif;
--font-mono: 'Geist Mono', monospace;
```

**Migration Steps:**

1. **Next.js Apps:** Update font imports in `app/layout.tsx`:
```tsx
// Before
import { Inter, JetBrains_Mono } from 'next/font/google'

// After
import { GeistSans, GeistMono } from 'geist/font'
```

2. **Update CSS Variables:**
```tsx
// Before
<html className={`${inter.variable} ${jetbrainsMono.variable}`}>

// After
<html className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

3. **No code changes needed** - CSS variables automatically reference new fonts

---

### 2. Removed Cyberpunk/Glow Colors

**Removed CSS Variables:**
- `--glow-primary`, `--glow-accent`, `--glow-success`, `--glow-error`, `--glow-info`, `--glow-violet`
- `--surface-translucent`, `--surface-translucent-light`, `--surface-border`, `--surface-border-glow`
- `--gradient-primary-from`, `--gradient-primary-to`, `--gradient-accent-from`, `--gradient-accent-to`
- `--shadow-glow-primary`, `--shadow-glow-accent`

**Removed Tailwind Classes:**
- `bg-glow-*`, `border-glow-*`, `ring-glow-*`
- `bg-surface`, `bg-surface-light`, `border-surface-*`
- `from-primary-from`, `to-primary-to`, etc.
- `shadow-glow-primary`, `shadow-glow-accent`

**Migration Steps:**

1. **Find and Replace Glow Colors:**
```bash
# Search for glow usage
grep -r "glow-" apps/ packages/

# Replace with standard colors
# glow-primary → primary or teal-400
# glow-accent → accent or green-500
```

2. **Replace Surface Colors:**
```tsx
// Before
<div className="bg-surface border-surface-border-glow">

// After
<div className="bg-card border-border">
```

3. **Replace Gradient Stops:**
```tsx
// Before
<div className="bg-gradient-to-r from-primary-from to-primary-to">

// After
<div className="bg-gradient-to-r from-teal-400 to-teal-600">
```

4. **Replace Glow Shadows:**
```tsx
// Before
<div className="shadow-glow-primary">

// After
<div className="shadow-md">
```

---

### 3. Dark Mode Theme Updated

**Before:** Cyberpunk theme (sky blue, amber, slate backgrounds)  
**After:** Nature-inspired theme (teal, sage, earthy tones)

**Color Changes:**

| Element | Before | After |
|---------|--------|-------|
| Background | `#020617` (slate-950) | `#082B34` (teal-950) |
| Primary | `#0ea5e9` (sky-500) | `#5FA3B8` (teal-400) |
| Accent | `#f59e0b` (amber-500) | `#8FA88A` (sage) |
| Border | `#334155` (slate-700) | Teal-tinted borders |

**Migration Steps:**

1. **Review Dark Mode Implementations:**
```bash
# Find dark mode classes
grep -r "dark:" apps/ packages/
```

2. **Test Visual Appearance:**
   - Toggle dark mode in your app
   - Verify colors match the earthy aesthetic
   - Check contrast ratios (should still meet WCAG AA)

3. **Update Custom Dark Mode Styles:**
```tsx
// Before
<div className="dark:bg-slate-900 dark:border-slate-700">

// After
<div className="dark:bg-card dark:border-border">
// (Uses design system tokens which now have teal tint)
```

---

### 4. New Typography Size Added

**Added:**
- `--text-5xl: 3rem` (48px) for H1 headings
- `text-5xl` Tailwind class

**Migration Steps:**

1. **Update H1 Elements:**
```tsx
// Before
<h1 className="text-4xl font-bold">

// After
<h1 className="text-5xl font-bold">
```

2. **Review Heading Hierarchy:**
   - H1: `text-5xl` (48px)
   - H2: `text-4xl` (36px)
   - H3: `text-3xl` (30px)
   - H4: `text-2xl` (24px)
   - H5: `text-xl` (20px)

---

### 5. Animation Updates

**Removed:**
- `animate-spin-slow`, `animate-spin-slower`
- `animate-glow-pulse`

**Added:**
- `animate-button-press` - Button press feedback (100ms)
- `animate-card-hover` - Card hover lift (200ms)
- `animate-modal-open` / `animate-modal-close` - Modal animations
- `animate-toast-slide-in` / `animate-toast-slide-out` - Toast notifications
- `animate-shimmer` - Skeleton loading
- `animate-accordion-down` / `animate-accordion-up` - Accordion

**Migration Steps:**

1. **Replace Removed Animations:**
```tsx
// Before
<div className="animate-glow-pulse">

// After
<div className="animate-pulse">
```

2. **Use New Animations:**
```tsx
// Button press feedback
<button className="active:animate-button-press">

// Card hover
<div className="hover:animate-card-hover">

// Skeleton loading
<div className="animate-shimmer bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100">
```

---

## Non-Breaking Changes

### Enhanced Animations

All animations now include:
- Exact timing values matching frontend spec
- Proper easing curves (cubic-bezier)
- `prefers-reduced-motion` support (handled by Tailwind)

### Improved Documentation

- Added comprehensive README
- Documented all design tokens
- Added usage examples
- Linked to frontend specification

---

## Migration Checklist

- [ ] Update font imports to Geist/Geist Mono
- [ ] Remove all `glow-*` color references
- [ ] Remove all `surface-*` color references
- [ ] Remove gradient stop references (`from-primary-from`, etc.)
- [ ] Replace glow shadows with standard shadows
- [ ] Review and test dark mode appearance
- [ ] Update H1 elements to use `text-5xl`
- [ ] Replace removed animations (`glow-pulse`, `spin-slow`)
- [ ] Test all interactive states (hover, focus, active)
- [ ] Verify WCAG AA contrast ratios
- [ ] Update any custom CSS using old design tokens
- [ ] Run visual regression tests (if available)

---

## Testing

After migration, test the following:

1. **Typography:**
   - All headings render correctly
   - Font family is Geist (not Inter)
   - Line heights are appropriate

2. **Colors:**
   - Light mode uses teal/sage/taupe palette
   - Dark mode uses nature-inspired teal backgrounds
   - No cyberpunk glow effects remain
   - Semantic colors (success, warning, error) work correctly

3. **Animations:**
   - Button press feedback works
   - Card hover animations are smooth
   - Modals open/close smoothly
   - Toasts slide in from right
   - Skeleton loaders shimmer correctly

4. **Accessibility:**
   - Color contrast meets WCAG AA (4.5:1 for text)
   - Focus indicators are visible
   - Reduced motion is respected

---

## Rollback Plan

If you need to rollback:

```bash
# Revert to v1.0.0
pnpm add @repo/design-system@1.0.0

# Or use git
git checkout <previous-commit> packages/core/design-system
```

---

## Support

Questions or issues? Check:
- [Frontend Specification](../../../docs/front-end-spec.md)
- [Design System README](./README.md)
- [Design Handoff Stories](../../../docs/stories/design-handoff-stories.md)

---

**Migration Difficulty:** Medium  
**Estimated Time:** 2-4 hours (depending on codebase size)  
**Recommended Approach:** Incremental (migrate one app at a time)

