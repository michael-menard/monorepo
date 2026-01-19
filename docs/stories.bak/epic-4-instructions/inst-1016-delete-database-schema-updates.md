# Story 3.1.47: Delete Database Schema Updates

## GitHub Issue
- Issue: #270
- URL: https://github.com/michael-menard/monorepo/issues/270
- Status: Todo

## Status

Draft

## Story

**As a** platform developer,
**I want** the database schema updated to support soft-delete,
**so that** MOC instructions can be marked as deleted without immediate data loss.

## Epic Context

This is **Story 1.1 of Epic 1: Backend Delete Pipeline** from the Delete MOC Instructions PRD.

This story has a **dependency on Edit PRD Story 3.1.28** which adds the `deleted_at` column to `moc_instructions`. This story adds the supporting schema change for bricks preservation.

## Blocked By

- Story 3.1.28 (DB Schema Migration for Edit) — adds `deleted_at` column

## Acceptance Criteria

1. `mocParts.partsListId` column made nullable (for brick preservation on cleanup)
2. `mocParts.status` enum includes 'available' state (may already exist)
3. Migration is backward compatible (no data loss)
4. Drizzle schema types updated
5. Migration tested in development environment

## Tasks / Subtasks

- [ ] **Task 1: Verify Edit PRD Migration** (AC: 1)
  - [ ] Confirm Story 3.1.28 is complete and `deleted_at` column exists
  - [ ] Review existing `mocParts` schema in `apps/api/core/database/schema/`

- [ ] **Task 2: Create Migration for mocParts** (AC: 1, 2)
  - [ ] Create migration file: `apps/api/core/database/migrations/XXXX_delete_schema_updates.ts`
  - [ ] ALTER `mocParts.partsListId` to nullable using Drizzle migration
  - [ ] Verify `mocParts.status` enum includes 'available' (add if missing)
  - [ ] Add migration down function for rollback

- [ ] **Task 3: Update Drizzle Schema** (AC: 4)
  - [ ] Update `apps/api/core/database/schema/mocParts.ts`
  - [ ] Ensure TypeScript types reflect nullable `partsListId`
  - [ ] Run `pnpm db:generate` to verify schema sync

- [ ] **Task 4: Test Migration** (AC: 3, 5)
  - [ ] Run migration in local dev environment
  - [ ] Verify existing data unaffected
  - [ ] Test rollback works correctly

## Dev Notes

### Relevant Source Tree

```
apps/api/core/database/
├── schema/
│   ├── mocInstructions.ts    # Has deleted_at from Story 3.1.28
│   ├── mocParts.ts           # Update partsListId to nullable
│   └── mocPartsLists.ts      # CASCADE delete target
├── migrations/               # Add new migration here
└── index.ts                  # Re-exports
```

### Schema Change Details

[Source: PRD delete-moc-instructions.md#Story-1.1]

```typescript
// apps/api/core/database/schema/mocParts.ts
// Before:
partsListId: uuid('parts_list_id').notNull().references(() => mocPartsLists.id)

// After:
partsListId: uuid('parts_list_id').references(() => mocPartsLists.id) // nullable
```

### Drizzle Migration Pattern

[Source: architecture/coding-standards.md#database]

```typescript
import { sql } from 'drizzle-orm'

export const up = async (db) => {
  await db.execute(sql`
    ALTER TABLE moc_parts 
    ALTER COLUMN parts_list_id DROP NOT NULL;
  `)
}

export const down = async (db) => {
  // Note: Only works if no NULLs exist
  await db.execute(sql`
    ALTER TABLE moc_parts 
    ALTER COLUMN parts_list_id SET NOT NULL;
  `)
}
```

### Why Nullable partsListId?

When a MOC is hard-deleted, the `mocPartsLists` are deleted (CASCADE). But bricks (`mocParts`) should be preserved and returned to inventory. Making `partsListId` nullable allows:
1. Disassociating bricks from parts list BEFORE deletion
2. Setting brick `status = 'available'`
3. Deleting parts list without losing brick records

## Testing

### Test Location
- `apps/api/core/database/__tests__/migrations.test.ts`

### Test Requirements
- Migration runs without error on fresh DB
- Migration runs without error on DB with existing data
- Rollback works correctly
- Nullable column accepts NULL values
- Existing non-NULL values preserved

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-09 | 0.1 | Initial draft from Delete MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

N/A

### Debug Log References

N/A

### Completion Notes

N/A

### File List

- `apps/api/core/database/schema/mocParts.ts` - Modified
- `apps/api/core/database/migrations/XXXX_delete_schema_updates.ts` - New

