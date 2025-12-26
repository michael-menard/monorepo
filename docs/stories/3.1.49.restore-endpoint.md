# Story 3.1.49: Restore Endpoint

## GitHub Issue
- Issue: #272
- URL: https://github.com/michael-menard/monorepo/issues/272
- Status: Todo

## Status

Draft

## Story

**As an** owner of a deleted MOC instruction package,
**I want** to restore my MOC via API,
**so that** it becomes visible again and I can recover from accidental deletion.

## Epic Context

This is **Story 1.3 of Epic 1: Backend Delete Pipeline** from the Delete MOC Instructions PRD.

## Blocked By

- Story 3.1.48 (Delete Endpoint)

## Acceptance Criteria

1. POST `/mocs/:mocId/restore` clears `deleted_at` (sets to NULL)
2. Original `status` already preserved — no status change needed
3. Returns 401 if unauthenticated
4. Returns 403 if not owner
5. Returns 404 if MOC doesn't exist OR was hard-deleted (past retention period)
6. Returns 409 if MOC is not currently soft-deleted
7. Returns 200 with restored MOC data
8. Re-indexes in OpenSearch (synchronous, fail-open with warning)
9. Logs restoration with correlationId, ownerId, mocId
10. Rate-limited via `@repo/rate-limit` (shared quota)

## Tasks / Subtasks

- [ ] **Task 1: Create Restore Handler** (AC: 1, 6, 7)
  - [ ] Create `apps/api/endpoints/moc-instructions/restore.ts`
  - [ ] Implement POST handler using Drizzle ORM
  - [ ] Clear `deleted_at = NULL` on restore
  - [ ] Return 409 if MOC is not soft-deleted
  - [ ] Return full MOC data on success

- [ ] **Task 2: Authorization** (AC: 2, 3, 4, 5)
  - [ ] Verify JWT authentication via middleware
  - [ ] Fetch MOC and verify `ownerId` matches authenticated user
  - [ ] Return 404 for missing MOC (don't distinguish not-found vs hard-deleted)
  - [ ] Return appropriate error codes (401/403/404/409)

- [ ] **Task 3: OpenSearch Re-indexing** (AC: 8)
  - [ ] Call OpenSearch index for the restored MOC
  - [ ] Wrap in try/catch — log warning on failure, don't block response
  - [ ] Use existing OpenSearch client from `apps/api/core/search/`

- [ ] **Task 4: Rate Limiting** (AC: 10)
  - [ ] Import `@repo/rate-limit` package
  - [ ] Apply shared quota (same as upload/edit/delete)
  - [ ] Return 429 with `retryAfterSeconds` on limit exceeded

- [ ] **Task 5: Observability** (AC: 9)
  - [ ] Use `@repo/logger` for structured logging
  - [ ] Log `moc.restore` event with correlationId, ownerId, mocId
  - [ ] Include OpenSearch sync status in log

- [ ] **Task 6: Wire Up Route** (AC: 1)
  - [ ] Add route to `apps/api/serverless.yml`
  - [ ] Configure as POST `/mocs/{mocId}/restore`

## Dev Notes

### Endpoint Location

```
apps/api/endpoints/moc-instructions/
├── delete.ts          # Story 3.1.48
├── restore.ts         # New: POST /mocs/:mocId/restore
├── list-deleted.ts    # Story 3.1.50
└── ... existing files
```

### Restore Handler Pattern

[Source: PRD delete-moc-instructions.md#Story-1.3]

```typescript
// apps/api/endpoints/moc-instructions/restore.ts
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

  // Check if actually soft-deleted
  if (!moc.deletedAt) {
    return { statusCode: 409, body: JSON.stringify({ error: 'MOC is not deleted' }) }
  }

  // Restore (clear deleted_at)
  const [restored] = await db.update(mocInstructions)
    .set({ deletedAt: null })
    .where(eq(mocInstructions.id, mocId))
    .returning()

  // OpenSearch re-index (fail-open)
  try {
    await opensearchClient.index({ index: 'mocs', id: mocId, body: restored })
  } catch (err) {
    logger.warn('OpenSearch index failed', { mocId, error: err.message })
  }

  logger.info('moc.restore', { correlationId, ownerId: userId, mocId })

  return { statusCode: 200, body: JSON.stringify(restored) }
}
```

## Testing

### Test Location
- `apps/api/endpoints/moc-instructions/__tests__/restore.test.ts`

### Test Requirements
- Unit: Returns 401 without auth
- Unit: Returns 403 for non-owner
- Unit: Returns 404 for missing MOC
- Unit: Returns 409 for non-deleted MOC
- Unit: Returns 200 with restored MOC on success
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

- `apps/api/endpoints/moc-instructions/restore.ts` - New
- `apps/api/serverless.yml` - Modified (add route)

