---
doc_type: story
title: "SETS-MVP-0350: Batch Build Status Updates"
story_id: SETS-MVP-0350
story_prefix: SETS-MVP
status: pending
phase: 2
created_at: "2026-01-31T16:00:00-07:00"
updated_at: "2026-01-31T16:00:00-07:00"
depends_on: [SETS-MVP-004]
follow_up_from: SETS-MVP-004
estimated_points: 3
---

# SETS-MVP-0350: Batch Build Status Updates

## Follow-up Context

**Parent Story:** SETS-MVP-004 (Build Status Toggle)
**Source:** QA Discovery Notes - Follow-up Story #1
**Original Finding:** "Batch build status updates (mark multiple items as built in one action)"
**Category:** Enhancement Opportunity
**Impact:** Medium - Improves UX efficiency for users managing large collections
**Effort:** Medium - Requires multi-select UI, batch API endpoint, and progress feedback

## Context

SETS-MVP-004 introduced individual build status toggling for collection items. However, users with large collections (50+ sets) often want to mark multiple items as built at once - for example, after a building marathon or when catching up on status tracking.

This story extends the build status capability with batch operations, allowing users to:
- Select multiple collection items at once
- Apply build status changes to all selected items in a single operation
- See clear progress feedback during batch updates
- Handle partial failures gracefully (some items succeed, others fail)
- Undo batch operations if needed

## Goal

Enable users to efficiently update build status for multiple collection items simultaneously with clear progress feedback and error handling.

## Non-goals

- Not re-implementing single-item toggle functionality from SETS-MVP-004
- Not adding batch operations for other item properties (status, notes, etc.) - this is specifically for build status
- Not implementing advanced selection features (select by filter, select all visible, etc.) - just basic multi-select
- Not adding build date tracking (separate concern)

## Scope

### Endpoints/Surfaces

**Frontend:**
- `apps/web/app-wishlist-gallery/src/components/CollectionCard/` - Add multi-select checkbox
- `apps/web/app-wishlist-gallery/src/components/CollectionView/` - Add batch action toolbar
- `apps/web/app-wishlist-gallery/src/components/BatchActionToolbar/` - New component for batch operations
- `apps/web/app-wishlist-gallery/src/hooks/useBatchBuildStatus.ts` - New hook for batch operations

**Backend:**
- `apps/api/lego-api/domains/wishlist/routes.ts` - New batch endpoint
- `apps/api/lego-api/domains/wishlist/application/services.ts` - Batch update service method
- `apps/api/lego-api/domains/wishlist/adapters/__tests__/` - Batch operation tests

**API Endpoint:**
- `PATCH /api/wishlist/batch/build-status` - Update build status for multiple items

### Packages/Apps Affected

- `apps/web/app-wishlist-gallery` - Multi-select UI and batch operations
- `apps/api/lego-api` - Batch endpoint and service layer
- `packages/backend/database-schema` - No schema changes required (reuses existing columns)

## Acceptance Criteria

### Multi-select UI
- [ ] AC1: Each collection card displays a checkbox when in multi-select mode
- [ ] AC2: Clicking checkbox selects/deselects the item (doesn't trigger card navigation)
- [ ] AC3: Selected items show visual feedback (border highlight or background tint)
- [ ] AC4: Selection state persists while navigating within collection view
- [ ] AC5: Selection count displays in batch action toolbar: "X items selected"

### Batch Action Toolbar
- [ ] AC6: Toolbar appears when one or more items are selected
- [ ] AC7: Toolbar shows "Mark as Built" and "Mark as In Pieces" buttons
- [ ] AC8: Toolbar includes "Cancel" button to clear selection
- [ ] AC9: Toolbar is sticky/fixed at bottom of viewport for easy access
- [ ] AC10: Toolbar is keyboard accessible (Tab navigation, Enter/Space activation)

### Selection Modes
- [ ] AC11: "Select" button in collection view header toggles multi-select mode
- [ ] AC12: Entering multi-select mode shows checkboxes on all cards
- [ ] AC13: Exiting multi-select mode (Cancel button) clears all selections and hides checkboxes
- [ ] AC14: Keyboard shortcut (Ctrl/Cmd + Click) allows selecting individual cards without entering multi-select mode

### Batch API Endpoint
- [ ] AC15: `PATCH /api/wishlist/batch/build-status` accepts `{ itemIds: string[], buildStatus: 'built' | 'in_pieces' }`
- [ ] AC16: API validates all items exist and are owned by requesting user
- [ ] AC17: API validates all items have `status = 'owned'` before allowing update
- [ ] AC18: API processes updates in a transaction (all succeed or all fail)
- [ ] AC19: Returns success response: `{ updated: number, failed: number, errors: Array<{ itemId: string, reason: string }> }`

### Progress Feedback
- [ ] AC20: During batch operation, show progress indicator: "Updating X of Y items..."
- [ ] AC21: Progress indicator updates as each item is processed
- [ ] AC22: On completion, show summary toast: "X items marked as Built" or "X items marked as In Pieces"
- [ ] AC23: If partial failure, show warning toast: "X items updated, Y failed" with "View Details" button

### Error Handling
- [ ] AC24: If entire batch fails, revert all optimistic updates
- [ ] AC25: If partial failure, keep successful updates, revert failed items
- [ ] AC26: Error details show which items failed and why: "Item XYZ: Build status can only be set on owned items"
- [ ] AC27: User can retry failed items individually or as a new batch

### Undo Support
- [ ] AC28: After successful batch operation, show toast with "Undo" button
- [ ] AC29: Undo button reverts all items to their previous build status
- [ ] AC30: Undo action uses same batch endpoint with previous values
- [ ] AC31: Undo toast duration: 7000ms (longer than single-item undo to accommodate larger scope)

### Optimistic Updates
- [ ] AC32: All selected items update immediately in UI (before API response)
- [ ] AC33: Failed items revert to previous state with error indicator
- [ ] AC34: Successful items remain in new state with success indicator (brief checkmark animation)

### Backend Service Layer
- [ ] AC35: Create `batchUpdateBuildStatus(itemIds: string[], buildStatus: BuildStatus, userId: string)` method in services.ts
- [ ] AC36: Service method validates ownership and status for all items before processing
- [ ] AC37: Service method returns detailed results: `{ updated: string[], failed: Array<{ itemId: string, reason: string }> }`

### Input Validation & Schema
- [ ] AC38: Create `BatchBuildStatusInputSchema` with Zod: validates itemIds array (1-50 items max), buildStatus enum
- [ ] AC39: Return 400 error if itemIds array is empty or exceeds 50 items
- [ ] AC40: Return 400 error if buildStatus is not 'built' or 'in_pieces'

### Backend Testing
- [ ] AC41: Create `.http` test file with scenarios: batch update success (all items), partial failure (some items invalid), validation errors
- [ ] AC42: Add unit tests for `batchUpdateBuildStatus` service method

### Accessibility
- [ ] AC43: Multi-select checkboxes have proper ARIA labels: "Select [Set Name]"
- [ ] AC44: Batch action toolbar announces selection count changes to screen readers
- [ ] AC45: Keyboard users can navigate between checkboxes and toolbar actions
- [ ] AC46: Focus management: after batch action completes, focus returns to first updated item

### Performance
- [ ] AC47: Batch operations limit to 50 items per request (prevents timeouts)
- [ ] AC48: If user selects >50 items, show warning: "Maximum 50 items per batch. Please select fewer items."
- [ ] AC49: Batch API processes items in parallel where possible (not sequentially)

## Reuse Plan

### From SETS-MVP-004
- Reuses `BuildStatus` type and validation logic
- Reuses `updateBuildStatus` service method as basis for batch method
- Reuses toast notification patterns for feedback
- Reuses optimistic update patterns from single-item toggle
- Reuses accessibility patterns for keyboard interaction

### New Components
- `BatchActionToolbar` - Reusable for future batch operations (delete, change status, etc.)
- `useBatchBuildStatus` hook - Pattern for other batch operations
- Multi-select checkbox pattern - Reusable for other bulk actions

## Architecture Notes

### Transaction Handling

The batch update operation should use database transactions to ensure atomicity:

```typescript
// Pseudo-code for service layer
async batchUpdateBuildStatus(itemIds: string[], buildStatus: BuildStatus, userId: string) {
  const results = { updated: [], failed: [] }

  // Use transaction to ensure all-or-nothing updates
  await db.transaction(async (trx) => {
    for (const itemId of itemIds) {
      try {
        // Validate ownership and status
        const item = await trx.select().from(wishlistItems).where({ id: itemId, userId })
        if (!item || item.status !== 'owned') {
          results.failed.push({ itemId, reason: 'Invalid item or not owned' })
          continue
        }

        // Update build status
        await trx.update(wishlistItems).set({ buildStatus }).where({ id: itemId })
        results.updated.push(itemId)
      } catch (error) {
        results.failed.push({ itemId, reason: error.message })
      }
    }
  })

  return results
}
```

### Optimistic Update Strategy

Use React Query's `useMutation` with cache updates:

```typescript
const batchMutation = useMutation({
  mutationFn: batchUpdateBuildStatus,
  onMutate: async (variables) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['wishlist'] })

    // Snapshot previous values
    const previous = queryClient.getQueryData(['wishlist'])

    // Optimistically update cache
    queryClient.setQueryData(['wishlist'], (old) => {
      return old.map(item =>
        variables.itemIds.includes(item.id)
          ? { ...item, buildStatus: variables.buildStatus }
          : item
      )
    })

    return { previous }
  },
  onError: (err, variables, context) => {
    // Revert to previous state
    queryClient.setQueryData(['wishlist'], context.previous)
  },
  onSuccess: (data) => {
    // Handle partial failures
    if (data.failed.length > 0) {
      // Revert failed items only
      queryClient.setQueryData(['wishlist'], (old) => {
        return old.map(item =>
          data.failed.some(f => f.itemId === item.id)
            ? context.previous.find(p => p.id === item.id)
            : item
        )
      })
    }
  }
})
```

## Test Plan

### Happy Path
1. User enters multi-select mode
2. User selects 5 collection items
3. User clicks "Mark as Built"
4. All 5 items update immediately (optimistic)
5. API confirms success
6. Toast shows "5 items marked as Built" with Undo button
7. Items remain in "Built" state

### Error Cases
1. **Complete Failure**: All items fail validation
   - All items revert to previous state
   - Error toast shows: "Couldn't update build status"

2. **Partial Failure**: Some items succeed, others fail
   - Successful items remain updated
   - Failed items revert with error indicators
   - Warning toast: "3 items updated, 2 failed. View Details"
   - Details modal shows which items failed and why

3. **Network Error**: API request fails
   - All items revert to previous state
   - Error toast: "Network error. Please try again."

### Edge Cases
1. **Too Many Items**: User selects 75 items
   - Warning message: "Maximum 50 items per batch. Please select fewer items."
   - Batch action buttons disabled

2. **Mixed Status Items**: User selects items with different statuses (wishlist + owned)
   - Batch operation processes only valid items
   - Invalid items show in failed results: "Item XYZ: Build status can only be set on owned items"

3. **Concurrent Updates**: User triggers batch update while another is in progress
   - Previous operation completes first
   - New operation queues or shows "Please wait for current operation to complete"

4. **Undo After Navigation**: User performs batch update, navigates away, then returns
   - Undo option is no longer available (undo is session-based, not persisted)

## Risks / Edge Cases

### Performance
- **Risk**: Batch operations with 50 items could be slow
- **Mitigation**: Process updates in parallel where possible; show progress feedback; set reasonable timeout (10s)

### Partial Failures
- **Risk**: Complex to communicate which items succeeded vs. failed
- **Mitigation**: Clear UI for error details; option to retry failed items; keep successful updates (don't revert everything)

### Undo Complexity
- **Risk**: Undoing batch operations requires tracking previous state for all items
- **Mitigation**: Store previous values in mutation context; limit undo to current session only

### Selection State Management
- **Risk**: Selection state could get out of sync with backend data
- **Mitigation**: Clear selection after batch operation completes; refresh data after undo

## Open Questions

None - all requirements are clear and non-blocking.

## Definition of Done

- [ ] Multi-select UI works on collection cards
- [ ] Batch action toolbar appears with selection
- [ ] Batch API endpoint processes up to 50 items
- [ ] Progress feedback shows during operation
- [ ] Partial failure handling with error details
- [ ] Undo support for batch operations
- [ ] All tests pass (unit, integration, .http)
- [ ] Keyboard and screen reader accessible
- [ ] Code review completed
