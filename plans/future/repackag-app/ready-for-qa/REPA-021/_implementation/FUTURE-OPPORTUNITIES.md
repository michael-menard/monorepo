# Future Opportunities - REPA-021

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No loading state announcements for screen readers | Medium | Low | Add `aria-live="polite"` region to DashboardSkeleton with "Loading dashboard..." message. Currently AC-1 doesn't specify this, though UI/UX Notes mention it. |
| 2 | EmptyState doesn't support custom icon props | Low | Low | Currently accepts `LucideIcon` type but doesn't allow icon customization (size, color). Could add `iconClassName` prop for flexibility. |
| 3 | No skeleton variant support in DashboardSkeleton | Low | Medium | DashboardSkeleton uses library's Skeleton primitive but doesn't expose variant prop. Could add support for `primary`, `secondary`, `muted` variants for theming. |
| 4 | EmptyState features grid not responsive below sm breakpoint | Low | Low | Feature grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` but doesn't optimize for very small screens. Consider adding `@container` queries for better component-level responsiveness. |
| 5 | No visual regression baseline established | Medium | Medium | Story mentions visual regression tests with <1% pixel diff threshold (AC-1, line 159) but doesn't specify tooling or baseline capture process. Recommend establishing Percy or Chromatic integration for automated visual testing. |
| 6 | Test coverage threshold not validated | Low | Low | AC-7 specifies ≥80% coverage but doesn't document how to measure (lines vs branches vs statements). Recommend documenting Vitest coverage configuration and thresholds in library package.json. |
| 7 | EmptyDashboard preset is tightly coupled to dashboard domain | Medium | High | Current design hardcodes dashboard-specific messaging. Future: Create generic preset factory pattern (`createEmptyStatePreset()`) to support other domains (wishlist, gallery, etc.) without code duplication. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Storybook integration deferred | High | High | AC-9 marked non-blocking due to missing Storybook setup. High impact for component documentation and visual testing. Recommend: Set up Storybook in library package with addon-a11y, addon-interactions, and chromatic integration. Estimated +4 hours for initial setup, +2 hours for stories. |
| 2 | Generic EmptyState could support illustration slot | Medium | Medium | Many modern empty states use illustrations/SVGs instead of icons. Add optional `illustration` prop (React node) that replaces icon when provided. Benefits: More engaging UX for premium features. |
| 3 | DashboardSkeleton could support partial loading states | Medium | Medium | Current implementation shows full skeleton (header + stats + MOCs). Add props: `showHeader`, `showStats`, `showMocs` to support incremental loading (e.g., show header immediately while stats/MOCs load). |
| 4 | EmptyState action could support dropdown menu | Low | Medium | Some empty states need multiple CTAs (e.g., "Import from file" vs "Create manually"). Extend action prop to support `actions: Action[]` with dropdown menu variant. |
| 5 | Animation customization | Low | Low | DashboardSkeleton uses hardcoded `animate-in fade-in duration-300`. Consider adding `animation` prop to customize or disable animations (for accessibility preferences). |
| 6 | EmptyState could support bottom content slot | Low | Low | Some empty states need help links or support contact info below features. Add `footer` prop (React node) for custom content at bottom. |
| 7 | Accessibility audit beyond MVP requirements | High | Medium | Story specifies basic a11y (keyboard nav, screen reader labels) but doesn't include comprehensive audit. Recommend: Full WCAG 2.2 AA audit with axe-core, including color contrast, focus order, ARIA roles, and reduced-motion support. |
| 8 | Dark mode theming verification | Medium | Low | Story assumes design token usage ensures dark mode compatibility but doesn't specify explicit testing. Add dark mode screenshots to E2E tests and visual regression suite. |
| 9 | Internationalization support | Low | Medium | EmptyDashboard preset hardcodes English strings. Future: Extract strings to i18n keys using `react-i18next` (already a library dependency per package.json line 92). Supports multi-language MOC platform. |
| 10 | Performance optimization for large grids | Low | Medium | DashboardSkeleton renders fixed 3 stat cards + 5 MOC cards. For very large dashboards, consider: (a) Intersection Observer for lazy skeleton rendering, (b) CSS containment for better paint performance, (c) Virtualization for 50+ item grids. |

## Categories

### Edge Cases
- **Gap #2**: Icon customization for brand consistency
- **Gap #4**: Very small screen responsiveness (<320px width)
- **Enhancement #4**: Multiple CTA actions in empty states

### UX Polish
- **Enhancement #2**: Illustration support for premium feel
- **Enhancement #3**: Partial loading state granularity
- **Enhancement #5**: Animation preferences/customization
- **Enhancement #6**: Footer content slot for contextual help
- **Enhancement #8**: Dark mode explicit verification

### Performance
- **Enhancement #10**: Intersection Observer for large dashboards
- **Enhancement #10**: CSS containment and virtualization

### Observability
- **Gap #5**: Visual regression testing tooling
- **Gap #6**: Coverage threshold validation
- **Enhancement #7**: Comprehensive accessibility audit

### Integrations
- **Enhancement #1**: Storybook setup (HIGH IMPACT - strongly recommend prioritizing)
- **Enhancement #9**: i18n string extraction for internationalization

### Accessibility
- **Gap #1**: Screen reader loading announcements (recommend adding to MVP)
- **Enhancement #7**: WCAG 2.2 AA comprehensive audit

---

## High-Impact Recommendations (Prioritize for Next Iteration)

1. **Storybook Setup (Enhancement #1)**: Most impactful. Enables visual component documentation, interactive demos, and visual regression testing. Estimated ROI: High (benefits all library components, not just skeletons).

2. **Screen Reader Announcements (Gap #1)**: Low effort, medium-to-high impact for accessibility. Should be considered for MVP inclusion if timeline permits.

3. **Visual Regression Tooling (Gap #5)**: Establishes baseline for "pixel-perfect" claim in AC-1. Without this, visual regression tests are manual and error-prone.

4. **Comprehensive A11y Audit (Enhancement #7)**: Given LEGO brand emphasis on inclusivity, thorough accessibility testing should be high priority for production release.

---

## Implementation Sequencing

If pursuing these opportunities, recommended order:

**Phase 1 (Post-MVP, Sprint N+1):**
- Storybook setup (Enhancement #1)
- Screen reader announcements (Gap #1)
- Visual regression tooling (Gap #5)

**Phase 2 (Sprint N+2):**
- Comprehensive a11y audit (Enhancement #7)
- Dark mode verification (Enhancement #8)
- Coverage validation (Gap #6)

**Phase 3 (Sprint N+3, if needed):**
- Generic preset factory (Gap #7) - if other empty states needed
- Illustration support (Enhancement #2)
- i18n extraction (Enhancement #9) - if multi-language support planned

**Phase 4 (Future, as needed):**
- All other UX polish and edge case handling
