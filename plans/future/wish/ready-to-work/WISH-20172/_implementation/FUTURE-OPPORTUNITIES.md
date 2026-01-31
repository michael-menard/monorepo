# Future Opportunities - WISH-20172

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Filter validation feedback (real-time min/max errors) | Low | Low | AC10 handles API-level validation, but real-time client-side validation for min/max price range (e.g., min > max) would improve UX. Defer to Phase 5 UX Polish (WISH-2018). |
| 2 | Filter preset names/labels | Low | Low | AC11 shows "3 filters active" but doesn't name them. Showing "Store: LEGO, Priority: 3-5" would be clearer. Defer to Phase 5 UX Polish. |
| 3 | Filter loading skeleton state | Low | Low | AC10 handles loading state, but dedicated skeleton UI for FilterPanel during initial load would polish UX. Defer to Phase 5. |
| 4 | Mobile filter drawer animation | Low | Low | Story mentions mobile bottom drawer pattern but doesn't specify animation/transition. Defer to Phase 5 UX Polish. |
| 5 | Filter discoverability onboarding | Medium | Medium | New users may not notice the filter panel. Story notes this risk but defers onboarding tooltip to Phase 5. Track for WISH-2018 (filter state persistence). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Filter state persistence in localStorage | Medium | Medium | Story explicitly defers to Phase 5 UX Polish (WISH-2018). Would allow users to resume filter state across sessions. |
| 2 | Saved filter presets | High | High | Explicitly deferred to Phase 5 (WISH-2018). Would allow users to save favorite filter combinations (e.g., "High Priority LEGO Sets"). |
| 3 | Filter history/undo | Medium | Medium | Explicitly deferred to Phase 5 (WISH-2018). Would allow users to step back through filter changes. |
| 4 | Animated filter transitions | Low | Low | Story mentions this as Phase 5 enhancement. Would polish filter apply/clear interactions. |
| 5 | Real-time collaborative filtering | High | High | Explicitly deferred to Phase 7 (Advanced Features). Would allow multiple users to share filter views. |
| 6 | Custom filter logic builder (boolean AND/OR/NOT) | High | High | Explicitly deferred to Phase 7. Would enable power users to create complex filter rules. |
| 7 | Cross-user filter sharing | Medium | High | Explicitly deferred to Phase 7. Would allow users to share filter URLs or templates. |
| 8 | Filter templates for common use cases | Medium | Medium | Explicitly deferred to Phase 7. Would provide pre-built filters like "Affordable High-Priority" or "Expiring Soon". |
| 9 | Progressive disclosure for filter complexity | Medium | Medium | Story notes risk of "too many options may overwhelm users" but defers to Phase 7. Could use collapsible sections or "Advanced Filters" toggle. |
| 10 | Filter result count preview | Medium | Low | Show "42 items match" before applying filters (preview mode). Would help users avoid overly restrictive filters. |
| 11 | Filter analytics (most used filters) | Low | Medium | Track which filters are most popular for future UX optimization. Phase 7 observability enhancement. |
| 12 | URL shortening for complex filter states | Low | Medium | Story mentions base64 encoding for long URLs (>1500 chars) but doesn't implement. Defer to Phase 7 if URL length becomes real issue. |

## Categories

### Edge Cases
- Filter validation feedback (#1)
- Mobile drawer animation (#4)
- Filter loading skeleton (#3)

### UX Polish
- Filter preset names/labels (#2)
- Filter discoverability onboarding (#5)
- Filter state persistence (Enh #1)
- Saved filter presets (Enh #2)
- Filter history/undo (Enh #3)
- Animated transitions (Enh #4)
- Progressive disclosure (Enh #9)
- Filter result preview (Enh #10)

### Performance
- (No performance gaps identified - frontend-only filtering via RTK Query)

### Observability
- Filter analytics (Enh #11)

### Integrations
- Real-time collaborative filtering (Enh #5)
- Cross-user filter sharing (Enh #7)

### Advanced Features (Phase 7)
- Custom filter logic builder (Enh #6)
- Filter templates (Enh #8)
- URL shortening (Enh #12)
