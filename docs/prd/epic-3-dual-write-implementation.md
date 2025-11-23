# Epic 3: Dual-Write Implementation

**PRD Reference:** [10-implementation-phases.md](./image-service-migration/10-implementation-phases.md#phase-3-dual-write-implementation-week-3)
**Duration:** Week 3
**Team Size:** 2-3 engineers
**Estimated Effort:** 16 hours

---

## Epic Goal

Implement dual-write functionality in the main API to write image metadata to both PostgreSQL (existing) and DynamoDB (new Image Service) simultaneously, ensuring data consistency and enabling safe migration.

---

## Epic Description

### Context

Before fully migrating to the Image Service, we need to ensure data consistency between the old system (PostgreSQL) and new system (DynamoDB). Dual-write is a critical migration pattern that:

- Maintains PostgreSQL as the source of truth during transition
- Populates DynamoDB with new data in real-time
- Allows testing the Image Service without impacting users
- Enables safe rollback if issues are discovered
- Prepares for eventual cutover to the new service

### Success Criteria

- Dual-write implemented in main API with feature flag control
- Deployed to dev and staging environments
- Data consistency verified at >99.9% success rate
- 24-hour monitoring in staging shows no errors
- Rollback capability tested and confirmed working

---

## Stories

### Story 3.1: Dual-Write Logic Implementation

**Description:** Modify the main API's image upload service to write to both PostgreSQL and DynamoDB, with feature flag control and graceful error handling.

**Acceptance Criteria:**
1. Image upload service modified to support dual-write
2. DynamoDB write logic calls Image Service API
3. Feature flag `ENABLE_DYNAMODB_DUAL_WRITE` implemented
4. Error handling: Log DynamoDB failures but don't fail the request
5. PostgreSQL remains the source of truth (request succeeds even if DynamoDB write fails)
6. Service token generation for authenticating with Image Service
7. Structured logging for dual-write successes and failures
8. Unit tests cover both enabled and disabled feature flag states
9. Integration tests verify dual-write behavior
10. Code reviewed and merged

**Estimated Time:** 4 hours

**Implementation Location:**
- File: `apps/api/lego-api-serverless/src/lib/services/image-upload-service.ts`
- Add function: `writeImageToDynamoDB(image: ImageMetadata)`
- Modify function: `uploadImage(file, userId, options)`

**Key Requirements:**
- Use existing S3 upload logic (no changes)
- PostgreSQL write happens first (existing behavior)
- DynamoDB write is async and non-blocking
- Failures are logged with full context (imageId, error details)
- Image Service endpoint: `https://images-{stage}.lego-api.com/images`

**Reference Documents:**
- [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md) - Dual-write implementation details
- [03-api-specification.md](./image-service-migration/03-api-specification.md) - Image Service API contract

---

### Story 3.2: Deploy Dual-Write to Dev Environment

**Description:** Deploy the dual-write changes to the dev environment, enable the feature flag, and monitor CloudWatch logs for errors.

**Acceptance Criteria:**
1. Main API deployed to dev environment with dual-write code
2. Feature flag `ENABLE_DYNAMODB_DUAL_WRITE` set to `true` in dev
3. CloudWatch logs monitored for 2 hours after deployment
4. "DynamoDB dual-write successful" log messages appearing
5. No "DynamoDB dual-write failed" errors in logs
6. Manual testing: Upload 10 test images
7. Verification: All 10 images exist in both PostgreSQL and DynamoDB
8. Data consistency spot-check passes (field values match)
9. Deployment documentation updated
10. Rollback plan documented

**Estimated Time:** 2 hours

**Deployment Commands:**
```bash
# Deploy main API with dual-write
pnpm --filter lego-api-serverless deploy --stage dev

# Enable dual-write feature flag
aws lambda update-function-configuration \
  --function-name lego-api-gallery-dev \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=true}"

# Monitor logs
aws logs tail /aws/lambda/lego-api-gallery-dev --follow
```

**Monitoring Checklist:**
- [ ] Check CloudWatch logs for dual-write success messages
- [ ] Check for any errors or warnings related to Image Service calls
- [ ] Verify API response times haven't degraded (should be <50ms impact)
- [ ] Confirm no increase in error rates

**Reference Documents:**
- [09-monitoring.md](./image-service-migration/09-monitoring.md) - Monitoring dashboard and alerts

---

### Story 3.3: Data Consistency Verification Script

**Description:** Create an automated verification script that compares PostgreSQL and DynamoDB data to ensure 100% consistency.

**Acceptance Criteria:**
1. Verification script created: `scripts/verify-dual-write.ts`
2. Script fetches recent images from PostgreSQL (configurable time window)
3. Script queries DynamoDB for each image
4. Script compares critical fields: userId, s3Key, originalFilename, mimeType, sizeBytes
5. Script logs mismatches with full details
6. Script outputs summary: total images, mismatches, success rate
7. Script exits with code 0 if 100% match, code 1 if mismatches found
8. Script can be run on-demand or scheduled
9. Unit tests for verification logic
10. Documentation added to README

**Estimated Time:** 4 hours

**Success Criteria:**
- 100% of images found in DynamoDB
- 0 field mismatches
- Dual-write success rate >99.9%

**Script Features:**
- Configurable time window (default: last hour)
- Batch processing for large datasets
- Progress logging every 100 images
- Detailed error reporting
- Summary statistics at completion

**Reference Documents:**
- [02-data-model.md](./image-service-migration/02-data-model.md) - Field mapping between PostgreSQL and DynamoDB

---

### Story 3.4: Load Testing and Consistency Validation

**Description:** Upload 100 test images with dual-write enabled, verify data consistency, and test rollback capability.

**Acceptance Criteria:**
1. Test image upload script created: `scripts/upload-test-images.ts`
2. Script uploads 100 test images (various sizes: 100KB to 10MB)
3. All 100 uploads succeed
4. Verification script confirms 100 images in PostgreSQL
5. Verification script confirms 100 images in DynamoDB
6. Field-by-field comparison shows 0 mismatches
7. Dual-write success rate: 100%
8. Rollback test: Disable feature flag, upload 10 more images
9. Rollback verification: 10 new images only in PostgreSQL, not in DynamoDB
10. Re-enable feature flag and verify dual-write resumes

**Estimated Time:** 4 hours

**Test Execution:**
```bash
# Upload 100 test images
pnpm tsx scripts/upload-test-images.ts --count 100

# Wait for processing
sleep 60

# Verify consistency
pnpm tsx scripts/verify-dual-write.ts

# Test rollback
aws lambda update-function-configuration \
  --function-name lego-api-gallery-dev \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=false}"

# Upload 10 more images, verify only in PostgreSQL
pnpm tsx scripts/upload-test-images.ts --count 10

# Re-enable and verify
aws lambda update-function-configuration \
  --function-name lego-api-gallery-dev \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=true}"
```

**Verification Checklist:**
- [ ] 100/100 images in both databases
- [ ] All critical fields match exactly
- [ ] Rollback works (DynamoDB writes stop when disabled)
- [ ] Re-enable works (DynamoDB writes resume)

---

### Story 3.5: Deploy to Staging and 24-Hour Monitoring

**Description:** Deploy dual-write to staging environment, enable the feature flag, and monitor for 24 hours to ensure stability.

**Acceptance Criteria:**
1. Image Service deployed to staging
2. Main API with dual-write deployed to staging
3. Feature flag `ENABLE_DYNAMODB_DUAL_WRITE` enabled in staging
4. CloudWatch dashboard configured for staging monitoring
5. 24-hour monitoring period completed
6. No errors or warnings in CloudWatch logs
7. Data consistency verification runs every 6 hours (4 runs total)
8. All 4 verification runs show 100% consistency
9. Performance metrics within acceptable range (P95 latency <800ms)
10. Staging deployment considered successful

**Estimated Time:** 2 hours (deployment) + 24 hours (monitoring)

**Deployment Commands:**
```bash
# Deploy Image Service to staging
pnpm --filter image-service sst deploy --stage staging

# Deploy main API to staging
pnpm --filter lego-api-serverless deploy --stage staging

# Enable dual-write
aws lambda update-function-configuration \
  --function-name lego-api-gallery-staging \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=true}"
```

**Monitoring Schedule:**
- **Hour 0:** Enable dual-write, verify immediate functionality
- **Hour 6:** Run consistency verification script
- **Hour 12:** Run consistency verification script
- **Hour 18:** Run consistency verification script
- **Hour 24:** Run final verification script, review metrics, declare success/failure

**Success Metrics:**
- Dual-write success rate: >99.9%
- Image upload success rate: >99.9% (no degradation)
- P95 upload latency: <800ms (no degradation)
- Error rate: <0.1% (no increase)
- Data consistency: 100% across all verification runs

**Reference Documents:**
- [06-performance-optimization.md](./image-service-migration/06-performance-optimization.md) - Performance targets
- [09-monitoring.md](./image-service-migration/09-monitoring.md) - Monitoring and alerting

---

## Dependencies

**External Dependencies:**
- None

**Internal Dependencies:**
- Epic 1: Infrastructure Setup (completed)
- Epic 2: Lambda Implementation (completed)
  - Image Service must be deployed and operational
  - POST /images endpoint must work correctly

---

## Technical Notes

### Dual-Write Pattern

**Source:** [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md)

The dual-write pattern is a critical migration strategy:

1. **Write to old system first** (PostgreSQL) - Maintains current behavior
2. **Write to new system second** (DynamoDB) - Non-blocking, async
3. **Log failures, don't fail requests** - User experience is unchanged
4. **Monitor consistency** - Automated verification scripts
5. **Feature flag control** - Easy rollback if needed

### Error Handling Strategy

**Source:** [coding-standards.md](../architecture/coding-standards.md#error-handling)

- PostgreSQL write failures → Fail the request (existing behavior)
- DynamoDB write failures → Log error, continue (new behavior)
- Image Service unavailable → Log error, continue
- Network timeouts → Log error, continue (5s timeout)

### Service Authentication

Service-to-service authentication between main API and Image Service:

- Use AWS Cognito service account
- Generate JWT token with service scope
- Token cached and refreshed every hour
- Include token in `Authorization: Bearer {token}` header

### Feature Flag Management

**Environment Variable:**
```bash
ENABLE_DYNAMODB_DUAL_WRITE=true|false
```

**Default:** `false` (disabled)

**Rollback:** Set to `false` to immediately disable DynamoDB writes

### Data Mapping

**PostgreSQL → DynamoDB field mapping:**

| PostgreSQL Field | DynamoDB Field | Transformation |
|------------------|----------------|----------------|
| id | PK | `IMAGE#{id}` |
| - | SK | `METADATA` |
| user_id | userId | Direct copy |
| created_at | createdAt | ISO string |
| updated_at | updatedAt | ISO string |
| original_filename | originalFilename | Direct copy |
| s3_key | s3Key | Direct copy |
| s3_bucket | s3Bucket | Direct copy |
| thumbnail_s3_key | thumbnailS3Key | Direct copy |
| mime_type | mimeType | Direct copy |
| size_bytes | sizeBytes | Number |
| width | width | Number |
| height | height | Number |
| - | version | Initialize to 1 |

---

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] Dual-write implemented and tested in dev
- [ ] Data consistency verification script created and tested
- [ ] Load testing completed (100 images)
- [ ] Rollback tested and confirmed working
- [ ] Deployed to staging
- [ ] 24-hour monitoring in staging complete
- [ ] Data consistency >99.9%
- [ ] No performance degradation
- [ ] Documentation updated
- [ ] Ready for data migration (Epic 4)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DynamoDB write failures cause user-facing errors | Low | High | Ensure try-catch wraps all DynamoDB writes, log but don't throw |
| Data inconsistency between systems | Medium | High | Automated verification scripts, alerting on mismatches |
| Performance degradation from dual writes | Medium | Medium | Async DynamoDB writes, monitor latency, set timeout at 5s |
| Image Service unavailable during dual-write | Low | Medium | Graceful degradation, log errors, continue with PostgreSQL |
| Feature flag accidentally left on in production | Low | High | Deployment checklist, automated checks, manual review before prod |

---

**Previous Epic:** [Epic 2: Lambda Implementation](./epic-2-lambda-implementation.md)
**Next Epic:** [Epic 4: Data Migration](./epic-4-data-migration.md)
