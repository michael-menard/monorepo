# Story 3.1.52: Delete Rate Limiting & Observability

## GitHub Issue
- Issue: #276
- URL: https://github.com/michael-menard/monorepo/issues/276
- Status: Todo

## Status

Draft

## Story

**As a** platform operator,
**I want** delete operations logged and rate-limited,
**so that** I can monitor usage patterns and prevent abuse.

## Epic Context

This is **Story 1.6 of Epic 1: Backend Delete Pipeline** from the Delete MOC Instructions PRD.

This is the final story in Epic 1. It ensures delete/restore operations have consistent observability and share rate limits with upload/edit.

## Blocked By

- Story 3.1.48 (Delete Endpoint)
- Story 3.1.49 (Restore Endpoint)
- Story 3.1.51 (Cleanup Job)

## Acceptance Criteria

1. Delete/restore share daily quota with upload/edit
2. Structured logs: `moc.delete`, `moc.restore`, `moc.cleanup`
3. Logs include correlationId, ownerId, mocId
4. 429 response includes `retryAfterSeconds`
5. Cleanup job logs summary metrics

## Tasks / Subtasks

- [ ] **Task 1: Verify Rate Limit Integration** (AC: 1, 4)
  - [ ] Confirm delete endpoint uses `@repo/rate-limit` (Story 3.1.48)
  - [ ] Confirm restore endpoint uses `@repo/rate-limit` (Story 3.1.49)
  - [ ] Verify shared quota key: `moc-operations`
  - [ ] Verify 429 response format matches spec

- [ ] **Task 2: Standardize Log Events** (AC: 2, 3)
  - [ ] Audit delete endpoint logs for required fields
  - [ ] Audit restore endpoint logs for required fields
  - [ ] Ensure all logs use `@repo/logger`
  - [ ] Standardize event names: `moc.delete`, `moc.restore`, `moc.cleanup`

- [ ] **Task 3: Cleanup Job Metrics** (AC: 5)
  - [ ] Log summary at end of cleanup run
  - [ ] Include: itemsProcessed, itemsFailed, s3FilesDeleted, orphanedImages, bricksReturned, durationMs
  - [ ] Emit CloudWatch custom metrics

- [ ] **Task 4: Create Observability Dashboard** (AC: 2, 5)
  - [ ] Add delete/restore metrics to existing CloudWatch dashboard
  - [ ] Add cleanup job metrics panel
  - [ ] Configure alarms per PRD Story 1.5:
    - Cleanup failure rate >10% → Alert
    - DLQ depth >50 → Alert

## Dev Notes

### Log Event Formats

[Source: PRD delete-moc-instructions.md#Story-1.6]

```typescript
// Delete event
logger.info('moc.delete', {
  correlationId,
  ownerId,
  mocId,
  opensearchSynced: true,
})

// Restore event
logger.info('moc.restore', {
  correlationId,
  ownerId,
  mocId,
  opensearchSynced: true,
})

// Cleanup summary event
logger.info('moc.cleanup', {
  correlationId,
  itemsProcessed: 15,
  itemsFailed: 1,
  s3FilesDeleted: 42,
  orphanedImages: 3,
  bricksReturned: 127,
  durationMs: 4523,
})
```

### Rate Limit Configuration

[Source: PRD edit-moc-instructions-prd.md#Epic-0]

```typescript
// Shared quota with upload/edit
const RATE_LIMIT_CONFIG = {
  key: 'moc-operations',
  limit: 50,        // per day
  window: '1d',
}
```

### CloudWatch Alarm Configuration

```yaml
# CloudWatch Alarms
DeleteCleanupFailureRate:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: delete-cleanup-failure-rate
    MetricName: CleanupFailedItems
    Threshold: 10  # percent
    ComparisonOperator: GreaterThanThreshold

DeleteCleanupDLQDepth:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: delete-cleanup-dlq-depth
    MetricName: ApproximateNumberOfMessagesVisible
    Threshold: 50
    ComparisonOperator: GreaterThanThreshold
```

## Testing

### Test Location
- `apps/api/endpoints/moc-instructions/__tests__/observability.test.ts`

### Test Requirements
- Unit: Delete logs include required fields
- Unit: Restore logs include required fields
- Unit: Rate limit 429 includes retryAfterSeconds
- Integration: Cleanup job emits summary log

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

- `apps/api/endpoints/moc-instructions/delete.ts` - Audit/modify
- `apps/api/endpoints/moc-instructions/restore.ts` - Audit/modify
- `apps/api/endpoints/cleanup/moc-cleanup.ts` - Audit/modify
- CloudWatch dashboard configuration - Modified

