# Future Opportunities - SETS-MVP-001

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No migration rollback test | Low | Low | Add test case for down migration in local dev environment. Story already includes reversible migration (AC16) but no test for rollback scenario. |
| 2 | Missing documentation for status transition rules | Medium | Low | Document valid status transitions: 'wishlist' → 'owned' is allowed, but 'owned' → 'wishlist' requires unpurchase endpoint (SETS-MVP-003). Add state machine diagram to story or architecture docs. |
| 3 | No composite index optimization test | Low | Low | Story adds index on (userId, status, purchaseDate DESC) but does NOT test query performance. Add integration test measuring query time for collection view with 1000+ items. |
| 4 | Missing error case: duplicate status field in existing rows | Low | Low | Migration assumes all existing rows are 'wishlist' status. Add test case for idempotent migration (running migration twice should not fail). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add statusChangedBy audit field | Medium | Low | Track which user changed the status (useful for shared accounts or admin actions). Add `statusChangedBy` text column alongside `statusChangedAt`. Deferred to future audit logging story. |
| 2 | Build status enum could include 'partially_built' | Low | Low | Some users may want to track partially assembled sets. Current enum only supports 'in_pieces' and 'built'. Consider adding 'partially_built' or 'building' state in future enhancement after user feedback. |
| 3 | Purchase price validation | Low | Medium | Story stores purchase price as text for decimal precision but does NOT specify validation rules. Consider adding min/max constraints (e.g., 0.01 to 999999.99) and regex pattern for decimal format (e.g., /^\d+(\.\d{1,2})?$/). Deferred to SETS-MVP-003 which handles purchase flow. |
| 4 | Currency field for purchase price | Medium | Medium | Story adds purchasePrice but does NOT add purchaseCurrency. Existing wishlist items have currency field but owned items do NOT. Consider adding purchaseCurrency enum in SETS-MVP-003 to track purchase currency separately from retail price currency. |
| 5 | Add totalPurchaseCost computed field | Low | Medium | Users may want to track total cost including tax and shipping. Consider adding computed field or database view: `COALESCE(purchase_price, 0) + COALESCE(purchase_tax, 0) + COALESCE(purchase_shipping, 0)`. Deferred to collection stats feature. |
| 6 | Soft delete for purchased items | Low | High | Currently, "Got it" flow may delete wishlist item after purchase. Consider soft delete pattern (deletedAt timestamp) to enable undo beyond 5s window. Deferred to future undo/recovery story. |

## Categories

- **Edge Cases**: Migration rollback test, idempotent migration test, duplicate status handling
- **UX Polish**: Build status enum expansion, status transition documentation
- **Performance**: Composite index optimization test
- **Observability**: Audit fields (statusChangedBy), purchase cost tracking
- **Integrations**: Currency field alignment between wishlist and owned items
