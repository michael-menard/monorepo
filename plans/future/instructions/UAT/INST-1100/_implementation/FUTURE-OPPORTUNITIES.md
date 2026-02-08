# Future Opportunities - INST-1100

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No pagination controls beyond page/limit params | Medium | Medium | Add pagination UI component (previous/next, page numbers) in future story. Current MVP uses simple limit/offset which is sufficient for personal collections. |
| 2 | No filter UI for status, type, theme | Medium | Medium | Story marks GalleryFilterBar as optional (line 51). Add filter controls in Phase 6 story (mentioned in Non-goals line 34). |
| 3 | No advanced error recovery beyond retry | Low | Low | Story AC-15 has basic retry. Future: exponential backoff, partial retry, offline mode. |
| 4 | Thumbnail fallback not specified | Low | Low | AC-2 mentions "thumbnail (or placeholder)" but doesn't specify placeholder image source. Should use design system placeholder. |
| 5 | No card hover actions (edit, delete, favorite) | Medium | Medium | Story is gallery-only (Non-goals line 32). Future story INST-1108 (Edit) and INST-1109 (Delete) will add these actions. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | View mode toggle (grid/datatable) | Medium | Medium | GalleryViewToggle marked optional (line 51). Main-page.tsx lines 74-76 already implement this! Consider including in scope. |
| 2 | Sorting controls in UI | Medium | Low | Backend supports sort via query params (line 61). Frontend has no sort selector yet. Add dropdown for sort options. |
| 3 | Infinite scroll instead of simple pagination | High | High | Better UX for large collections. Deferred per Non-goals line 35. Phase 6 enhancement. |
| 4 | Image lazy loading | Medium | Low | Gallery with 50 cards could benefit from lazy-loaded thumbnails. Use `loading="lazy"` attribute. |
| 5 | Card animations on load | Low | Low | Story mentions Framer Motion. Add stagger animation on grid initial render for polish. Main-page.tsx line 10 already imports AnimatePresence. |
| 6 | Keyboard shortcuts (/ for search, etc.) | Low | Medium | Deferred to Phase 8: UI Polish (INST-2043 in stories.index.md line 932). |
| 7 | Bulk selection and actions | Medium | High | Select multiple MOCs for batch delete, export, etc. Phase 8+ feature. |
| 8 | Grid density toggle (compact/comfortable) | Low | Medium | User preference for card size. Similar to wishlist-gallery enhancement. |
| 9 | Recent/Featured MOCs section | Medium | Medium | Surface recently added or favorited MOCs above main grid. Requires backend support. |
| 10 | Gallery analytics (views, most opened) | Low | High | Track which MOCs are viewed most. Observability enhancement. |

## Categories

### Edge Cases
- Empty search results with active filters (should show "No results for [query]")
- Network timeout during fetch (story has retry via AC-15 but no timeout config)
- Partial image loading failures (some thumbnails load, others fail)
- Browser back button with cached stale data

### UX Polish
- Card hover effects (already in template at line 418-428, ensure implemented)
- Loading skeleton count matches expected grid layout
- Empty state illustration (deferred to INST-2045 per stories.index.md line 934)
- Toast notifications for errors instead of inline error state
- Search-as-you-type with debounce (current: manual search trigger)

### Performance
- Image optimization: WebP format, responsive srcset (deferred to INST-2033)
- Virtual scrolling for >100 items
- Request deduplication if user clicks gallery nav multiple times
- Cache strategy refinement: story uses `getServerlessCacheConfig('medium')` (5 min) - consider longer for stable collections

### Observability
- Track gallery load time, search usage, filter usage
- Error rate monitoring for failed thumbnail loads
- User journey tracking: gallery → detail page conversion rate

### Integrations
- Share MOC card (generate shareable link)
- Export gallery as PDF catalog
- Print-friendly view
- Import MOCs from Rebrickable (deferred to INST-3050)

### Accessibility
- Story has comprehensive a11y ACs (AC-17 to AC-21)
- Future: High contrast mode support
- Future: Reduced motion mode (disable card animations)
- Future: Screen reader shortcuts for gallery navigation

---

## Recommendations

### High Priority (Next Phase)
1. **View mode toggle** - Already partially implemented in main-page.tsx, low effort to complete
2. **Filter UI** - Backend supports it, frontend should expose it (Phase 6)
3. **Sort controls** - Backend ready, add dropdown selector

### Medium Priority (Phase 2-3)
1. Pagination UI component
2. Image lazy loading
3. Search-as-you-type with debounce
4. Card hover actions (edit, delete) - blocked by INST-1108, INST-1109

### Low Priority (Post-MVP)
1. Infinite scroll
2. Bulk selection
3. Analytics integration
4. Advanced animations
