# Story wish-2005: Undo Toast for Got It Flow

## Status

Draft

## Story

**As a** user who just marked a wishlist item as purchased,
**I want** a brief window to undo my action,
**so that** I can recover from accidental clicks without losing my wishlist item.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- Transition to Sets ("Got it" Flow)
- Undo capability

## Dependencies

- **wish-2004**: Modals & Transitions (backend undo token already implemented)

## Acceptance Criteria

1. After successful "Got It" submission, show toast with undo action
2. Toast displays 5-second countdown timer
3. Clicking "Undo" within window restores the wishlist item
4. If Set was created, undo also removes the Set record
5. Toast auto-dismisses after 5 seconds
6. Undo button disabled after timeout
7. Success toast shown after successful undo
8. Error handling if undo fails (token expired)

## Tasks / Subtasks

### Task 1: Create Undo API Endpoint

- [ ] Create `apps/api/endpoints/wishlist/undo-purchase/handler.ts`
- [ ] Validate undo token from Redis
- [ ] Restore wishlist item from cached data
- [ ] Delete Set record if created
- [ ] Invalidate Redis undo key after use

### Task 2: Add RTK Query Mutation

- [ ] Add `undoPurchase` mutation to wishlist-gallery-api.ts
- [ ] Configure cache invalidation

### Task 3: Create UndoToast Component

- [ ] Create `apps/web/app-wishlist-gallery/src/components/UndoToast/index.tsx`
- [ ] Countdown timer display (5, 4, 3, 2, 1)
- [ ] Undo button with loading state
- [ ] Auto-dismiss after timeout

### Task 4: Integrate with GotItModal

- [ ] Show UndoToast after successful purchase
- [ ] Pass undoToken from API response
- [ ] Handle undo success/failure

## Dev Notes

Backend already generates undo token in wish-2004:
```typescript
// From purchased/handler.ts
undoToken = generateUndoToken(itemId, userId)
// Stored in Redis: wishlist:undo:{itemId} with 5-sec TTL
```

## Testing

- [ ] Undo within 5 seconds restores item
- [ ] Undo after timeout shows error
- [ ] Countdown displays correctly
- [ ] Cache invalidates properly after undo

## Definition of Done

- [ ] Undo endpoint works with valid token
- [ ] Toast countdown displays correctly
- [ ] Undo restores wishlist item
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                        | Author |
| ---------- | ------- | ---------------------------------- | ------ |
| 2025-12-28 | 0.1     | Created from wish-2004 QA findings | Quinn  |
