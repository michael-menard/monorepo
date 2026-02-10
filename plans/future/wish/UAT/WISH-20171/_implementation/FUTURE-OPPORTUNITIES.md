# Future Opportunities - WISH-20171

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Cursor-based pagination for large datasets**: Story uses offset pagination which can be slow for large result sets (> 10,000 items). Cursor-based pagination (keyset pagination) would improve performance by using indexed columns for pagination instead of OFFSET | Low | Medium | Defer to Phase 7 (Performance Optimization). MVP offset pagination is sufficient for typical users with < 1,000 items. Consider only if user analytics show 10%+ users with 5,000+ items |
| 2 | **Filter combination validation (min <= max)**: AC1 specifies query format but doesn't validate min <= max at schema level. Backend should return 400 error with message "min must be <= max" instead of allowing invalid queries | Low | Low | Add to future story: Enhanced validation rules in Zod schema. Use `.refine()` to validate min <= max for priority and priceRange |
| 3 | **Partial filter matches (LIKE queries)**: No support for partial matches on store names (e.g., store contains "LEGO" vs exact match). Would require ILIKE queries and potential performance impact | Low | Low | Defer to Phase 7 (Advanced Search). Exact match is sufficient for enum-based store filter in MVP |
| 4 | **Multi-value null handling strategy**: Story specifies null exclusion per AC3 but doesn't define behavior when ALL items have null values for a filtered field. Should return empty result or all items? | Low | Low | Document explicit behavior: Return empty results when filter applied and all items null. Add test case in future story |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Filter preset persistence**: Users cannot save commonly used filter combinations (e.g., "High Priority LEGO Sets $100-$200"). Requires database schema for saved filters (user_id, name, filter_json) and UI for managing presets | Medium | High | Defer to Phase 5 (UX Polish) as noted in Non-goals. Would require new story with 8-10 ACs for CRUD operations, preset naming, and default preset selection |
| 2 | **Query result caching (Redis)**: Repeated identical filter queries could be cached in Redis for 1-5 minutes to reduce database load. Cache key would be hash of filter parameters. Especially valuable for common filter combinations on high-traffic pages | Medium | Medium | Defer to Phase 7 (Performance Optimization). Requires user behavior analysis to identify common patterns. Consider only if database monitoring shows query bottlenecks (> 1s avg) |
| 3 | **GraphQL-style field selection**: Allow clients to specify which fields to return (e.g., `?fields=id,title,price`) to reduce payload size for mobile clients. Would require field masking at repository layer | Low | Medium | Defer to Phase 8 (API Evolution). Only consider if mobile app adoption shows bandwidth concerns. REST API with full payloads is sufficient for web app |
| 4 | **Faceted search counts (filter previews)**: Return count of items per filter value (e.g., "LEGO: 42 items, BrickLink: 18 items, Priority 3-5: 12 items") to help users understand available options before applying filters. Requires additional COUNT queries grouped by filter values | Medium | Low | Defer to Phase 6 or 7 (UX enhancement). Valuable for filter discoverability but adds query complexity. Would add 2-3 ACs to future story |
| 5 | **Smart sort algorithm explanations**: Include explanation in response for why items ranked in a particular order (e.g., "Best Value: $0.11/piece" displayed next to each item). Helps users understand sort logic and build trust | Low | Low | Defer to Phase 5 (UX Polish) as delighter feature. Requires computed field in response schema. Frontend story would display tooltip or badge |
| 6 | **Filter analytics/telemetry**: Track which filter combinations are most used (e.g., "Store filter used 80% of time, Priority filter 45%") to optimize indexes and inform UX decisions (e.g., make common filters more prominent) | Low | Low | Defer to Phase 6+ (Observability) after MVP launch. Requires event tracking integration (e.g., PostHog, Segment). Analyze after 1,000+ active users |
| 7 | **Database composite index optimization**: Story recommends reviewing indexes for combined WHERE + ORDER BY but doesn't specify which composite indexes to add. EXPLAIN ANALYZE in AC18 will identify needs based on actual query patterns | Medium | Low | COVERED by AC18 - query plans will reveal index optimization opportunities. Add indexes only if EXPLAIN ANALYZE shows full table scans or high cost estimates |
| 8 | **Filter state persistence (URL query params)**: Save filter state in URL query parameters so users can bookmark or share filtered views (e.g., `/wishlist?store=LEGO&priority=3,5`). Requires URL state management in frontend | Medium | Low | Defer to Phase 5 (UX Polish). Frontend story (WISH-20172) should implement this as part of filter panel. Backend already supports required query format |
| 9 | **Combined filter validation rules**: No validation for contradictory filters (e.g., price range that returns no results for selected stores). Could provide user feedback: "No items found matching all filters. Try adjusting price range." | Low | Low | Defer to Phase 6+ (UX Polish). Would require dry-run query to check result count before final query. Adds complexity for marginal UX benefit |
| 10 | **Filter auto-suggest based on existing data**: Suggest filter values based on user's actual wishlist data (e.g., "You have items from 3 stores: LEGO (42), BrickLink (18), Amazon (5)"). Requires aggregation query to compute available filter values | Medium | Medium | Defer to Phase 6 (UX enhancement). Valuable for large wishlists (100+ items) but adds query overhead. Consider only if user testing shows filter discoverability issues |

## Categories

### Edge Cases
- **#2**: Filter validation (min <= max)
- **#3**: Partial matches (LIKE queries)
- **#4**: Multi-value null handling
- **#9**: Contradictory filter validation

### UX Polish
- **#1**: Filter preset persistence
- **#4**: Faceted search counts
- **#5**: Smart sort explanations
- **#8**: Filter state in URL
- **#10**: Filter auto-suggest

### Performance
- **#1** (Gaps): Cursor-based pagination
- **#2** (Enhancements): Query result caching
- **#7**: Database index optimization (covered by AC18)

### Observability
- **#6**: Filter analytics/telemetry

### API Evolution
- **#3** (Enhancements): GraphQL-style field selection

## Notes

### Priority Recommendations

**High Value, Low Effort (consider in Phase 5-6):**
- **#4 (Enhancement)**: Faceted search counts - improves filter discoverability
- **#5**: Smart sort explanations - helps users understand sorting
- **#8**: Filter state persistence - enables bookmarking/sharing

**Medium Value, Medium Effort (defer to Phase 6-7):**
- **#1 (Enhancement)**: Filter preset persistence - requires new story
- **#2 (Enhancement)**: Query result caching - requires infrastructure
- **#10**: Filter auto-suggest - UX improvement for large wishlists

**Low Priority (defer to Phase 7+):**
- **#1 (Gaps)**: Cursor pagination - only if analytics show need
- **#3 (Enhancement)**: Field selection - only if mobile bandwidth concerns
- **#6**: Analytics - after MVP launch with user base
- **#9**: Contradictory filter validation - marginal UX benefit

### Implementation Dependencies

- **#1 (Enhancement), #2 (Enhancement)**: Require infrastructure stories (database schema, Redis setup)
- **#4, #5, #8, #10**: Can be implemented independently as frontend + backend pairs
- **#6**: Depends on analytics platform integration (separate epic)
- **#7**: Covered by AC18 in this story - no separate story needed

### Schema Extension Considerations

If implementing enhancements in future stories, consider:
- **Filter presets**: New table `wishlist_filter_presets` with columns: id, user_id, name, filters_json, is_default
- **Faceted counts**: Extend response schema to include `facets: { stores: { LEGO: 42, BrickLink: 18 } }`
- **Sort explanations**: Add computed field `sortExplanation` to each item in response

All enhancements are deferred to post-MVP phases as they are not critical to the core user journey of filtering and sorting wishlist items. Priority should be determined after MVP launch based on:
1. User feedback (which features requested most)
2. Analytics (which filters used most, query performance patterns)
3. Technical metrics (database load, query latency, error rates)
