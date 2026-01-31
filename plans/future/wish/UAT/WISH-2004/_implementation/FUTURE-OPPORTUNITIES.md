# Future Opportunities - WISH-2004

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | True undo functionality | Low | Medium | Story currently shows "Coming soon" toast for undo. Implement true undo requires: (1) Restore deleted wishlist item from soft delete, (2) Rollback Set creation, (3) 5-second undo window timer. Deferred to Phase 4 UX Polish (follow-up story). |
| 2 | Batch delete operations | Low | Medium | Currently single-item delete only. Batch delete would allow multi-select + delete in one operation. Requires: checkbox selection UI, bulk endpoint, optimistic updates. Deferred to Phase 4 UX Polish. |
| 3 | Batch purchase operations | Low | High | "Got It" for multiple items at once (e.g., purchased all items in one order). Complex UX for shared purchase details vs per-item details. Deferred to Phase 4+ based on user feedback. |
| 4 | Purchase history/audit trail | Medium | Medium | Track purchase events for analytics (when purchased, original price vs actual price, savings). Requires new `purchase_events` table. Deferred to Phase 5 Observability or future analytics story. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | True database transactions | High | High | Story notes (line 45): "True database transactions - Application-level atomicity (acceptable for MVP)". Current implementation uses ordered operations (Set creation before Wishlist deletion) to prevent data loss. For production at scale, implement PostgreSQL transactions or distributed transaction coordinator (e.g., AWS Step Functions). **Blocks:** None for MVP. **Recommendation:** Phase 6+ when scale requires it. |
| 2 | Optimistic S3 operations with retry | Medium | Medium | Currently S3 image copy/delete are "best effort" (lines 285-328 in services.ts). Failed operations log warnings but don't block. Enhancement: retry with exponential backoff, dead-letter queue for failed operations, async reconciliation job to fix orphaned images. **Impact:** Reduces orphaned images in S3. **Recommendation:** Phase 5 after observability infrastructure. |
| 3 | Toast notification customization | Low | Low | Current toast messages are hardcoded. Allow user preferences: duration, position, sound, dismiss behavior. Requires user preferences table. **Recommendation:** Phase 6 personalization feature. |
| 4 | Image preview in DeleteConfirmModal | Low | Low | Story shows item preview (thumbnail, title, set number, store) per AC 2. Consider adding image lightbox on click for users to verify correct item before deletion. **Recommendation:** Phase 4 UX Polish if user testing shows confusion. |
| 5 | "View in Sets" deep link context | Low | Low | Success toast has "View in Sets" button (AC 21). Currently links to Sets gallery. Enhancement: deep link to specific Set item detail page with highlight animation. **Recommendation:** Phase 4 UX Polish. |
| 6 | Purchase form validation enhancements | Low | Low | Current validation: price/tax/shipping decimal only, quantity >= 1 (AC 16-17). Enhancements: currency format validation, max quantity limits, purchase date cannot be in future, suggested tax rates by region. **Recommendation:** Phase 4 based on user feedback. |
| 7 | Image format conversion during copy | Low | Medium | When copying image from Wishlist to Sets, convert to optimized format (WebP, compression). Currently copies as-is. Requires image processing library in Lambda or async worker. **Recommendation:** Phase 5 performance optimization. |
| 8 | Keyboard shortcut for "Got It" | Low | Low | Currently requires mouse click to open modal. Add keyboard shortcut (e.g., Ctrl+G or P for "Purchase") on focused card. Deferred to WISH-2006 Accessibility story or Phase 4 UX Polish. |

## Categories

### Edge Cases
- Finding #1 (Undo functionality): Rare scenario (user regrets deletion immediately), but high user satisfaction when needed
- Finding #2-3 (Batch operations): Power-user feature, not common workflow

### UX Polish
- Finding #4-6: Delighters and usability improvements
- Finding #8: Keyboard power-user enhancements (aligns with WISH-2006)

### Performance
- Finding #7 (Image optimization): Reduces S3 storage costs and Sets page load time

### Observability
- Finding #4 (Purchase history): Analytics and business intelligence

### Scalability
- Finding #1 (True transactions): Required for production scale and ACID compliance
- Finding #2 (S3 retry/reconciliation): Required for reliability at scale

## Notes

**Story Status:** This story is a verification story for existing implementation (WISH-2041 delete flow, WISH-2042 purchase flow). Most enhancements here are systemic improvements that apply beyond this story's scope.

**Cross-Story Dependencies:**
- WISH-2006 (Accessibility): Keyboard shortcuts, focus management enhancements
- WISH-2008 (Authorization): Full ownership verification tests
- Phase 5 Observability: S3 retry, purchase history, audit trails
