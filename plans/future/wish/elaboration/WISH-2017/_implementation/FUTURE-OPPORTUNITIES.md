# Future Opportunities - WISH-2017

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Filter state persistence across sessions | Medium | Low | Store active filters in localStorage. On page load, restore last-used filters. Requires AC: "Last filter state restored on page load." Defer to Phase 5 (UX Polish). |
| 2 | Filter analytics tracking | Low | Low | Track which filters users apply most frequently. Send events: `filter_applied(type: store/priority/price)`, `filter_cleared`. Requires analytics infrastructure. Defer to Phase 6 (Observability). |
| 3 | Filter validation edge cases | Low | Low | Story handles basic validation (priority 0-5, price >= 0) but doesn't validate: (1) min <= max for range filters, (2) duplicate store selections, (3) malformed array params. These are non-blocking as backend will handle gracefully, but frontend validation would improve UX. Defer to Phase 5. |
| 4 | Empty filter state indication | Low | Low | When no filters active, show helpful message: "No filters applied. Showing all items." vs current implicit behavior. Defer to Phase 5 (UX Polish). |
| 5 | Filter count badge position | Low | Low | Story shows badge next to "Filter" button, but doesn't specify mobile responsive behavior. On small screens, badge may overlap text. Recommend mobile-specific positioning. Defer to Phase 5. |
| 6 | Filter animation polish | Low | Medium | Story doesn't specify filter panel open/close animations. Framer Motion could provide slide-in/slide-out for better UX. Defer to Phase 5 (UX Polish). |
| 7 | Filter discoverability on mobile | Medium | Low | Mobile bottom drawer pattern may hide filters. Consider onboarding tooltip: "Tap Filter to refine your wishlist." Defer to Phase 5 (Onboarding). |
| 8 | Multi-select dropdown keyboard accessibility | Medium | Medium | Story specifies keyboard navigation (arrow keys) but doesn't detail multi-select interactions: Shift+Click for range selection, Ctrl+Click for non-contiguous selection. Defer to Phase 5 (Accessibility Polish). |
| 9 | Filter query param length monitoring | Low | Low | Story mentions 2083 char URL limit mitigation (base64 JSON) but doesn't implement monitoring. Add client-side warning: "Too many filters applied. Some filters may not persist." Defer to Phase 6 (Error Handling Polish). |
| 10 | Concurrent filter updates handling | Low | Medium | If user applies filters in quick succession (clicks Apply 3 times rapidly), RTK Query may have race conditions. Story doesn't specify debouncing or request cancellation. Defer to Phase 5 (Performance). |
| 11 | Filter state in browser history | Medium | Medium | Story implements URL state but doesn't specify browser back/forward behavior. Should back button: (1) Remove last filter applied, or (2) Go to previous page? Recommend (2) for MVP simplicity. (1) requires custom history management. Defer to Phase 5. |
| 12 | Performance monitoring for filter queries | Medium | Low | AC18 requires < 2s performance but doesn't specify monitoring in production. Add CloudWatch metric: `WishlistFilterQueryDuration` with P95 alarm. Defer to Phase 6 (Observability). |
| 13 | Filter error recovery | Low | Low | If filter API call fails (500 error), story shows generic error. Could provide recovery: "Retry with filters" vs "Show all items" options. Defer to Phase 5 (Error Handling). |
| 14 | Store filter ordering | Low | Low | Story lists stores as: LEGO, BrickLink, Amazon, Other. Doesn't specify if ordering should match user's most-used stores. Consider personalized ordering. Defer to Phase 7 (Personalization). |
| 15 | Price range slider vs input UX decision | Medium | Low | Story allows "Dual slider or min/max number inputs" but doesn't provide design guidance. Slider is more intuitive for range selection, inputs better for precise values. Recommend testing both in Phase 5 UX research. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Saved filter presets | High | High | Story Non-goals defer this to Phase 5. Allow users to save filter combinations: "My Budget Sets" (price < 100, bestValue sort), "High Priority LEGO" (store=LEGO, priority >= 4). Requires: (1) Filter presets table in DB, (2) Save/Load preset UI, (3) Preset management (edit, delete, share). Estimated effort: 8-10 days. |
| 2 | Filter history/undo | Medium | Medium | Story Non-goals defer this to Phase 5. Provide 5-step filter history with undo: "Undo last filter change" button. Requires: (1) Filter state stack in Redux, (2) Undo button with count badge, (3) Max 5 history entries. Estimated effort: 3-5 days. |
| 3 | Custom filter logic builder | High | High | Story Non-goals defer this to Phase 7. Advanced users could build boolean filter logic: "Show items WHERE (store = LEGO OR store = BrickLink) AND priority > 3 AND price < 150". Requires: (1) Visual query builder UI, (2) Filter AST serialization, (3) Backend query parser. Estimated effort: 15-20 days. |
| 4 | Cross-user filter sharing | Medium | High | Story Non-goals defer this to Phase 7. Share filter links: "Check out my LEGO deals filter: /wishlist?preset=abc123". Requires: (1) Filter preset sharing endpoint, (2) Public/private preset toggle, (3) Social sharing UI. Estimated effort: 10-12 days. |
| 5 | Real-time collaborative filtering | Low | High | Story Non-goals defer this to Phase 7. Multiple users could filter same wishlist collaboratively via WebSocket. Niche use case. Requires: (1) WebSocket filter state sync, (2) Collaborative cursor UI. Estimated effort: 12-15 days. |
| 6 | Filter auto-suggestions | Medium | Medium | Based on usage patterns, suggest filters: "Users with similar wishlists often filter by LEGO + priority 4-5." Requires: (1) Analytics on filter usage, (2) Collaborative filtering algorithm, (3) Suggestion UI. Estimated effort: 8-10 days. |
| 7 | Filter templates for common use cases | Medium | Low | Provide pre-defined filters: "Budget Builder" (price < 50, bestValue), "Retiring Sets" (expiringSoon), "High Priority" (priority 4-5). Hardcoded templates, no DB needed. Estimated effort: 2-3 days. Could be added to Phase 5. |
| 8 | Advanced filter animations | Low | Medium | Animated filter transitions: filter panel slides in from left, filter badges fade in/out, filtered items pulse on first load. Requires Framer Motion integration. Estimated effort: 3-4 days. Defer to Phase 5. |
| 9 | Filter accessibility beyond basics | Medium | High | Story covers keyboard nav and screen reader announcements (AC19, AC20) but could add: (1) Focus management (trap focus in filter panel), (2) Landmark regions, (3) Skip links ("Skip to filtered results"), (4) High contrast mode support. Estimated effort: 5-6 days. Defer to Phase 6 (WCAG AAA compliance). |
| 10 | Filter performance at scale | High | Medium | Story tests with 1000+ items. For 10,000+ items, consider: (1) Virtual scrolling for filtered results, (2) Database query optimization (materialized views for common filters), (3) Redis caching for popular filter combos. Estimated effort: 6-8 days. Monitor production metrics and implement if P95 latency exceeds 2s. |
| 11 | Filter context-aware sorting | Medium | Medium | When filter applied, auto-suggest relevant sort: "Items filtered by LEGO store - sort by Expiring Soon?" Requires: (1) Filter → Sort recommendation mapping, (2) Toast notification with suggestion. Estimated effort: 2-3 days. |
| 12 | Filter conflict detection | Low | Low | Detect impossible filter combinations: "No items found because you filtered price < 10 AND priority = 5 (no items match)." Show warning before applying. Requires: (1) Filter validation logic, (2) Warning modal. Estimated effort: 2-3 days. |
| 13 | Filter export/import | Medium | Medium | Export filter state as JSON for backup/sharing: "Download filter settings" → `wishlist-filters.json`. Import to restore settings on new device. Estimated effort: 3-4 days. |
| 14 | Multi-currency support for price filter | High | High | Story Non-goals defer this to Phase 6 (Internationalization). Price range filter in USD only. Multi-currency requires: (1) Currency field in wishlist_items, (2) Exchange rate API, (3) Normalized price column for filtering. Estimated effort: 10-12 days. |
| 15 | Filter panel layout customization | Low | Medium | Allow users to reorder filter controls: drag priority filter above store filter. Requires: (1) Drag-and-drop for filter panel items, (2) Layout preference persistence in localStorage. Estimated effort: 4-5 days. |

## Categories

### Edge Cases
- **#3**: Filter validation edge cases (min <= max, duplicates)
- **#10**: Concurrent filter updates handling
- **#11**: Filter state in browser history
- **#13**: Filter error recovery
- **#12**: Filter conflict detection

### UX Polish
- **#1**: Filter state persistence across sessions
- **#4**: Empty filter state indication
- **#6**: Filter animation polish
- **#7**: Filter discoverability on mobile
- **#8**: Advanced filter animations
- **#15**: Filter panel layout customization
- **#15 (Gaps)**: Price range slider vs input UX decision

### Performance
- **#10 (Enhancements)**: Filter performance at scale (10,000+ items)
- **#10 (Gaps)**: Concurrent filter updates debouncing
- **#12 (Gaps)**: Performance monitoring for filter queries

### Observability
- **#2**: Filter analytics tracking
- **#12 (Gaps)**: Performance monitoring (P95 latency)

### Integrations
- **#4**: Cross-user filter sharing
- **#5**: Real-time collaborative filtering
- **#13**: Filter export/import

### Advanced Features (Phase 7)
- **#1**: Saved filter presets
- **#2**: Filter history/undo
- **#3**: Custom filter logic builder
- **#6**: Filter auto-suggestions
- **#14**: Multi-currency support

### Accessibility (Phase 6)
- **#8 (Gaps)**: Multi-select dropdown keyboard accessibility
- **#9 (Enhancements)**: Filter accessibility beyond basics (WCAG AAA)

### DevEx/Admin
- **#7**: Filter templates for common use cases
- **#11**: Filter context-aware sorting

---

## Prioritization Guidance

**High Impact, Low Effort (Candidates for Phase 5):**
- **#7 (Enhancements)**: Filter templates for common use cases (2-3 days)
- **#11 (Enhancements)**: Filter context-aware sorting (2-3 days)
- **#1 (Gaps)**: Filter state persistence (1-2 days)

**High Impact, High Effort (Roadmap Items):**
- **#1 (Enhancements)**: Saved filter presets (8-10 days) - Should be own story
- **#10 (Enhancements)**: Filter performance at scale (6-8 days) - Implement when needed
- **#14 (Enhancements)**: Multi-currency support (10-12 days) - Phase 6 epic

**Medium Impact, Low Effort (Quick Wins):**
- **#2 (Gaps)**: Filter analytics tracking (1-2 days)
- **#4 (Gaps)**: Empty filter state indication (1 day)
- **#12 (Enhancements)**: Filter conflict detection (2-3 days)

**Low Priority (Monitor & Revisit):**
- **#5 (Enhancements)**: Real-time collaborative filtering (niche use case)
- **#15 (Enhancements)**: Filter panel layout customization (low user demand)
