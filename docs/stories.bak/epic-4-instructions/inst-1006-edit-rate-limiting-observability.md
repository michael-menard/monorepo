# Story 3.1.37: Edit Rate Limiting & Observability

## GitHub Issue
- Issue: #258
- URL: https://github.com/michael-menard/monorepo/issues/258
- Status: Todo

## Status

Ready for Review

## Story

**As a** platform operator,
**I want** edit operations logged and rate-limited,
**so that** I can monitor usage and prevent abuse.

## Epic Context

This is **Story 1.5 of Epic 1: Backend Edit Pipeline**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- Story 3.1.33-3.1.36: All previous Epic 1 stories

## Acceptance Criteria

1. Edit operations share daily quota with upload
2. Structured logs: `moc.edit.start`, `moc.edit.presign`, `moc.edit.finalize`
3. Logs include correlationId, ownerId, mocId
4. 429 response includes `retryAfterSeconds` and next-allowed time
5. No PII in logs beyond ownerId

## Tasks / Subtasks

- [x] **Task 1: Configure Shared Rate Limiting** (AC: 1)
  - [x] Verify edit presign uses same rate limit key as upload: `moc-upload:{userId}:{date}`
  - [x] Only count finalize operations against quota (not presign)
  - [x] Document shared quota in API documentation

- [x] **Task 2: Add Structured Log Events** (AC: 2, 3)
  - [x] Add `moc.edit.start` log to existing GET handler (`get/handler.ts`) when `isOwner: true`
  - [x] Add `moc.edit.presign` log when presign URLs are generated
  - [x] Add `moc.edit.finalize` log when changes are committed
  - [x] Include: correlationId, requestId, ownerId, mocId
  - [x] Include: file counts by category, metadata fields changed

- [x] **Task 3: Enhance 429 Response** (AC: 4)
  - [x] Include `retryAfterSeconds` in response body
  - [x] Include `resetAt` timestamp (UTC)
  - [x] Include `Retry-After` HTTP header (seconds)
  - [x] Include current usage count and limit

- [x] **Task 4: Audit Logs for PII** (AC: 5)
  - [x] Review all log statements in edit handlers
  - [x] Ensure no email, name, or other PII in logs
  - [x] ownerId is acceptable (not considered PII for our purposes)
  - [x] Ensure file names don't leak into logs (could contain PII)

- [ ] **Task 5: Add CloudWatch Metrics** (Optional enhancement)
  - [ ] `moc.edit.count` - Count of edit operations
  - [ ] `moc.edit.duration` - Time to complete edit
  - [ ] `moc.edit.fileCount` - Files changed per edit
  - [ ] Dimension by: environment, category

## Dev Notes

### Shared Rate Limit Key

```typescript
// Both upload and edit use the same key format
const rateLimitKey = `moc-upload:${userId}:${formatDate(new Date(), 'yyyy-MM-dd')}`

// Only finalize counts against the limit (not GET or presign)
// This matches upload behavior where only session finalize counts
```

### Structured Log Format

```typescript
import { logger } from '@repo/logger'

// GET for edit (in apps/api/endpoints/moc-instructions/get/handler.ts)
// Only log when isOwner is true (indicates edit scenario)
if (isOwner) {
  logger.info('moc.edit.start', {
    correlationId,
    requestId: event.requestContext.requestId,
    ownerId: userId,
    mocId,
    fileCount: files.length,
  })
}

// Presign
logger.info('moc.edit.presign', {
  correlationId,
  requestId,
  ownerId: userId,
  mocId,
  filesByCategory: {
    instruction: 1,
    image: 3,
    'parts-list': 0,
  },
})

// Finalize
logger.info('moc.edit.finalize', {
  correlationId,
  requestId,
  ownerId: userId,
  mocId,
  newFileCount: newFiles.length,
  removedFileCount: removedFileIds.length,
  metadataChanged: ['title', 'description'], // Field names only, not values
  durationMs: Date.now() - startTime,
})
```

### 429 Response Schema

```typescript
const RateLimitExceededResponseSchema = z.object({
  code: z.literal('RATE_LIMIT_EXCEEDED'),
  message: z.string(),
  retryAfterSeconds: z.number(),
  resetAt: z.string().datetime(),
  usage: z.object({
    current: z.number(),
    limit: z.number(),
  }),
  correlationId: z.string(),
})

// Example response
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Daily upload/edit limit reached",
  "retryAfterSeconds": 14400,
  "resetAt": "2025-12-09T00:00:00.000Z",
  "usage": {
    "current": 100,
    "limit": 100
  },
  "correlationId": "req-abc123"
}
```

### PII Audit Checklist

| Log Field | Allowed | Notes |
|-----------|---------|-------|
| ownerId | Yes | UUID, not PII |
| mocId | Yes | UUID |
| correlationId | Yes | Request tracking |
| requestId | Yes | AWS request ID |
| title | No | Could contain PII |
| description | No | Could contain PII |
| filename | No | Could contain PII |
| file category | Yes | Just "image", "instruction", etc. |
| file count | Yes | Numeric only |
| tags | No | Could contain PII |
| error message | Careful | Sanitize user input from errors |

### Log Levels

| Scenario | Level | Event |
|----------|-------|-------|
| Successful edit | info | `moc.edit.finalize` |
| Rate limit hit | warn | `moc.edit.rate_limited` |
| Auth failure | warn | `moc.edit.unauthorized` |
| Validation error | warn | `moc.edit.validation_failed` |
| Concurrent edit conflict | warn | `moc.edit.conflict` |
| OpenSearch failure | warn | `moc.edit.opensearch_failed` |
| Unexpected error | error | `moc.edit.error` |

## Testing

### Test Location
- `apps/api/endpoints/moc-instructions/__tests__/observability.test.ts`

### Test Requirements
- Integration: Rate limit shared with upload
- Integration: 429 includes all required fields
- Integration: Retry-After header present
- Unit: Log output matches expected format
- Unit: No PII in log output
- Integration: CloudWatch metrics emitted (if implemented)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |
| 2025-12-09 | 0.2 | Updated file paths to reflect Story 3.1.33 implementation (single GET endpoint) | Dev Agent |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A

### Completion Notes

Implementation completed 2025-12-26. All acceptance criteria met:

1. **Shared Rate Limiting (AC: 1)**:
   - Edit presign uses `getCount()` to check limit without incrementing
   - Edit finalize uses `checkLimit()` which increments the counter
   - Both use shared key format: `moc-upload:{userId}:{date}`

2. **Structured Logs (AC: 2, 3)**:
   - `moc.edit.start` added to GET handler when isOwner=true
   - `moc.edit.presign` added with filesByCategory
   - `moc.edit.finalize` added with metadataChanged (field names only)

3. **Enhanced 429 Response (AC: 4)**:
   - Response includes: code, message, retryAfterSeconds, resetAt, usage.current, usage.limit
   - Retry-After header set to seconds until reset

4. **PII Audit (AC: 5)**:
   - Removed filename from debug logs (could contain PII)
   - metadataChanged logs field names only, not values
   - All logs use ownerId (UUID), not email or name

Task 5 (CloudWatch Metrics) deferred as optional enhancement.

Tests: 44 tests passing (16 edit-presign + 16 edit-finalize + 12 observability)

### File List

- `apps/api/endpoints/moc-instructions/get/handler.ts` - Modified (add `moc.edit.start` logging when isOwner)
- `apps/api/endpoints/moc-instructions/edit-presign/handler.ts` - Modified (rate limit uses getCount, add structured logging)
- `apps/api/endpoints/moc-instructions/edit-finalize/handler.ts` - Modified (add rate limiting with checkLimit, add structured logging)
- `apps/api/endpoints/moc-instructions/__tests__/observability.test.ts` - New (12 tests)
- `apps/api/endpoints/moc-instructions/__tests__/edit-presign.handler.test.ts` - Modified (update mocks for getCount)
- `apps/api/endpoints/moc-instructions/__tests__/edit-finalize.handler.test.ts` - Modified (add rate limit mocks)
