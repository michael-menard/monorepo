# Story 3.1.50: List Deleted Endpoint

## GitHub Issue
- Issue: #274
- URL: https://github.com/michael-menard/monorepo/issues/274
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** to see a list of my recently deleted MOCs via API,
**so that** I can decide which ones to restore before they're permanently deleted.

## Epic Context

This is **Story 1.4 of Epic 1: Backend Delete Pipeline** from the Delete MOC Instructions PRD.

## Blocked By

- Story 3.1.48 (Delete Endpoint)

## Acceptance Criteria

1. GET `/mocs/deleted` returns owner's soft-deleted MOCs
2. Includes: mocId, title, deletedAt, daysRemaining, thumbnailUrl
3. Ordered by deletedAt descending (most recent first)
4. Paginated (default 20 per page)
5. Returns empty array if no deleted MOCs
6. Only returns MOCs within retention period (not hard-deleted)

## Tasks / Subtasks

- [ ] **Task 1: Create List Deleted Handler** (AC: 1, 2, 3, 6)
  - [ ] Create `apps/api/endpoints/moc-instructions/list-deleted.ts`
  - [ ] Query MOCs where `ownerId = user AND deletedAt IS NOT NULL`
  - [ ] Filter: `deletedAt > NOW() - retention_period`
  - [ ] Order by `deletedAt DESC`
  - [ ] Calculate `daysRemaining` for each MOC

- [ ] **Task 2: Response Shaping** (AC: 2)
  - [ ] Map results to return only required fields
  - [ ] Include: `mocId`, `title`, `deletedAt`, `daysRemaining`, `thumbnailUrl`
  - [ ] Calculate daysRemaining: `retention_days - (NOW - deletedAt).days`

- [ ] **Task 3: Pagination** (AC: 4, 5)
  - [ ] Support `?page` and `?limit` query params
  - [ ] Default limit: 20
  - [ ] Return `{ items: [], total, page, limit, hasMore }`
  - [ ] Return empty items array if no deleted MOCs

- [ ] **Task 4: Wire Up Route** (AC: 1)
  - [ ] Add route to `apps/api/serverless.yml`
  - [ ] Configure as GET `/mocs/deleted`
  - [ ] Ensure auth middleware applied

## Dev Notes

### Endpoint Location

```
apps/api/endpoints/moc-instructions/
├── delete.ts          # Story 3.1.48
├── restore.ts         # Story 3.1.49
├── list-deleted.ts    # New: GET /mocs/deleted
└── ... existing files
```

### List Deleted Handler Pattern

[Source: PRD delete-moc-instructions.md#Story-1.4]

```typescript
// apps/api/endpoints/moc-instructions/list-deleted.ts
import { db } from '@/core/database'
import { mocInstructions } from '@/core/database/schema'
import { and, eq, isNotNull, gt, desc } from 'drizzle-orm'

const RETENTION_DAYS = 30

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub
  const page = parseInt(event.queryStringParameters?.page || '1')
  const limit = parseInt(event.queryStringParameters?.limit || '20')
  const offset = (page - 1) * limit

  const retentionCutoff = new Date()
  retentionCutoff.setDate(retentionCutoff.getDate() - RETENTION_DAYS)

  const items = await db.query.mocInstructions.findMany({
    where: and(
      eq(mocInstructions.ownerId, userId),
      isNotNull(mocInstructions.deletedAt),
      gt(mocInstructions.deletedAt, retentionCutoff)
    ),
    orderBy: desc(mocInstructions.deletedAt),
    limit: limit + 1, // Fetch one extra to detect hasMore
    offset,
    columns: {
      id: true,
      title: true,
      deletedAt: true,
      thumbnailUrl: true,
    },
  })

  const hasMore = items.length > limit
  const results = items.slice(0, limit).map(moc => ({
    mocId: moc.id,
    title: moc.title,
    deletedAt: moc.deletedAt,
    daysRemaining: calculateDaysRemaining(moc.deletedAt),
    thumbnailUrl: moc.thumbnailUrl,
  }))

  return {
    statusCode: 200,
    body: JSON.stringify({ items: results, page, limit, hasMore }),
  }
}

const calculateDaysRemaining = (deletedAt: Date) => {
  const now = new Date()
  const diffMs = deletedAt.getTime() + (RETENTION_DAYS * 24 * 60 * 60 * 1000) - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}
```

## Testing

### Test Location
- `apps/api/endpoints/moc-instructions/__tests__/list-deleted.test.ts`

### Test Requirements
- Unit: Returns 401 without auth
- Unit: Returns empty array when no deleted MOCs
- Unit: Returns only owner's deleted MOCs (not other users')
- Unit: Excludes hard-deleted MOCs (past retention)
- Unit: Orders by deletedAt descending
- Unit: Pagination works correctly
- Unit: daysRemaining calculated correctly

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

- `apps/api/endpoints/moc-instructions/list-deleted.ts` - New
- `apps/api/serverless.yml` - Modified (add route)

