# Design

## Theme

**Dark Academia (v3.0.0)** — warm earth tones, forest greens, and burgundy accents inspired by old libraries, vintage books, and scholarly elegance. Dual-theme: light mode (warm cream, olive green, sand beige) and dark mode (deep charcoal, forest green, burgundy).

## Design Principles

- **Warm, not sterile** — earthy tones that feel inviting and personal
- **Dual-theme harmony** — light and dark modes maintain visual consistency
- **Accessibility-first** — WCAG 2.1 AA compliant, ARIA labels, keyboard navigation, focus management
- **Semantic tokens only** — never use direct colors (`bg-white`, `text-black`), always use tokens (`bg-background`, `text-foreground`)
- **Font system with purpose** — headings (Cormorant Garamond), body (Lora), data (Geist Mono), UI (Geist)

## Design System Reference

The interactive design system site is the single source of truth:

```bash
pnpm --filter @repo/app-design-system dev   # http://localhost:8036
```

| Page              | Content                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `/typography`     | Font system, type scale, responsive sizing, usage examples                                                 |
| `/colors`         | Color palette (oklch), gradients, CSS variables                                                            |
| `/layout-spacing` | Spacing scale, container widths, breakpoints, grid patterns                                                |
| `/components`     | Buttons, forms, cards, badges, avatars, tooltips, dialogs, tables, tabs, selects, inputs, dividers, alerts |
| `/patterns`       | Image card overlays, gauge charts, dashboard patterns                                                      |
| `/style-guide`    | Dark Academia theme philosophy                                                                             |

### Quick Reference Docs

- `apps/web/app-design-system/docs/STYLE_GUIDE.md` — typography, spacing, colors, component patterns
- `apps/web/app-design-system/docs/V0_RULES.md` — rules for v0.dev generation
- `packages/core/design-system/README.md` — package documentation with full token reference

## UX Documentation

### Information Architecture

- `docs/front-end-spec/information-architecture-ia.md` — navigation structure, site map

### Accessibility

- `docs/front-end-spec/accessibility-requirements.md` — WCAG targets, keyboard, screen reader, touch requirements

### Responsiveness

- `docs/front-end-spec/responsiveness-strategy.md` — breakpoints, layout patterns, mobile-tablet-desktop adaptation

### Implementation Guidelines

- `docs/ux-design/ux-implementation-guidelines.md` — component usage, touch targets (44px), accessibility implementation, form states, performance

### Page Designs

- `docs/ux-design/ux-page-designs.md` — page structure templates, layout patterns (theme-specific content is stale, layout patterns are valid)

## KB Entries

Search the KB for "design system" or "UX documentation" for detailed references indexed for agent discovery.
