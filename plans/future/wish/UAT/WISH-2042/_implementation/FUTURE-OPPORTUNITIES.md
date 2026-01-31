# Future Opportunities - WISH-2042

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No handling of quantity > 1 re-add failure rollback | Low | Medium | If re-add fails after purchase succeeds, user sees partial success. Add compensation logic or make re-add best-effort with clear messaging. |
| 2 | Browser close during transaction not handled | Low | High | Edge case where user closes browser mid-flight. Backend completes but frontend loses context. Accept as-is or add resume/recovery mechanism on next load. |
| 3 | Concurrent purchase in multiple tabs creates duplicate Sets | Low | Medium | Two tabs purchasing same item creates 2 Sets + deletes wishlist once. Add client-side locking or backend idempotency key. |
| 4 | S3 lifecycle policy for wishlist images not defined | Low | Low | When keepOnWishlist=false, story says "delete via S3 lifecycle or explicit delete" but doesn't specify which. Explicit delete cleaner but lifecycle more resilient. |
| 5 | Transaction isolation level not specified | Medium | Low | Story says "atomic" but doesn't specify SERIALIZABLE vs READ COMMITTED. Could impact concurrent purchases of same item. |
| 6 | Undo window persistence not considered | Low | Medium | User refreshes page during 5-second undo window → undo state lost. Accept or add sessionStorage persistence. |
| 7 | Toast "View in Sets" navigation timing unclear | Low | Low | Story says "optional navigation" but doesn't specify: navigate immediately, or only on link click? Clarify UX intent. |
| 8 | No logging/tracing for cross-domain transaction steps | Medium | Low | Complex transaction without structured logging makes debugging production issues difficult. Add trace IDs and step logging. |
| 9 | Image copy retries not defined | Low | Low | S3 copy failure logged as warning but no retry logic. Add exponential backoff retry or accept single-shot copy. |
| 10 | Wishlist deletion failure compensation unclear | Low | Medium | If Set created but Wishlist delete fails (logged as warning), how should user clean up? Manual deletion, background job, or ignore? |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Batch purchase of multiple items | High | High | User wants to mark 5 items as purchased at once. Requires batch API, UI multi-select, and compound transaction logic. High value for power users. |
| 2 | Purchase preview before commit | Medium | Medium | Show preview: "This will create Set X and remove from wishlist" with item comparison. Reduces accidental purchases. |
| 3 | Purchase history tracking | Medium | High | Users want to see "Purchased 3 items this month" analytics. Requires purchase_events table and dashboard. |
| 4 | Email receipt generation | Low | High | Send email confirmation of purchase with details. Requires email service integration (deferred per Non-goals). |
| 5 | Pre-fill all fields from wishlist metadata | Medium | Low | Story defers to WISH-2005 but could pre-fill tax/shipping estimates from user preferences. Small UX win. |
| 6 | Toast preview of new Set item | Medium | Medium | Story defers to WISH-2005. Show Set card thumbnail in toast for visual confirmation. Nice-to-have delighter. |
| 7 | Undo confirmation dialog | Low | Low | "Are you sure you want to undo?" before reverting. Prevents accidental undo clicks but adds friction. |
| 8 | Keep on wishlist: quantity adjustment | Medium | Medium | If quantity > 1 and "keep on wishlist", reduce wishlist quantity instead of deleting. Useful for collectors. |
| 9 | Analytics: purchase conversion tracking | Medium | Low | Track wishlist → Sets conversion rate. Deferred to WISH-2009 but high product value. |
| 10 | Transaction audit log | Low | Medium | Store transaction history: which wishlist item became which Set, when, by whom. Useful for support and debugging. |
| 11 | Progressive loading states | Low | Low | Story shows "Creating set record...", "Moving from wishlist...", "Done!" but could add progress bar (0% → 50% → 100%). |
| 12 | Optimistic UI for purchase | Medium | High | Similar to WISH-2032 (optimistic form submission), immediately show item in Sets gallery before API responds. Requires cache coordination. |
| 13 | Keyboard shortcuts for "Got It" modal | Low | Low | Story covers ESC/Enter but could add Ctrl+Enter for quick submit, Alt+K for "keep on wishlist" toggle. |
| 14 | Purchase date validation against release date | Low | Low | Warn if purchase date < release date ("Set not released yet - are you sure?"). Prevents data entry errors. |
| 15 | S3 image metadata preservation | Low | Low | Copy image metadata (upload date, original filename) from wishlist to Sets. Currently only copies bytes. |

## Categories

- **Edge Cases**: Concurrent operations, browser lifecycle, network failures, S3 failures
- **UX Polish**: Previews, confirmations, pre-filling, progressive states, keyboard shortcuts
- **Observability**: Logging, tracing, analytics, audit logs
- **Performance**: Optimistic UI, batch operations, retry logic
- **Integrations**: Email service, analytics platform
- **Data Quality**: Validation enhancements, metadata preservation, purchase history

---

## Notes

- **High-Impact Quick Wins**: #8 (logging/tracing), #4 (S3 lifecycle clarity), #14 (date validation) - low effort, meaningful quality improvements
- **Deferred to Other Stories**: Analytics (#9) → WISH-2009, UX polish (#5, #6) → WISH-2005, Optimistic UI (#12) → WISH-2032 patterns
- **Power User Features**: Batch purchase (#1), purchase history (#3), quantity adjustment (#8) - high value for collectors, defer to Phase 4
