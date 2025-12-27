# Story 3.1.51: Cleanup Job

## GitHub Issue
- Issue: #275
- URL: https://github.com/michael-menard/monorepo/issues/275
- Status: Todo

## Status

Draft

## Story

**As a** platform operator,
**I want** expired MOCs permanently removed by an automated cleanup job,
**so that** storage is reclaimed and data retention policies are met.

## Epic Context

This is **Story 1.5 of Epic 1: Backend Delete Pipeline** from the Delete MOC Instructions PRD.

This is the most complex story in the delete feature. It handles the permanent deletion of MOCs that have been soft-deleted for longer than the retention period.

## Blocked By

- Story 3.1.47 (Delete Database Schema Updates) — nullable partsListId
- Story 3.1.48 (Delete Endpoint)

## Acceptance Criteria

1. CloudWatch Events triggers Lambda daily at low-traffic hour (3 AM UTC)
2. Queries MOCs where `deleted_at < NOW() - retention_period` using Drizzle ORM
3. For each expired MOC:
   - DELETE: `mocInstructions`, `mocFiles` (CASCADE), `mocPartsLists` (CASCADE), `mocGalleryImages` (CASCADE)
   - DELETE: `galleryImages` — only if orphaned (no other MOC links)
   - DELETE: S3 files for instructions, thumbnails, orphaned images
   - PRESERVE: `mocParts` — disassociate from parts lists, mark `status = 'available'`
4. Orphaned gallery images identified using GROUP BY/HAVING query before deletion
5. Bricks disassociated from parts lists BEFORE MOC deletion (order critical)
6. Processes in batches (configurable, default 100 MOCs per run)
7. Logs each hard-delete operation with correlationId
8. Failed items sent to DLQ for retry (max 3 retries)
9. Metrics: items processed, items failed, S3 files deleted, images orphaned, bricks returned, duration
10. Alert on: >10% failure rate, DLQ depth > 50

## Tasks / Subtasks

- [ ] **Task 1: Create Cleanup Lambda** (AC: 1, 2)
  - [ ] Create `apps/api/endpoints/cleanup/moc-cleanup.ts`
  - [ ] Query expired MOCs using Drizzle ORM
  - [ ] Add CloudWatch Events trigger in `serverless.yml`

- [ ] **Task 2: Brick Preservation Logic** (AC: 3, 5)
  - [ ] Before deleting parts lists, UPDATE `mocParts` SET `partsListId = NULL, status = 'available'`
  - [ ] Query bricks linked to MOC's parts lists
  - [ ] Execute UPDATE before any DELETE

- [ ] **Task 3: Orphaned Image Detection** (AC: 3, 4)
  - [ ] Query gallery images linked to MOC
  - [ ] Use GROUP BY/HAVING to find images with only 1 MOC link
  - [ ] Mark orphaned images for deletion

- [ ] **Task 4: Database Deletion** (AC: 3)
  - [ ] Delete in transaction per MOC
  - [ ] Order: disassociate bricks → delete MOC (cascades files, parts lists, gallery links)
  - [ ] Delete orphaned gallery images

- [ ] **Task 5: S3 Cleanup** (AC: 3)
  - [ ] Collect S3 keys for: instruction files, thumbnails, orphaned images
  - [ ] Use S3 batch delete (reuse pattern from Edit Story 3.1.38)
  - [ ] Log warnings for S3 failures (don't block DB deletion)

- [ ] **Task 6: Batch Processing** (AC: 6)
  - [ ] Process MOCs in batches (default 100)
  - [ ] Make batch size configurable via environment variable

- [ ] **Task 7: Error Handling & DLQ** (AC: 8)
  - [ ] Wrap each MOC deletion in try/catch
  - [ ] Send failed items to DLQ with retry metadata
  - [ ] Max 3 retries per item

- [ ] **Task 8: Observability** (AC: 7, 9, 10)
  - [ ] Log `moc.cleanup` event for each processed MOC
  - [ ] Emit CloudWatch metrics: processed, failed, s3Deleted, orphanedImages, bricksReturned
  - [ ] Configure CloudWatch Alarms for >10% failure rate, DLQ depth > 50

## Dev Notes

### File Location

```
apps/api/endpoints/cleanup/
└── moc-cleanup.ts      # New: Scheduled cleanup Lambda
```

### Cleanup Order (Critical)

[Source: PRD delete-moc-instructions.md#Story-1.5]

```
1. Query all data BEFORE any deletions
2. For each expired MOC:
   a. Query bricks linked to MOC's parts lists
   b. Query gallery images linked to MOC (detect orphans)
   c. Collect S3 keys for all files
   d. UPDATE mocParts SET partsListId = NULL, status = 'available'
   e. DELETE mocInstructions (cascades: mocFiles, mocPartsLists, mocGalleryImages)
   f. DELETE orphaned galleryImages
   g. DELETE S3 files (async, fail-open)
```

### Orphaned Image Query

```sql
-- Find gallery images that will become orphaned
SELECT gi.id, gi.s3_key
FROM gallery_images gi
JOIN moc_gallery_images mgi ON mgi.gallery_image_id = gi.id
WHERE mgi.moc_id = :mocId
GROUP BY gi.id
HAVING COUNT(DISTINCT mgi.moc_id) = 1;
```

### Serverless Schedule Config

```yaml
# apps/api/serverless.yml
functions:
  mocCleanup:
    handler: endpoints/cleanup/moc-cleanup.handler
    events:
      - schedule:
          rate: cron(0 3 * * ? *)  # Daily at 3 AM UTC
          enabled: true
    timeout: 300  # 5 minutes
```

### Technical Constraints

- All queries use Drizzle ORM (no raw SQL except complex GROUP BY)
- DB transaction per MOC (not per batch) for isolation
- S3 failures should not block DB deletion (log warning, continue)
- Reuse S3 batch delete pattern from Edit Story 3.1.38

## Testing

### Test Location
- `apps/api/endpoints/cleanup/__tests__/moc-cleanup.test.ts`

### Test Requirements
- Unit: Queries only expired MOCs
- Unit: Bricks disassociated before deletion
- Unit: Orphaned images detected correctly
- Unit: S3 files collected for deletion
- Unit: Failed items sent to DLQ
- Integration: Full cleanup flow with test data

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

- `apps/api/endpoints/cleanup/moc-cleanup.ts` - New
- `apps/api/serverless.yml` - Modified (add scheduled event)

