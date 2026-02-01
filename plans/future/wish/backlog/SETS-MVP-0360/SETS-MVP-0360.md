---
doc_type: story
title: "SETS-MVP-0360: Build History and Date Tracking"
story_id: SETS-MVP-0360
story_prefix: SETS-MVP
status: backlog
follow_up_from: SETS-MVP-004
created_at: "2026-01-31T16:00:00-07:00"
updated_at: "2026-01-31T16:00:00-07:00"
depends_on: [SETS-MVP-004]
estimated_points: 3
---

# SETS-MVP-0360: Build History and Date Tracking

## Follow-up Context

**Parent Story:** SETS-MVP-004 (Build Status Toggle)
**Source:** QA Discovery Notes - Follow-up Stories Suggested
**Original Finding:** "Build history and date tracking (when was item marked built)"
**Category:** Enhancement Opportunity
**Impact:** Medium - Adds value for collectors who want to track build timeline
**Effort:** Medium - Requires schema changes, backend service updates, and frontend display components

## Context

Users who actively build their LEGO sets want to know when they completed a build, not just whether it's currently built. This is especially valuable for collectors who:

- Want to remember when they built a set
- Track their building activity over time
- See how long sets have been in their collection before being built
- Reference build history for planning future builds

The parent story (SETS-MVP-004) implemented basic build status toggling, but didn't capture temporal data. This follow-up extends that foundation to add historical tracking.

## Goal

Enable users to see when they marked items as built and maintain a history of build status changes over time, providing timeline context for their collection.

## Non-goals

- Photo uploads for builds
- Build notes or commentary
- Build instructions integration
- Social features (sharing builds)
- Build progress tracking (% complete)
- Time tracking (how long build took)
- Re-implementing functionality from SETS-MVP-004

## Scope

### Packages/Apps Affected

- `packages/backend/database-schema` - Schema migration for build history tracking
- `apps/api/lego-api/domains/wishlist` - Service layer updates for timestamp tracking
- `apps/web/app-wishlist-gallery` - UI components for displaying build dates and history

### Database Schema Changes

**Add to `wishlist_items` table:**
- `build_completed_at` (timestamp, nullable) - When item was last marked as built

**New table: `wishlist_item_build_history`**
- `id` (uuid, primary key)
- `item_id` (uuid, foreign key to wishlist_items)
- `user_id` (uuid, indexed for query performance)
- `previous_status` (enum: 'in_pieces' | 'built')
- `new_status` (enum: 'in_pieces' | 'built')
- `changed_at` (timestamp, default now())
- `changed_by` (uuid, foreign key to users - for future multi-user support)

### Endpoints

**No new endpoints required** - extends existing PATCH /api/wishlist/:id

## Acceptance Criteria

### Database Schema

- [ ] AC1: Add `build_completed_at` timestamp column to `wishlist_items` table (nullable, indexed)
- [ ] AC2: Create `wishlist_item_build_history` table with columns: id, item_id, user_id, previous_status, new_status, changed_at, changed_by
- [ ] AC3: Add foreign key constraint from build_history.item_id to wishlist_items.id with CASCADE delete
- [ ] AC4: Add index on build_history.item_id for efficient timeline queries
- [ ] AC5: Add index on build_history.user_id for user-scoped queries
- [ ] AC6: Create Drizzle schema definitions in `packages/backend/database-schema/src/schema/wishlist-item-build-history.ts`
- [ ] AC7: Create Zod schemas for build history types: `BuildHistoryEntrySchema`, `BuildHistoryListSchema`

### Backend Service Layer

- [ ] AC8: Update `updateBuildStatus` service method to set `build_completed_at = now()` when status changes to 'built'
- [ ] AC9: Update `updateBuildStatus` to clear `build_completed_at = null` when status changes to 'in_pieces'
- [ ] AC10: Update `updateBuildStatus` to create build history entry with previous_status, new_status, changed_at, changed_by (user_id)
- [ ] AC11: Add `getBuildHistory(itemId: string, userId: string)` service method that returns chronological list of build status changes
- [ ] AC12: Service validates user owns item before returning build history (authorization check)

### API Response Updates

- [ ] AC13: Include `build_completed_at` field in GET /api/wishlist/:id response
- [ ] AC14: Include `build_completed_at` field in GET /api/wishlist list response for owned items
- [ ] AC15: PATCH /api/wishlist/:id response includes updated `build_completed_at` value after status change

### Frontend Display - Build Date Badge

- [ ] AC16: Display "Built on [date]" badge on collection cards when buildStatus='built' and build_completed_at exists
- [ ] AC17: Date format: "Built on Jan 15, 2026" using relative or absolute format based on recency
- [ ] AC18: Badge positioned near build status toggle, visually grouped with build information
- [ ] AC19: Badge uses secondary/muted styling to avoid competing with primary card content

### Frontend Display - Item Detail View

- [ ] AC20: Show "Built on [date]" in item detail view when buildStatus='built'
- [ ] AC21: Show "In Pieces since [date]" when buildStatus='in_pieces' and item was previously built
- [ ] AC22: Date display includes relative time (e.g., "Built 3 days ago" for recent, "Built on Dec 1, 2025" for older)

### Build History Timeline (Optional for MVP)

- [ ] AC23: Add collapsible "Build History" section in item detail view
- [ ] AC24: Timeline shows chronological list of status changes: date, previous status, new status
- [ ] AC25: Timeline entry format: "Jan 15, 2026 - Marked as Built" / "Jan 20, 2026 - Marked as In Pieces"
- [ ] AC26: Timeline limited to last 10 entries (pagination if needed)
- [ ] AC27: Empty state when no history exists: "No build history yet"

### Backend Testing

- [ ] AC28: Add .http test scenarios: mark item as built (verify build_completed_at set), mark as in_pieces (verify build_completed_at cleared), verify build history entry created
- [ ] AC29: Add unit tests for getBuildHistory service method: empty history, single entry, multiple entries, authorization check

### Migration & Rollback

- [ ] AC30: Migration script creates new columns and table safely (no data loss)
- [ ] AC31: Migration includes rollback script to remove build_completed_at and drop build_history table
- [ ] AC32: Existing items have null build_completed_at initially (no backfill required)

### Type Safety

- [ ] AC33: Update TypeScript types to include `build_completed_at?: string | null` in WishlistItem interface
- [ ] AC34: Create BuildHistoryEntry Zod schema and TypeScript type with all required fields
- [ ] AC35: Update API response Zod schemas to include build_completed_at field

### Accessibility

- [ ] AC36: Build date badge has appropriate ARIA label: "Build completion date: January 15, 2026"
- [ ] AC37: Build history timeline is keyboard navigable and screen reader accessible

## Technical Details

### Database Migration

```sql
-- Migration: Add build tracking fields
ALTER TABLE wishlist_items
ADD COLUMN build_completed_at TIMESTAMP;

CREATE INDEX idx_wishlist_items_build_completed_at
ON wishlist_items(build_completed_at);

CREATE TABLE wishlist_item_build_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES wishlist_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  previous_status TEXT NOT NULL CHECK (previous_status IN ('in_pieces', 'built')),
  new_status TEXT NOT NULL CHECK (new_status IN ('in_pieces', 'built')),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL
);

CREATE INDEX idx_build_history_item_id ON wishlist_item_build_history(item_id);
CREATE INDEX idx_build_history_user_id ON wishlist_item_build_history(user_id);
CREATE INDEX idx_build_history_changed_at ON wishlist_item_build_history(changed_at DESC);
```

### Zod Schema Example

```typescript
import { z } from 'zod'

export const BuildHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  userId: z.string().uuid(),
  previousStatus: z.enum(['in_pieces', 'built']),
  newStatus: z.enum(['in_pieces', 'built']),
  changedAt: z.string().datetime(),
  changedBy: z.string().uuid(),
})

export type BuildHistoryEntry = z.infer<typeof BuildHistoryEntrySchema>

export const BuildHistoryListSchema = z.array(BuildHistoryEntrySchema)
```

### Service Layer Update

```typescript
// In apps/api/lego-api/domains/wishlist/application/services.ts

export async function updateBuildStatus(
  itemId: string,
  buildStatus: BuildStatus,
  userId: string
): Promise<WishlistItem> {
  // Existing validation...

  const currentItem = await getItemById(itemId)

  // Update build_completed_at based on new status
  const updates = {
    buildStatus,
    buildCompletedAt: buildStatus === 'built' ? new Date().toISOString() : null,
  }

  // Create build history entry
  await createBuildHistoryEntry({
    itemId,
    userId,
    previousStatus: currentItem.buildStatus,
    newStatus: buildStatus,
    changedBy: userId,
  })

  return await updateItem(itemId, updates)
}

export async function getBuildHistory(
  itemId: string,
  userId: string
): Promise<BuildHistoryEntry[]> {
  // Verify ownership
  const item = await getItemById(itemId)
  if (item.userId !== userId) {
    throw new Error('Unauthorized')
  }

  return await db
    .select()
    .from(wishlistItemBuildHistory)
    .where(eq(wishlistItemBuildHistory.itemId, itemId))
    .orderBy(desc(wishlistItemBuildHistory.changedAt))
    .limit(10)
}
```

### Frontend Component Example

```typescript
// BuildDateBadge component
interface BuildDateBadgeProps {
  buildCompletedAt: string | null
  buildStatus: 'in_pieces' | 'built'
}

export function BuildDateBadge({ buildCompletedAt, buildStatus }: BuildDateBadgeProps) {
  if (buildStatus !== 'built' || !buildCompletedAt) return null

  const formattedDate = formatBuildDate(buildCompletedAt)

  return (
    <Badge
      variant="secondary"
      aria-label={`Build completion date: ${formattedDate}`}
    >
      Built on {formattedDate}
    </Badge>
  )
}
```

## Reuse Plan

**Builds on SETS-MVP-004:**
- Extends existing `updateBuildStatus` service method
- Uses same PATCH /api/wishlist/:id endpoint
- Reuses BuildStatusToggle UI component (no changes needed)
- Leverages existing authorization checks

**Shared Components:**
- Badge component from @repo/ui
- Date formatting utilities from shared utils
- Existing collection card layout and styling

## Test Plan

### Happy Path

1. User marks owned item as "Built"
   - Verify `build_completed_at` timestamp is set to current time
   - Verify build history entry created with previous='in_pieces', new='built'
   - Verify "Built on [date]" badge appears on collection card
   - Verify date appears in item detail view

2. User marks built item back to "In Pieces"
   - Verify `build_completed_at` is cleared (null)
   - Verify build history entry created with previous='built', new='in_pieces'
   - Verify "Built on" badge disappears
   - Verify "In Pieces since [date]" shown in detail view

3. User views build history timeline
   - Verify all status changes appear chronologically
   - Verify dates and status labels are correct
   - Verify timeline is accessible and keyboard navigable

### Error Cases

1. Attempt to get build history for item user doesn't own
   - Expect 403 Forbidden error
   - Verify no data leaked

2. Database migration fails
   - Verify rollback script restores previous state
   - Verify no data loss

### Edge Cases

1. Item never marked as built
   - Verify `build_completed_at` is null
   - Verify no "Built on" badge shown
   - Verify build history is empty

2. Item toggled multiple times in short period
   - Verify all transitions recorded in history
   - Verify timestamps are accurate and ordered
   - Verify timeline displays correctly

3. Very old build date (years ago)
   - Verify date formatting uses absolute format, not relative
   - Verify no date parsing errors

4. Item with extensive build history (>10 entries)
   - Verify only last 10 entries shown
   - Verify performance is acceptable
   - Verify pagination works if implemented

## Risk Notes

**Database Migration:**
- Adding nullable column is safe (no existing data affected)
- New table has no dependencies on existing data
- Rollback script tested to ensure clean removal

**Performance:**
- Build history queries are item-scoped (small result sets)
- Indexes on item_id and changed_at ensure fast lookups
- Timeline limited to 10 entries prevents excessive data transfer

**User Experience:**
- Date display should be clear and not clutter the UI
- Timeline is optional/collapsible to avoid overwhelming users
- Badge styling should be subtle and not distract from card content

## Open Questions

None - all requirements are clear and implementation path is straightforward.

## Dependencies

- SETS-MVP-004: Build Status Toggle (must be completed first)
  - Provides the base toggle functionality
  - Establishes the updateBuildStatus service method
  - Creates the UI patterns this story extends

## Out of Scope

- Photo uploads for builds (future enhancement)
- Build notes or commentary (future enhancement)
- Build progress tracking (% complete)
- Time tracking for how long build took
- Build quality ratings or reviews
- Exporting build history data
- Notifications when friend marks set as built

## Definition of Done

- [ ] Database migration creates build_completed_at column and build_history table
- [ ] Backend service updates build_completed_at on status changes
- [ ] Backend creates build history entries for all status toggles
- [ ] Frontend displays "Built on [date]" badge on collection cards
- [ ] Frontend shows build date in item detail view
- [ ] Build history timeline works (if implemented)
- [ ] All acceptance criteria met
- [ ] Unit tests pass for new service methods
- [ ] .http tests verify timestamp and history tracking
- [ ] Playwright E2E tests verify date display
- [ ] Code review completed
- [ ] Migration tested with rollback
