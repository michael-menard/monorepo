# Epic 4: Data Migration

**PRD Reference:** [10-implementation-phases.md](./image-service-migration/10-implementation-phases.md#phase-4-data-migration-week-4)
**Duration:** Week 4
**Team Size:** 2-3 engineers
**Estimated Effort:** 20 hours

---

## Epic Goal

Migrate all historical image metadata from PostgreSQL to DynamoDB, ensuring 100% data integrity and preparing the system for production cutover.

---

## Epic Description

### Context

With dual-write active (Epic 3), new data is being written to both systems. However, historical data (images uploaded before dual-write was enabled) only exists in PostgreSQL. This epic migrates all historical data to DynamoDB through:

- Writing and testing migration scripts
- Running migrations in dev and staging
- Verifying 100% data consistency
- Preparing for production migration

### Success Criteria

- Migration script created and tested
- All historical data migrated in dev and staging
- 100% data integrity verified (zero mismatches)
- Migration process documented
- Production migration plan ready

---

## Stories

### Story 4.1: Migration Script Development

**Description:** Write a comprehensive migration script to copy historical image metadata from PostgreSQL to DynamoDB with progress logging, error handling, and retry logic.

**Acceptance Criteria:**
1. Migration script created: `scripts/migrate-images-to-dynamodb.ts`
2. Script fetches all images from PostgreSQL in batches
3. Script transforms PostgreSQL schema to DynamoDB format
4. Script writes to DynamoDB using BatchWriteItem (max 25 items per batch)
5. Progress logging every 100 images migrated
6. Error handling with retry logic (max 3 retries per item)
7. Failed items logged to separate file: `migration-failures.json`
8. Dry-run mode implemented (logs only, no writes)
9. Resume capability (skip already migrated items)
10. Unit tests cover transformation logic

**Estimated Time:** 6 hours

**Key Features:**
- Batch processing: 100 images per PostgreSQL query
- Parallel DynamoDB writes: 10 concurrent BatchWriteItem requests
- Exponential backoff for retries
- Progress persistence (can resume if interrupted)
- Detailed logging with timestamps
- Statistics: total images, migrated, failed, duration

**Reference Documents:**
- [02-data-model.md](./image-service-migration/02-data-model.md) - DynamoDB schema
- [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md) - Migration implementation details

---

### Story 4.2: Migration Script Testing

**Description:** Test the migration script with a small dataset (100 images) in dev environment to validate logic, error handling, and performance.

**Acceptance Criteria:**
1. Test dataset created: 100 sample images in PostgreSQL
2. Dry-run executed successfully (no writes, logs only)
3. Actual migration run with 100 images
4. All 100 images successfully migrated to DynamoDB
5. Field-by-field comparison shows 0 mismatches
6. Error injection test: Simulate DynamoDB errors, verify retries work
7. Resume test: Kill script mid-run, resume from checkpoint
8. Performance verified: >50 images/second migration rate
9. Logging verified: Progress logs every 100 images
10. Test results documented

**Estimated Time:** 2 hours

**Test Scenarios:**
- Happy path: 100 images migrate successfully
- Error handling: Inject DynamoDB throttling, verify retries
- Resume: Kill process at 50%, verify resume from checkpoint
- Data validation: Compare all field values between PostgreSQL and DynamoDB
- Performance: Measure migration rate, verify >50 images/sec

---

### Story 4.3: Full Migration in Dev Environment

**Description:** Run the migration script against all historical data in the dev environment and monitor progress to completion.

**Acceptance Criteria:**
1. Dev environment prepared (dual-write disabled to create historical data gap)
2. Historical data count identified (e.g., 15,432 images)
3. Dry-run completed successfully
4. Full migration executed
5. Migration logs reviewed (no errors)
6. Progress monitored in real-time
7. Migration duration recorded
8. All images successfully migrated
9. Zero failed items
10. Migration summary report created

**Estimated Time:** 4 hours

**Execution Commands:**
```bash
# Dry run (log only)
DRY_RUN=true STAGE=dev pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Actual migration
STAGE=dev pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Monitor progress
tail -f migration.log
```

**Expected Output:**
```
[INFO] Starting migration...
[INFO] Fetched 15,432 images from PostgreSQL
[INFO] Migrated 500/15432 images (3.2%)
[INFO] Migrated 1000/15432 images (6.5%)
...
[INFO] Migrated 15432/15432 images (100%)
[INFO] Migration complete in 45 minutes
[INFO] Success rate: 100% (15432/15432)
[INFO] Failed items: 0
```

---

### Story 4.4: Migration Verification

**Description:** Create and run verification scripts to ensure 100% data consistency between PostgreSQL and DynamoDB after migration.

**Acceptance Criteria:**
1. Full verification script created: `scripts/verify-migration.ts`
2. Spot-check script created: `scripts/spot-check-migration.ts`
3. Full verification compares all images in PostgreSQL vs DynamoDB
4. Field-by-field comparison for critical fields
5. Verification reports mismatches with full details
6. Spot-check samples 50 random images for manual review
7. Full verification run: 100% match (zero mismatches)
8. Spot-check run: All 50 samples reviewed, no issues
9. Verification summary report created
10. Any mismatches identified and fixed

**Estimated Time:** 4 hours

**Verification Checks:**
- Count comparison: PostgreSQL count == DynamoDB count
- Field comparison for each image:
  - userId
  - s3Key
  - thumbnailS3Key
  - originalFilename
  - mimeType
  - sizeBytes
  - width
  - height
  - createdAt (timestamp)

**Success Criteria:**
- 100% of images exist in DynamoDB
- 0 field mismatches
- All timestamps within acceptable range (< 1 second difference)

**Reference Documents:**
- [02-data-model.md](./image-service-migration/02-data-model.md) - Field mapping

---

### Story 4.5: Staging Migration

**Description:** Run the complete migration process in the staging environment to validate the production migration plan.

**Acceptance Criteria:**
1. Staging environment prepared
2. Historical data count identified
3. Dry-run completed successfully
4. Full migration executed
5. Migration logs reviewed (no errors)
6. Verification script confirms 100% consistency
7. Migration duration recorded
8. Lessons learned documented
9. Production migration plan updated
10. Staging migration considered successful

**Estimated Time:** 4 hours

**Execution Plan:**
```bash
# Migrate staging data
STAGE=staging pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify migration
pnpm tsx scripts/verify-migration.ts --stage staging

# Spot-check
pnpm tsx scripts/spot-check-migration.ts --stage staging --count 50
```

**Deliverables:**
- Staging data fully migrated
- Verification passed (100% match)
- Migration summary report
- Production migration plan refined

---

## Dependencies

**External Dependencies:**
- None

**Internal Dependencies:**
- Epic 1: Infrastructure Setup (completed)
- Epic 2: Lambda Implementation (completed)
- Epic 3: Dual-Write Implementation (completed)
  - Dual-write must be active to catch any new data during migration

---

## Technical Notes

### Migration Strategy

**Source:** [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md)

The migration is a one-time bulk operation:

1. **Fetch from PostgreSQL** - Query in batches of 100
2. **Transform** - Convert PostgreSQL schema to DynamoDB format
3. **Write to DynamoDB** - Use BatchWriteItem (25 items max)
4. **Verify** - Compare field values
5. **Retry failures** - Up to 3 retries with exponential backoff

### PostgreSQL → DynamoDB Transformation

```typescript
function transformToDynamoDB(pgImage: PostgresImage): DynamoDBImage {
  return {
    PK: `IMAGE#${pgImage.id}`,
    SK: 'METADATA',
    userId: pgImage.user_id,
    createdAt: pgImage.created_at.toISOString(),
    updatedAt: pgImage.updated_at.toISOString(),
    originalFilename: pgImage.original_filename,
    s3Key: pgImage.s3_key,
    s3Bucket: pgImage.s3_bucket,
    thumbnailS3Key: pgImage.thumbnail_s3_key,
    mimeType: pgImage.mime_type,
    sizeBytes: pgImage.size_bytes,
    width: pgImage.width,
    height: pgImage.height,
    version: 1, // Initialize version for optimistic locking
  }
}
```

### Batch Processing

**DynamoDB BatchWriteItem limits:**
- Max 25 items per request
- Max 16 MB per request
- Max 400 KB per item

**Recommended approach:**
- Fetch 100 images from PostgreSQL
- Split into 4 batches of 25
- Send 10 batches in parallel (250 images concurrently)
- Target: 50-100 images/second

### Error Handling

**Retry Strategy:**
- Transient errors (throttling, network): Retry with exponential backoff
- Permanent errors (validation): Log to failures file, continue
- Max 3 retries per item
- Backoff: 100ms, 200ms, 400ms

**Failure Handling:**
- Log failed items to `migration-failures.json`
- Continue processing remaining items
- Report failures in summary
- Manual review and re-migration of failures

### Progress Tracking

**Checkpoint System:**
- Save progress every 1000 images
- Store last successful image ID
- Resume from checkpoint if interrupted
- Progress file: `migration-progress.json`

### Performance Targets

**Source:** [06-performance-optimization.md](./image-service-migration/06-performance-optimization.md)

- Migration rate: >50 images/second
- Expected duration for 100K images: ~30-45 minutes
- DynamoDB write capacity: On-demand (auto-scaling)
- No impact on production traffic (read-only migration)

---

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] Migration script created, tested, and documented
- [ ] Historical data migrated in dev (100% success)
- [ ] Historical data migrated in staging (100% success)
- [ ] Verification scripts confirm 100% data integrity
- [ ] Zero mismatches in dev and staging
- [ ] Migration duration and performance metrics documented
- [ ] Production migration plan finalized
- [ ] Ready for production cutover (Epic 5)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DynamoDB throttling during bulk write | Medium | Medium | Use on-demand capacity, implement exponential backoff, batch processing |
| Data transformation errors | Low | High | Comprehensive unit tests, dry-run validation, manual spot-checks |
| Migration script failure mid-run | Medium | Low | Checkpoint system, resume capability, progress logging |
| Data integrity issues (mismatches) | Low | High | Field-by-field verification, automated comparison scripts |
| Production migration takes too long | Medium | Medium | Test in staging, optimize batch size, consider off-peak hours |
| Lost data during migration | Very Low | Critical | Read-only operation, dual-write active for new data, verification scripts |

---

**Previous Epic:** [Epic 3: Dual-Write Implementation](./epic-3-dual-write-implementation.md)
**Next Epic:** [Epic 5: Cutover](./epic-5-cutover.md)
