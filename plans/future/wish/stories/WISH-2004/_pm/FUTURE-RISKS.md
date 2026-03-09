# WISH-2004: Future Risks and Scope Refinements

## Non-MVP Risks

### Risk 1: True Database Transaction for Purchase Flow

- **Risk:** Current implementation uses application-level checks (create Set, then delete Wishlist) rather than database transaction
- **Impact:** Edge case where concurrent requests or crashes could leave inconsistent state
- **Recommended timeline:** Phase 2, after core features stable
- **Mitigation:** Wrap purchase operation in Drizzle transaction with proper rollback

### Risk 2: Image Orphaning on S3

- **Risk:** If Set creation succeeds but wishlist deletion fails, image may be duplicated; if image copy fails, Set has no image
- **Impact:** Storage costs, missing images in Sets
- **Recommended timeline:** Phase 2
- **Mitigation:** Add S3 lifecycle rules to clean orphaned images, add retry logic for copy operations

### Risk 3: Concurrent Purchase Attempts

- **Risk:** User double-clicks "Add to Collection" before loading state engages
- **Impact:** Potential duplicate Set creation
- **Recommended timeline:** Phase 2
- **Mitigation:** Add debounce/throttle on mutation, check for existing Set with wishlistItemId before creating

### Risk 4: Large Scale Performance

- **Risk:** Delete/purchase operations may slow down with large wishlist sizes
- **Impact:** Poor UX for power users
- **Recommended timeline:** Phase 3
- **Mitigation:** Add database indexes, optimize RTK Query cache invalidation

---

## Scope Tightening Suggestions

### OUT OF SCOPE for WISH-2004 (Already Documented)

1. **Undo functionality** - Toast shows placeholder, actual undo is future work
2. **Batch delete** - Single item delete only in MVP
3. **Batch purchase** - Single item purchase only in MVP
4. **Purchase history** - No audit trail of purchases in MVP

### Clarifications for Future Iterations

1. **"Keep on wishlist" semantics:** Should kept items be marked differently? (e.g., "purchased" badge)
2. **Multiple purchases:** Can user mark same item as purchased multiple times? (creates multiple Sets)
3. **Purchase undo:** Should undo delete the Set and restore the wishlist item?

---

## Future Requirements

### Nice-to-Have Requirements

1. **Purchase analytics:** Track purchase totals, average savings vs. MSRP
2. **Purchase confirmation email:** Notify user of successful transition
3. **Set linking:** Link wishlist item to existing Set instead of creating new
4. **Partial purchase:** Mark item as "ordered" vs "received"

### Polish and Edge Case Handling

1. **Optimistic delete UI:** Show item as deleted immediately, rollback on failure
2. **Offline support:** Queue delete/purchase for when connection restores
3. **Rate limiting:** Prevent rapid-fire delete/purchase operations
4. **Conflict resolution:** Handle case where item was deleted by another session

---

## Dependencies on Other Stories

| Dependency | Blocking | Notes |
|------------|----------|-------|
| WISH-2008 (Authorization) | No | Basic ownership checks implemented, comprehensive testing deferred |
| Sets domain | No | Already integrated for purchase flow |
| S3 infrastructure | No | Already configured for wishlist images |
