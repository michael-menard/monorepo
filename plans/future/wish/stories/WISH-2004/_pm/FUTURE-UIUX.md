# WISH-2004: Future UI/UX Enhancements

## UX Polish Opportunities

### 1. Undo Delete with Soft Delete

**Current:** Delete is permanent, toast has no functional undo
**Enhancement:** Implement soft delete with 5-second TTL, allow undo via toast button

**Implementation:**
- Add `deletedAt` column to wishlist_items
- DELETE endpoint marks as deleted instead of removing
- Background job purges after TTL
- Toast undo button calls restore endpoint

### 2. Toast Progress Animation

**Current:** Toast shows static text during delete/purchase
**Enhancement:** Add animated progress indicator in toast

### 3. Modal Exit Animation

**Current:** Modals close immediately
**Enhancement:** Add fade-out/scale-down animation on close

### 4. Confetti on Purchase

**Current:** Success toast only
**Enhancement:** Add celebratory confetti animation when item transitions to Sets

---

## Accessibility Enhancements

### 1. Live Region Announcements

**Current:** Status regions for loading states
**Enhancement:** Add screen reader announcements for:
- "Item deleted successfully"
- "Item added to your collection"
- Progress updates during purchase flow

### 2. High Contrast Mode

**Current:** Standard color scheme
**Enhancement:** Support forced-colors media query for delete button

### 3. Reduced Motion

**Current:** Loading spinner always animates
**Enhancement:** Respect `prefers-reduced-motion` media query

---

## UI Improvements

### 1. Delete Batch Mode

**Current:** Single item delete via modal
**Enhancement:** Multi-select with batch delete confirmation

### 2. Purchase Quick Actions

**Current:** Full modal form
**Enhancement:** Quick "Got It" action with defaults, skip form for simple purchases

### 3. Mobile Swipe Gestures

**Current:** Button-based actions only
**Enhancement:** Swipe left to delete, swipe right for "Got It"

### 4. Toast Action Grouping

**Current:** Individual toasts per action
**Enhancement:** Group multiple rapid actions into single toast with count

---

## Related Follow-up Stories

| Enhancement | Priority | Effort |
|-------------|----------|--------|
| Undo delete | Medium | Medium |
| Toast animations | Low | Low |
| Confetti on purchase | Low | Low |
| Live region announcements | Medium | Low |
| Batch delete | Medium | High |
| Mobile gestures | Low | Medium |
