# Future Opportunities - SETS-MVP-002

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No accessibility labels for build status badge | Medium | Low | Build status badge ("Built"/"In Pieces") should have aria-label for screen readers per WCAG 2.1 AA. |
| 2 | No keyboard navigation spec for collection cards | Medium | Low | Story does NOT specify keyboard focus management for collection cards - ensure Tab/Enter/Space work correctly per WCAG 2.1 keyboard accessibility. |
| 3 | No mobile responsive spec for build status badge | Low | Low | Story does NOT specify responsive behavior for build status badge on mobile (truncate/hide/abbreviate?). |
| 4 | No error state for failed API query | Low | Low | Story does NOT specify error handling if GET /api/wishlist?status=owned fails. Add error boundary or graceful degradation. |
| 5 | No loading state for collection query | Low | Low | Collection query may be slow on large datasets - consider skeleton loader while fetching items. |
| 6 | No pagination state preservation | Low | Low | If user navigates to /wishlist then back to /collection, pagination state is lost. Consider URL params or session storage. |
| 7 | No caching strategy for collection query | Low | Medium | Collection query may be expensive - consider RTK Query cache time or stale-while-revalidate pattern. |
| 8 | No purchase date display format specified | Low | Low | AC6 requires purchase date display but does NOT specify format (relative "2 days ago" vs absolute "2026-01-29"?). |
| 9 | No handling of missing purchase date | Low | Low | AC6 says "if available" but does NOT specify placeholder when purchaseDate is null (show empty space, "Unknown", or hide row?). |
| 10 | No transition animation from wishlist | Low | Medium | When user marks item as "Got It" and it moves to collection, no transition animation specified. Could enhance UX. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Build status filtering | High | Low | Users may want to filter by build status ("Show only built sets"). Add build status filter tab alongside store filters. |
| 2 | Quick build status toggle from card | High | Low | Users may want to toggle build status without opening detail view. Add toggle button to card actions menu. Requires SETS-MVP-004. |
| 3 | Bulk actions for collection items | Medium | High | Users may want to bulk update build status or bulk export collection. Add checkbox selection and bulk action toolbar. |
| 4 | Collection export to CSV/PDF | Medium | Medium | Users may want to export collection inventory for insurance or cataloging. Add export button in header. |
| 5 | Purchase date range filter | Medium | Medium | Users may want to filter by purchase date ("Sets purchased in 2025"). Add date range picker to filter bar. |
| 6 | Total value display/stats summary | Medium | Low | Collection page could show total sets count, total pieces, total spent. Deferred to SETS-MVP-003. |
| 7 | Collection sharing/public profile | High | High | Users may want to share collection publicly or with friends. Consider public /collection/:userId route with privacy settings. |
| 8 | Collection search by purchase date | Low | Low | Search currently filters by title/set number but NOT by purchase date. Consider advanced search UI. |
| 9 | Collection vs Wishlist comparison view | Medium | High | Users may want side-by-side view of wishlist and collection. Consider split-pane or tab view. |
| 10 | Build progress tracking | High | High | Beyond "Built" vs "In Pieces", users may want to track build progress (bags completed, steps completed). Requires schema changes. |
| 11 | Collection tagging separate from wishlist tags | Medium | Medium | Users may want collection-specific tags ("Display shelf", "Storage box A") distinct from wishlist tags. |
| 12 | Image gallery for built sets | Medium | Medium | Users may want to attach photos of their built sets, separate from product images. Requires new image upload flow. |
| 13 | Piece count verification | Low | Medium | After building, users may want to mark if all pieces were included or if any were missing. |
| 14 | Purchase receipt attachment | Low | High | Users may want to attach purchase receipts for warranty/insurance. Requires file upload infrastructure. |
| 15 | Sort by build status | Low | Low | Users may want to sort collection by build status (built sets first or last). |
| 16 | Sort by purchase price | Low | Low | Users may want to sort by purchase price (most expensive first) for insurance purposes. |

## Categories

- **Edge Cases**: Error handling for API failures (#4, #5), missing data (#8, #9)
- **UX Polish**: Loading states (#5), state preservation (#6), transition animations (#10)
- **Accessibility**: Screen reader labels (#1), keyboard navigation (#2), mobile responsive (#3)
- **Performance**: Query caching (#7)
- **Power User Features**: Bulk actions (#3), export (#4), advanced filtering (#1, #5, #8), sorting (#15, #16)
- **Observability**: Not identified in this story - consider analytics tracking for collection page views, filter usage, build status distribution
- **Integrations**: Public sharing (#7), comparison views (#9)
- **Future-Proofing**: Build progress (#10), collection-specific metadata (#11, #12, #13, #14), stats summary (#6 - deferred to SETS-MVP-003)

## Notes on Story v2 Changes

The following items from v1 FUTURE-OPPORTUNITIES have been **resolved** in v2:

- ~~Stats endpoint ambiguity~~ - Deferred to SETS-MVP-003 follow-up story (explicit out-of-scope for MVP)
- ~~No .http tests~~ - AC19 now specifies HTTP test file
- ~~No Playwright tests~~ - AC20 now specifies E2E test scenarios
- ~~Component wiring unclear~~ - AC18 now provides explicit CollectionPage code example
- ~~Navigation location not specified~~ - AC2 revised to specify Navigation.tsx component path
- ~~Service layer not specified~~ - AC16 now specifies service layer changes
- ~~Route adapter not specified~~ - AC17 now specifies route.ts changes

All critical MVP gaps have been addressed. The opportunities listed above are **non-blocking** enhancements for future iterations.
