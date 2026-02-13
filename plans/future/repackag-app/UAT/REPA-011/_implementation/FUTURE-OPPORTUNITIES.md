# Future Opportunities - REPA-011

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Active Filters Display: Build status filter NOT shown in active filters chips | Low | Medium | Track as REPA-012 candidate. Would require extending GalleryActiveFilters component to accept custom filter state. Pattern: allow parent to pass additional `ActiveFilter[]` array for custom filters not tracked by GalleryFilterBar itself. |
| 2 | Clear All Filters: May not reset build status filter depending on onClearAll implementation | Low | Low | Verify during implementation. If onClearAll callback is not provided to GalleryFilterBar, default behavior only clears tags, theme, and search. Parent must explicitly reset build status in custom onClearAll handler. |
| 3 | Filter Keyboard Navigation: Build status filter keyboard accessibility not explicitly tested | Low | Low | Add to manual testing checklist: Tab navigation through all filters, Space/Enter to open dropdown, Arrow keys to navigate options. Should work automatically via AppSelect but worth verifying. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Filter Tooltips: No tooltips explaining filter purpose | Low | Low | Add tooltip to BuildStatusFilter explaining "All statuses", "Built" (fully assembled), "In Pieces" (unbuilt). Could use Tooltip primitive from @repo/app-component-library. Future enhancement for all filters. |
| 2 | Filter Icons: Build status filter has no visual icon | Low | Low | Consider adding icon to BuildStatusFilter (e.g., CheckSquare for built, Box for unbuilt). Would require adding optional `icon` prop to AppSelect or wrapping select in custom component. |
| 3 | Generalized StatusFilter Component: BuildStatusFilter is sets-specific | Low | Medium | If other apps need status filters (e.g., instructions gallery with "draft/published" status), extract to shared @repo/gallery. Generalize props: `options: StatusOption[]`, `value`, `onChange`, `label`. Pattern: `createStatusFilter(config)` factory function. |
| 4 | Filter State Persistence: Build status filter not persisted to URL or localStorage | Medium | Medium | Consider adding URL query param support for build status (e.g., `?status=built`). Would enable bookmarking filtered views and back button navigation. Requires URL sync pattern used by other filters. |
| 5 | Filter Analytics: No tracking for build status filter usage | Low | Low | Add analytics event when build status filter changes. Pattern: `trackFilterChange('buildStatus', value)`. Would inform which filters are most used and guide future filter enhancements. |
| 6 | Mobile Filter Panel: Filters could be collapsed into drawer on mobile for better space usage | Medium | High | On mobile viewports, consider collapsing all filters into expandable "Filters" button that opens drawer. Would reduce visual clutter on small screens. Requires design input and new FilterDrawer component. |
| 7 | Filter Presets: No quick filter presets (e.g., "Recently Built", "Unbuilt Modulars") | Medium | High | Add preset filter buttons above main filters for common combinations. Example: "Recently Built" = built + sort by purchase date desc. Would require new FilterPresets component and preset configuration system. |
| 8 | Filter Count Badges: No indication of how many items match each filter option | Low | Medium | Show count badges in build status dropdown (e.g., "Built (5)", "In Pieces (12)"). Would require passing filter counts from backend or computing from current result set. Helpful for users to see data distribution. |
| 9 | Responsive Layout Testing: Manual testing checklist mentions 375px viewport but not 320px or 768px | Low | Low | Expand responsive testing to cover 320px (iPhone SE), 375px (iPhone standard), 768px (tablet portrait). GalleryFilterBar should handle gracefully with proper text wrapping and spacing. |
| 10 | BuildStatusFilter Test Coverage: No dedicated test file created in story scope | Low | Low | Story mentions unit tests for BuildStatusFilter but doesn't specify creating `__tests__/BuildStatusFilter.test.tsx`. Should be added to ensure component has proper test coverage (render all options, onChange callback, props acceptance). |

## Categories

### Edge Cases
- #2: Clear All Filters behavior verification
- #3: Keyboard navigation edge cases

### UX Polish
- #1: Filter tooltips for better discoverability
- #2: Filter icons for visual recognition
- #6: Mobile filter panel for better mobile UX
- #7: Filter presets for power users
- #8: Filter count badges for data visibility

### Performance
- No performance concerns identified for this story

### Observability
- #5: Filter analytics for usage tracking

### Integrations
- #4: URL query param integration for filter persistence
- #1: Active filters display integration (REPA-012)

### Code Quality
- #10: BuildStatusFilter dedicated test file

### Reusability
- #3: Generalized StatusFilter component pattern

---

## Notes

### Strong Foundation
The story builds on well-proven patterns:
- Shared GalleryFilterBar already used successfully in wishlist and instructions galleries
- Extension points (`children`, `rightSlot`) proven in production
- AppSelect component battle-tested across multiple gallery apps
- Test patterns established in existing gallery tests

### Minimal Technical Debt
This refactoring **eliminates** technical debt by:
- Removing 135 lines of duplicate code
- Standardizing on shared components
- Establishing reusable extension pattern

### Clear Upgrade Path
If generalization is needed:
1. REPA-011 creates BuildStatusFilter (app-specific)
2. REPA-012 adds active filters support (story candidate)
3. Future: Extract StatusFilter factory if second use case emerges
4. Future: Add filter preset system if user research validates need

### Non-MVP Justification
All future opportunities are correctly excluded from MVP because:
- **Active filters (Gap #1)**: Nice-to-have, doesn't break core filtering functionality
- **Clear all behavior (Gap #2)**: Edge case that can be fixed during testing if needed
- **Tooltips/Icons (Enhancements #1-2)**: Polish, not functional requirements
- **Generalization (Enhancement #3)**: YAGNI principle - wait for second use case
- **Analytics/Persistence (Enhancements #4-5)**: Non-blocking enhancements
- **Mobile panel/Presets (Enhancements #6-7)**: Nice-to-haves requiring design input

### Risk Assessment
All future opportunities are **Low-Medium impact** with **Low-High effort**:
- No critical gaps identified
- All enhancements are incremental improvements
- No security vulnerabilities
- No data integrity concerns
- No accessibility blockers (basic a11y covered in AC14)

---

## Recommendation Summary

**For REPA-011 MVP:**
- Proceed with implementation as specified in story
- All gaps are acceptable for MVP
- Focus on completing 18 acceptance criteria

**For Follow-up Stories:**
- Priority 1: Gap #1 (Active filters display) → REPA-012 candidate
- Priority 2: Enhancement #4 (URL persistence) → Adds significant UX value
- Priority 3: Enhancement #3 (Generalization) → Only if second use case emerges
- Consider: Enhancements #6-7 (Mobile panel, Presets) → Requires design input and user research

**For Continuous Improvement:**
- Monitor filter usage analytics (Enhancement #5) to guide future investments
- Gather user feedback on filter discoverability (Enhancement #1 tooltips)
- Test responsive behavior thoroughly (Enhancement #9) during manual QA
