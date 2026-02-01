# Future Opportunities - WISH-20171

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Cursor-based pagination for large datasets**: Story uses offset pagination which can be slow for large result sets. Cursor-based pagination (keyset pagination) would improve performance for users with 10,000+ wishlist items | Low | Medium | Defer to Phase 7 (Performance Optimization). MVP offset pagination is sufficient for < 1,000 items |
| 2 | **Filter combination validation**: No validation for contradictory filter combinations (e.g., `?priority=5,3` where min > max). Zod schema should validate min <= max | Low | Low | Add to future story: Enhanced validation rules for filter parameters |
| 3 | **Partial filter matches**: No support for partial matches (e.g., store name contains "LEGO" instead of exact match). Would require LIKE queries | Low | Low | Defer to Phase 7 (Advanced Search) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Filter preset persistence**: Users cannot save commonly used filter combinations (e.g., "High Priority LEGO Sets"). Requires database schema for saved filters | Medium | High | Defer to Phase 5 (UX Polish) as noted in Non-goals |
| 2 | **Query result caching**: Repeated identical filter queries could be cached in Redis for 1-5 minutes to reduce database load. Especially valuable for common filter combinations | Medium | Medium | Defer to Phase 7 (Performance Optimization) after user behavior analysis identifies common patterns |
| 3 | **GraphQL-style field selection**: Allow clients to specify which fields to return (e.g., `?fields=id,title,price`) to reduce payload size for mobile clients | Low | Medium | Defer to Phase 8 (API Evolution) if mobile app adoption requires it |
| 4 | **Faceted search counts**: Return count of items per filter value (e.g., "LEGO: 42 items, BrickLink: 18 items") to help users understand available options before applying filters | Medium | Low | Defer to Phase 6 or 7 (UX enhancement) - valuable for filter discoverability |
| 5 | **Smart sort algorithm explanations**: Include explanation in response for why items ranked in a particular order (e.g., "Best Value: $0.11/piece"). Helps users understand sort logic | Low | Low | Defer to Phase 5 (UX Polish) as delighter feature |
| 6 | **Filter analytics/telemetry**: Track which filter combinations are most used to optimize indexes and inform UX decisions | Low | Low | Defer to Phase 6+ (Observability) after MVP launch |
| 7 | **Database index optimization**: Story recommends reviewing indexes for combined WHERE + ORDER BY but doesn't specify which composite indexes to add. EXPLAIN ANALYZE in AC18 will identify needs | Medium | Low | COVERED by AC18 - query plans will reveal index optimization opportunities |

## Categories

- **Edge Cases**: #2 (filter validation), #3 (partial matches)
- **UX Polish**: #1 (filter presets), #4 (faceted counts), #5 (sort explanations)
- **Performance**: #1 (cursor pagination), #2 (query caching), #7 (index optimization)
- **Observability**: #6 (filter analytics)
- **API Evolution**: #3 (field selection)

## Notes

- All enhancements are deferred to post-MVP phases as they are not critical to the core user journey
- Priority should be determined after MVP launch based on user feedback and analytics
- Filter preset persistence (#1) and faceted counts (#4) have highest user impact but require additional stories
