# Future Opportunities - WISH-2014

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Best Value with zero price: Items priced at $0.00 treated as missing (placed at end per AC15) | Low | Low | Consider separate sort option "Free Items" (price = 0) or user preference to include/exclude zero-price items from Best Value calculation |
| 2 | Hidden Gems priority semantics: Priority 0 may mean "unset" rather than "lowest priority" for some users | Low | Low | Add tooltip in form explaining priority scale (0=highest to 5=lowest) to align user expectations with Hidden Gems algorithm |
| 3 | Expiring Soon lacks retirement status context: Users cannot distinguish "old but still available" from "actually retiring soon" | Medium | High | Requires external API integration (Brickset, Rebrickable) to fetch retirement status - defer to separate story WISH-20XX |
| 4 | Smart sorts assume universal preferences: "Best Value" assumes lower price/piece is always better, but collectors may prefer larger sets | Low | Medium | Defer to user preferences story (allow custom sort weights or algorithm selection) |
| 5 | Fixed sort direction for smart sorts: Best Value always ascending, Hidden Gems always descending per story design | Low | Low | Add optional sort direction toggle (asc/desc) for smart sorts in future iteration - Phase 5 UX polish |
| 6 | Currency normalization absent: Best Value calculation doesn't account for multi-currency items | Medium | High | Deferred to Phase 6 (Internationalization) per Non-goals section - requires exchange rate service |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Sort preference persistence: Users must re-select smart sort on each visit | Medium | Medium | Add user preference storage (localStorage or backend) to remember last sort choice - defer to WISH-2XXX (saved preferences story) |
| 2 | Custom sort builder: Power users want multi-field sorts (e.g., "Expiring Soon + Best Value") | Low | High | Add advanced sort UI with drag-and-drop sort criteria builder - Phase 5 UX polish |
| 3 | Sort preview tooltips: Show calculated values on cards (e.g., "$0.12/piece" on hover) | Medium | Medium | Enhance WishlistCard to show calculated metrics on hover/focus - improves discovery UX and transparency |
| 4 | Smart sort badges on cards: Visual indicator showing why item ranked (e.g., "🏆 Best Value #1") | Medium | Medium | Add badge system to WishlistCard component - helps users understand sort results |
| 5 | Sort usage analytics: Track which smart sorts are most popular to inform future prioritization | Low | Low | Add analytics events for sort selection (track: sort_mode_selected, sort_mode, timestamp) - analytics package already exists |
| 6 | Sort + filter combinations: Visual indicator that filters are active with smart sorting | High | Low | Already supported by current design (filters + sort are independent) - needs user education/discovery enhancement |
| 7 | SQL-level sorting optimization: Migrate calculated sorts from service layer to PostgreSQL | Medium | Medium | Add when dataset grows beyond 1000 items or P95 latency exceeds 2s threshold - monitor via AC16 performance tests |
| 8 | Data quality dashboard: Surface items with missing critical fields (price, pieceCount, releaseDate) | Medium | Medium | Add "Data Quality" view showing completion metrics per sort mode - helps users improve sort accuracy |
| 9 | Sort explanation tooltips: "Why is this item ranked here?" breakdown on each card | Medium | High | Add explanation engine showing calculation (e.g., "2,685 pieces ÷ $399.99 = $0.15/piece = Best Value #3") - Phase 5 UX polish |
| 10 | Mobile-optimized sort picker: Current dropdown may be cramped on small screens | Medium | Medium | Design mobile-specific sort UI (bottom sheet with icon grid) - defer to mobile optimization story |
| 11 | Visual sort indicators on cards: Show price-per-piece ratio, release year badges | Medium | Medium | Deferred per WISH-2014 Non-goals ("Visual indicators on WishlistCard") - tracked for Phase 5 |
| 12 | Animated re-ordering: Smooth transitions when sort mode changes | Low | Medium | Add Framer Motion layout animations to gallery grid - Phase 5 UX polish |

## Categories

### Edge Cases
- **Gap #1**: Zero-price items in Best Value calculation (treated as null per AC2)
- **Gap #2**: Unset priority vs explicit low priority in Hidden Gems (priority=0 has highest weight per AC4)
- **Gap #5**: Fixed sort direction for smart sorts (consider toggle in future)

### UX Polish
- **Enhancement #3**: Sort preview tooltips showing calculated values on cards
- **Enhancement #4**: Smart sort badges on cards (visual rank indicators)
- **Enhancement #9**: Smart sort explanation engine with calculation breakdown
- **Enhancement #10**: Mobile-optimized sort picker (bottom sheet UI)
- **Enhancement #11**: Visual sort indicators on cards (deferred per Non-goals)
- **Enhancement #12**: Animated re-ordering transitions

### Performance
- **Enhancement #7**: SQL-level sorting optimization for large datasets
  - Monitor: P95 query latency via AC16 performance tests
  - Threshold: 2s for 1000+ items (current baseline)
  - Action: Migrate to PostgreSQL functions or materialized views when threshold breached

### Observability
- **Enhancement #5**: Sort usage analytics (track selection patterns)
- **Enhancement #8**: Data quality validation dashboard (completion metrics)

### Integrations
- **Gap #3**: Retirement status from external APIs (Brickset, Rebrickable) for Expiring Soon context
- **Gap #6**: Currency exchange rates for multi-currency Best Value (Phase 6 - Internationalization)
- Future: Price history tracking for "Price Trend" sorting (requires LEGO price API)

### User Preferences
- **Enhancement #1**: Saved sort preferences (localStorage or backend persistence)
- **Enhancement #2**: Custom sort builder (advanced power-user feature)
- **Gap #4**: Sort algorithm customization (user-defined weights)

### Discovery & Education
- **Enhancement #6**: Sort + filter combinations (already works - needs visual indicator)
- Consider: Onboarding tour highlighting smart sort options (Phase 5)
- Consider: "Sort Tips" feature discovery cards (Phase 5)
