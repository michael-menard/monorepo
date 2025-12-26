# Story 3.1.48: Delete Endpoint

## GitHub Issue
- Issue: #271
- URL: https://github.com/michael-menard/monorepo/issues/271
- Status: Todo

## Status

Draft

## Story

**As an** owner of a MOC instruction package,
**I want** to delete my MOC via API,
**so that** it is immediately hidden from public view but recoverable within the retention period.

## Epic Context

This is **Story 1.2 of Epic 1: Backend Delete Pipeline** from the Delete MOC Instructions PRD.

## Blocked By

- Story 3.1.47 (Delete Database Schema Updates)
- Story 3.1.28 (DB Schema Migration for Edit) — `deleted_at` column

## Acceptance Criteria

1. DELETE `/mocs/:mocId` sets `deleted_at = NOW()` (not status change)
2. Returns 401 if unauthenticated
3. Returns 403 if not owner
4. Returns 404 if MOC doesn't exist
5. Returns 200 with `{ deletedAt, retentionDays: 30 }`
6. Idempotent: re-deleting already-deleted MOC returns 200 with existing `deletedAt`
7. Removes from OpenSearch index immediately (synchronous, fail-open with warning)
8. Logs deletion with correlationId, ownerId, mocId
9. Rate-limited via `@repo/rate-limit` (shared quota with upload/edit)

## Tasks / Subtasks

- [ ] **Task 1: Create Delete Handler** (AC: 1, 5, 6)
  - [ ] Create `apps/api/endpoints/moc-instructions/delete.ts`
  - [ ] Implement DELETE handler using Drizzle ORM
  - [ ] Set `deleted_at = NOW()` on soft-delete
  - [ ] Handle idempotency (check if already deleted)
  - [ ] Return `{ deletedAt, retentionDays }` response

- [ ] **Task 2: Authorization** (AC: 2, 3, 4)
  - [ ] Verify JWT authentication via middleware
  - [ ] Fetch MOC and verify `ownerId` matches authenticated user
  - [ ] Return appropriate error codes (401/403/404)

- [ ] **Task 3: OpenSearch Removal** (AC: 7)
  - [ ] Call OpenSearch delete index for the MOC
  - [ ] Wrap in try/catch — log warning on failure, don't block response
  - [ ] Use existing OpenSearch client from `apps/api/core/search/`

- [ ] **Task 4: Rate Limiting** (AC: 9)
  - [ ] Import `@repo/rate-limit` package
  - [ ] Apply shared quota (same as upload/edit)
  - [ ] Return 429 with `retryAfterSeconds` on limit exceeded

- [ ] **Task 5: Observability** (AC: 8)
  - [ ] Use `@repo/logger` for structured logging
  - [ ] Log `moc.delete` event with correlationId, ownerId, mocId
  - [ ] Include OpenSearch sync status in log

- [ ] **Task 6: Wire Up Route** (AC: 1)
  - [ ] Add route to `apps/api/serverless.yml`
  - [ ] Configure API Gateway integration

## Dev Notes

### Endpoint Location

```
apps/api/endpoints/moc-instructions/
├── delete.ts          # New: DELETE /mocs/:mocId
├── restore.ts         # Story 3.1.49
├── list-deleted.ts    # Story 3.1.50
└── ... existing files
```

### Delete Handler Pattern

[Source: PRD delete-moc-instructions.md#Story-1.2]

```typescript
// apps/api/endpoints/moc-instructions/delete.ts
import { db } from '@/core/database'
import { mocInstructions } from '@/core/database/schema'
import { logger } from '@repo/logger'
import { checkRateLimit } from '@repo/rate-limit'

export const handler = async (event) => {
  const { mocId } = event.pathParameters
  const userId = event.requestContext.authorizer.claims.sub

  // Rate limit check
  const rateLimitResult = await checkRateLimit(userId, 'moc-operations')
  if (!rateLimitResult.allowed) {
    return { statusCode: 429, body: JSON.stringify({ retryAfterSeconds: rateLimitResult.retryAfter }) }
  }

  // Fetch MOC
  const moc = await db.query.mocInstructions.findFirst({
    where: eq(mocInstructions.id, mocId),
  })

  if (!moc) return { statusCode: 404 }
  if (moc.ownerId !== userId) return { statusCode: 403 }

  // Idempotent: already deleted?
  if (moc.deletedAt) {
    return { statusCode: 200, body: JSON.stringify({ deletedAt: moc.deletedAt, retentionDays: 30 }) }
  }

  // Soft delete
  const now = new Date()
  await db.update(mocInstructions)
    .set({ deletedAt: now })
    .where(eq(mocInstructions.id, mocId))

  // OpenSearch removal (fail-open)
  try {
    await opensearchClient.delete({ index: 'mocs', id: mocId })
  } catch (err) {
    logger.warn('OpenSearch delete failed', { mocId, error: err.message })
  }

  logger.info('moc.delete', { correlationId, ownerId: userId, mocId })

  return { statusCode: 200, body: JSON.stringify({ deletedAt: now, retentionDays: 30 }) }
}
```

### Rate Limiting

[Source: PRD edit-moc-instructions-prd.md#Epic-0]

Uses `@repo/rate-limit` package extracted in Edit PRD Story 3.1.31.

## Testing

### Test Location
- `apps/api/endpoints/moc-instructions/__tests__/delete.test.ts`

### Test Requirements
- Unit: Returns 401 without auth
- Unit: Returns 403 for non-owner
- Unit: Returns 404 for missing MOC
- Unit: Returns 200 with deletedAt on success
- Unit: Idempotent re-delete returns existing deletedAt
- Unit: OpenSearch failure logs warning but returns 200
- Unit: Rate limit returns 429

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

- `apps/api/endpoints/moc-instructions/delete.ts` - New
- `apps/api/serverless.yml` - Modified (add route)

