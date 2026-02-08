---
doc_type: story
title: "SETS-MVP-001: Unified Schema Extension"
story_id: SETS-MVP-001
story_prefix: SETS-MVP
status: code-review-failed
phase: 1
created_at: "2026-01-30T12:00:00-07:00"
updated_at: "2026-02-01T20:25:00Z"
depends_on: [WISH-2000]
estimated_points: 2
---

# SETS-MVP-001: Unified Schema Extension

## Goal

Extend the existing wishlist schema to support owned items, enabling a single unified data model for both wishlist and collection.

## Context

This story is part of the simplified Sets MVP that reuses the Wishlist feature instead of building a parallel Sets feature. A wishlist item is fundamentally "a set that hasn't been purchased yet" - this story adds the fields needed to track owned items.

## Feature

Add status field and owned-specific columns to the existing `wishlist_items` table (optionally renamed to `user_sets`).

## Acceptance Criteria

### Schema Changes
- [ ] AC1: Add `status` column with enum constraint ('wishlist' | 'owned'), default 'wishlist'
- [ ] AC2: Add `purchaseDate` timestamp column (nullable)
- [ ] AC3: Add `purchasePrice` text column for decimal precision (nullable)
- [ ] AC4: Add `purchaseTax` text column (nullable)
- [ ] AC5: Add `purchaseShipping` text column (nullable)
- [ ] AC6: Add `buildStatus` column with enum constraint ('in_pieces' | 'built'), nullable
- [ ] AC7: Add `statusChangedAt` timestamp column (nullable)
- [ ] AC8: Add composite index on `(userId, status, purchaseDate DESC)` for collection queries

### Zod Schema Updates
- [ ] AC9: Add `ItemStatusSchema` enum ('wishlist' | 'owned')
- [ ] AC10: Add `BuildStatusSchema` enum ('in_pieces' | 'built')
- [ ] AC11: Update `WishlistItemSchema` → `UserSetSchema` with new fields
- [ ] AC12: Create `MarkAsPurchasedSchema` for "Got it" flow input
- [ ] AC13: Create `UpdateBuildStatusSchema` for build status toggle

### Service Layer Changes
- [ ] AC21: Create/update `apps/api/lego-api/domains/wishlist/application/services.ts` to handle status filtering and new item status fields in service methods
- [ ] AC22: Implement default filter behavior: GET /api/wishlist with no status param returns only items where status='wishlist' for backward compatibility
- [ ] AC23: Add integration test in `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts` verifying default filter behavior and service layer handles new status enum correctly

### Migration
- [ ] AC14: Create migration file that adds columns without breaking existing data
- [ ] AC15: All existing rows default to `status = 'wishlist'`
- [ ] AC16: Migration is reversible (down migration removes new columns)

### Tests
- [ ] AC17: Schema validation tests for new enum fields
- [ ] AC18: Test default values (status='wishlist', buildStatus=null)
- [ ] AC19: Test that owned-specific fields can be null when status='wishlist'
- [ ] AC20: Integration test: existing wishlist queries still work unchanged

## Technical Details

### Database Changes

```sql
-- Add new columns
ALTER TABLE wishlist_items
  ADD COLUMN status TEXT NOT NULL DEFAULT 'wishlist',
  ADD COLUMN purchase_date TIMESTAMP,
  ADD COLUMN purchase_price TEXT,
  ADD COLUMN purchase_tax TEXT,
  ADD COLUMN purchase_shipping TEXT,
  ADD COLUMN build_status TEXT,
  ADD COLUMN status_changed_at TIMESTAMP;

-- Add constraints
ALTER TABLE wishlist_items
  ADD CONSTRAINT wishlist_items_status_check
    CHECK (status IN ('wishlist', 'owned')),
  ADD CONSTRAINT wishlist_items_build_status_check
    CHECK (build_status IS NULL OR build_status IN ('in_pieces', 'built'));

-- Add index for collection queries
CREATE INDEX idx_wishlist_items_collection
  ON wishlist_items (user_id, status, purchase_date DESC);
```

### Backward Compatibility

- All existing API endpoints continue to work unchanged
- `GET /api/wishlist` returns items where `status = 'wishlist'` (default filter)
- New `status` query param allows filtering: `?status=owned` or `?status=wishlist`

## Risk Notes

- Migration must be backward compatible - no downtime
- Existing integrations must not break

## Dependencies

- WISH-2000: Database Schema & Types (must be completed first)

## Out of Scope

- Collection view UI (SETS-MVP-002)
- "Got it" flow changes (SETS-MVP-003)
- Build status toggle (SETS-MVP-004)

## Definition of Done

- [ ] Migration created and tested locally
- [ ] Zod schemas updated with new types
- [ ] All existing tests pass (no regressions)
- [ ] New schema tests pass
- [ ] Code review completed

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-31_

### Gaps Identified
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Missing service layer specification | Add as AC | Added AC21: Create/update `apps/api/lego-api/domains/wishlist/application/services.ts` to handle status filtering and new item status fields in service methods |
| 2 | No default filter behavior specified | Add as AC | Added AC22: GET /api/wishlist with no status param defaults to status='wishlist' for backward compatibility |
| 3 | Missing stories.index.md entry | Add as AC | SETS-MVP-001 added to plans/future/wish/stories.index.md; also added AC23 for integration test verification |

### Enhancement Opportunities
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | statusChangedBy audit field | Skip | Track which user changed status (useful for shared accounts). Deferred to future audit logging story. |
| 2 | partially_built enum value | Skip | Some users may want to track partially assembled sets. Current enum only supports 'in_pieces' and 'built'. Consider adding 'partially_built' in future enhancement after user feedback. |
| 3 | Purchase price validation | Out-of-Scope | Story stores purchase price as text for decimal precision but does NOT specify validation rules. Consider adding min/max constraints and regex pattern for decimal format. Deferred to SETS-MVP-003 purchase flow. |
| 4 | purchaseCurrency field | Out-of-Scope | Story adds purchasePrice but does NOT add purchaseCurrency. Existing wishlist items have currency field but owned items do NOT. Consider adding purchaseCurrency enum in SETS-MVP-003. |
| 5 | totalPurchaseCost computed field | Out-of-Scope | Users may want to track total cost including tax and shipping. Consider adding computed field or database view. Deferred to collection stats feature. |
| 6 | Soft delete for purchased items | Skip | Currently, "Got it" flow may delete wishlist item after purchase. Consider soft delete pattern (deletedAt timestamp) to enable undo beyond 5s window. Deferred to future undo/recovery story. |

### Items Marked Out-of-Scope
- **Purchase price validation**: Decimal format constraints (e.g., /^\d+(\.\d{1,2})?$/) and min/max validation deferred to SETS-MVP-003 which handles purchase flow
- **purchaseCurrency field**: Currency tracking for owned items deferred to SETS-MVP-003 for purchase flow integration
- **totalPurchaseCost computed field**: Total cost calculation (price + tax + shipping) deferred to collection stats feature
- **statusChangedBy audit field**: Audit field for tracking status changes deferred to future audit logging implementation
- **Soft delete pattern**: Item recovery and undo functionality deferred to future enhancement beyond current 5s window
