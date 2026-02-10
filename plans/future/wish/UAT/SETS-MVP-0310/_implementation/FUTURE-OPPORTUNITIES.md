# Future Opportunities - SETS-MVP-0310

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Edge case: User enters tax/shipping without price | Low | Low | Clarify UX: either (a) disable tax/shipping until price entered, (b) show "Total: $X.XX (incomplete)" warning, or (c) allow and show "Tax + Shipping: $X.XX" without total. Defer to UX review. |
| 2 | Edge case: Build status case conversion | Low | Low | Story notes UI shows "In Pieces" but schema uses 'in_pieces'. Should add client-side validation or helper function to ensure proper conversion. Risk is low (enum validation will catch issues). |
| 3 | Edge case: No retail price available for pre-fill | Low | Low | Story mentions "Form shows empty price field" but doesn't specify whether to show placeholder text or helper text. Minor UX polish opportunity. |
| 4 | Missing price validation: negative values | Low | Low | Story validates decimals (0.00-999999.99 in SETS-MVP-0340) but AC5 doesn't mention backend validation for negative values. Schema has refine for pricePaid >= 0, but should verify tax/shipping also validated. |
| 5 | Currency handling not addressed | Medium | Medium | Story uses "price" field but doesn't address currency. Existing schema has `currency` field. Should purchase details capture currency or assume wishlist item currency? Defer to comprehensive currency story. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | UX: Total calculation real-time feedback | Medium | Low | AC6 shows calculated total, but could enhance with: (a) breakdown tooltip showing "Price: $X + Tax: $Y + Shipping: $Z", (b) currency formatting, (c) visual emphasis on total. Defer to SETS-MVP-0320 (Purchase UX Polish). |
| 2 | UX: Smart defaults for purchase date | Medium | Low | Story defaults to "today" but could enhance with: (a) suggest common dates (yesterday, last week), (b) calendar widget for easy selection, (c) remember user's typical purchase delay pattern. Valuable for users who batch-enter purchases. |
| 3 | UX: Price pre-fill intelligence | Medium | Medium | Story pre-fills with retail price "if available" but could enhance with: (a) show historical price trends, (b) suggest typical discount % based on store, (c) flag if entered price is significantly higher than retail (possible error). Requires price history data. |
| 4 | Performance: Optimistic UI update | Medium | Low | E2E test verifies item status updates, but could enhance with optimistic UI update (show in collection immediately, roll back on error). Improves perceived performance. Defer to SETS-MVP-0320. |
| 5 | Observability: Purchase analytics | Low | Low | Track purchase funnel: modal opened → details entered → skipped vs saved. Useful for understanding user behavior (do users enter details or skip?). Add analytics events in future observability story. |
| 6 | Integration: Receipt photo upload | High | High | Allow users to attach receipt photo with purchase details for record-keeping. Requires image upload flow (separate from wishlist image), storage consideration, privacy implications. Defer to future "purchase receipts" feature. |
| 7 | Integration: Import purchase history | High | High | Users may have historical purchases to import. Could build CSV import or integration with e-commerce platforms (BrickLink orders, LEGO.com order history). Major feature, defer to Phase 3+. |
| 8 | Power-user feature: Keyboard shortcuts | Low | Low | Form is "keyboard accessible" (AC20 in SETS-MVP-0340) but could add shortcuts: Cmd+Enter to save, Cmd+S to skip, Escape to cancel. Small delighter for power users. |
| 9 | Validation enhancement: Price reasonableness check | Low | Medium | Warn if price is significantly outside expected range (e.g., entering $10,000 for a $100 set, or $1 for a $500 set). Helps catch typos. Requires retail price data and threshold configuration. |
| 10 | Accessibility: Screen reader announcements | Medium | Low | Story specifies keyboard accessible but could enhance screen reader experience: announce calculated total change, announce field errors immediately, provide context for optional fields. Defer to comprehensive a11y audit. |

## Categories

### Edge Cases
- Tax/shipping without price (total calculation UX)
- Build status case conversion (snake_case vs display case)
- Missing retail price for pre-fill
- Negative value validation completeness
- Currency handling undefined

### UX Polish
- Total calculation breakdown and real-time feedback
- Smart purchase date suggestions
- Intelligent price pre-fill with trends
- Optimistic UI updates
- Keyboard shortcuts for power users

### Performance
- Optimistic UI update for status change
- Consider caching retail price for pre-fill

### Observability
- Purchase funnel analytics (opened → entered → saved/skipped)
- Track skip vs save ratio
- Monitor price entry patterns

### Integrations
- Receipt photo upload and storage
- Import purchase history from external sources (BrickLink, LEGO.com)
- Price trend data integration

### Accessibility
- Enhanced screen reader experience
- Field-level error announcements
- Context announcements for optional fields

### Future-Proofing
- Multi-currency purchase support (if user buys in different countries)
- Price reasonableness validation (catch typos)
- Purchase history export functionality
