# Epic 5: Cutover

**PRD Reference:** [10-implementation-phases.md](./image-service-migration/10-implementation-phases.md#phase-5-cutover-week-5)
**Duration:** Week 5
**Team Size:** 2-3 engineers
**Estimated Effort:** 26 hours

---

## Epic Goal

Execute the production cutover to the Image Service using a gradual rollout strategy, migrating all read and write traffic from PostgreSQL to DynamoDB with zero downtime and no user-facing errors.

---

## Epic Description

### Context

With infrastructure deployed (Epic 1), Lambda handlers implemented (Epic 2), dual-write active (Epic 3), and historical data migrated (Epic 4), the system is ready for cutover. This epic:

- Tests full cutover in staging environment
- Migrates production data
- Gradually rolls out traffic (10% → 50% → 100%)
- Monitors performance and errors at each step
- Ensures rollback capability at all times

### Success Criteria

- Staging cutover successful (100% traffic on Image Service)
- Production data migrated (100% integrity)
- Production traffic gradually rolled out (10% → 50% → 100%)
- Performance targets met at each rollout stage
- Zero user-facing errors during cutover
- 24-hour post-cutover monitoring complete

---

## Stories

### Story 5.1: Staging Cutover Implementation

**Description:** Implement read traffic switching logic with feature flag and fallback mechanism, then execute full cutover in staging environment.

**Acceptance Criteria:**
1. Read switching logic implemented in main API
2. Feature flag `USE_IMAGE_SERVICE` controls read source
3. Graceful fallback to PostgreSQL if Image Service fails
4. All read operations (get, list) route to Image Service when enabled
5. Error handling logs failures and falls back automatically
6. Unit tests cover both enabled/disabled states
7. Staging cutover executed (100% reads from Image Service)
8. Monitoring shows P95 latency <50ms
9. Error rate <0.1%
10. Zero user-facing errors

**Estimated Time:** 6 hours

**Implementation:**
```typescript
export async function getImage(imageId: string) {
  if (process.env.USE_IMAGE_SERVICE === 'true') {
    try {
      const response = await fetch(`https://images-staging.lego-api.com/images/${imageId}`, {
        headers: { Authorization: `Bearer ${getServiceToken()}` },
        timeout: 5000, // 5s timeout
      })

      if (response.ok) {
        logger.info({ imageId }, 'Read from Image Service')
        return response.json()
      }
    } catch (error) {
      logger.error({ err: error, imageId }, 'Image Service read failed, falling back to PostgreSQL')
    }
  }

  // Fallback to PostgreSQL
  return getImageFromPostgres(imageId)
}
```

**Monitoring Targets:**
- P95 latency: <50ms (vs 300ms baseline)
- Error rate: <0.1%
- CloudFront cache hit rate: >85%

**Reference Documents:**
- [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md) - Cutover implementation
- [09-monitoring.md](./image-service-migration/09-monitoring.md) - Monitoring dashboards

---

### Story 5.2: Gradual Rollout Strategy Implementation

**Description:** Implement percentage-based traffic routing to enable gradual rollout (10% → 50% → 100%) with monitoring at each stage.

**Acceptance Criteria:**
1. Rollout percentage environment variable implemented: `ROLLOUT_PERCENTAGE`
2. Random sampling logic routes percentage of requests to Image Service
3. Deterministic routing (same user always gets same path during rollout)
4. Percentage validation (0-100)
5. Logging includes routing decision (Image Service or PostgreSQL)
6. Unit tests cover all percentage values (0, 10, 50, 100)
7. Staging rollout tested: 10% → 50% → 100%
8. Metrics tracked separately for each traffic source
9. Rollout monitoring dashboard created
10. Rollback tested (set percentage to 0)

**Estimated Time:** 4 hours

**Implementation:**
```typescript
function shouldUseImageService(userId: string): boolean {
  const percentage = parseInt(process.env.ROLLOUT_PERCENTAGE || '0', 10)

  if (percentage === 0) return false
  if (percentage === 100) return true

  // Deterministic hash of userId for consistent routing
  const hash = hashCode(userId)
  return (hash % 100) < percentage
}
```

**Rollout Schedule (Staging):**
- **Hour 0:** 10% traffic → Monitor for 2 hours
- **Hour 2:** 50% traffic → Monitor for 2 hours
- **Hour 4:** 100% traffic → Monitor for 2 hours

---

### Story 5.3: Production Data Migration

**Description:** Execute the production data migration, deploy Image Service to production, and verify 100% data integrity.

**Acceptance Criteria:**
1. Image Service deployed to production environment
2. Production migration dry-run completed successfully
3. Historical data count verified
4. Full production migration executed
5. Migration logs reviewed (no errors)
6. Verification script confirms 100% data integrity
7. Zero field mismatches
8. Dual-write remains active during and after migration
9. Migration duration recorded
10. Production ready for traffic cutover

**Estimated Time:** 8 hours

**Execution Plan:**
```bash
# Deploy Image Service to production
pnpm --filter image-service sst deploy --stage production

# Dry-run
DRY_RUN=true STAGE=production pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Actual migration
STAGE=production pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify
pnpm tsx scripts/verify-migration.ts --stage production
```

**Expected Duration:** 2-4 hours for ~100K images

**Success Criteria:**
- 100% of images migrated
- 0 field mismatches
- Verification passes

---

### Story 5.4: Production Gradual Rollout

**Description:** Execute the production traffic cutover using gradual rollout (10% → 50% → 100%) with comprehensive monitoring at each stage.

**Acceptance Criteria:**
1. Rollout plan finalized and approved
2. Monitoring dashboards prepared
3. On-call engineer identified and available
4. Rollback plan documented and tested
5. 10% traffic rolled out, monitored for 4 hours
6. Performance targets met at 10%
7. 50% traffic rolled out, monitored for 4 hours
8. Performance targets met at 50%
9. 100% traffic rolled out, monitored for 4 hours
10. All performance targets met, zero user complaints

**Estimated Time:** 8 hours (excludes monitoring wait time)

**Rollout Schedule:**
- **10:00 AM:** 10% rollout
- **2:00 PM:** 50% rollout (if 10% successful)
- **6:00 PM:** 100% rollout (if 50% successful)

**Monitoring Checklist (at each stage):**
- [ ] P95 latency <50ms
- [ ] Error rate <0.1%
- [ ] CloudFront cache hit rate >85%
- [ ] DynamoDB throttling = 0
- [ ] Lambda errors <5/hour
- [ ] No user complaints

**Rollback Plan:**
```bash
# Immediate rollback to PostgreSQL
aws lambda update-function-configuration \
  --function-name lego-api-gallery-prod \
  --environment Variables="{USE_IMAGE_SERVICE=false,ROLLOUT_PERCENTAGE=0}"

# Or rollback to previous percentage
aws lambda update-function-configuration \
  --function-name lego-api-gallery-prod \
  --environment Variables="{ROLLOUT_PERCENTAGE=10}"
```

**Go/No-Go Criteria for Each Stage:**
- ✅ GO: All monitoring metrics within targets
- ❌ NO-GO: Any metric exceeds threshold → Rollback

**Reference Documents:**
- [06-performance-optimization.md](./image-service-migration/06-performance-optimization.md) - Performance targets

---

### Story 5.5: Post-Cutover Monitoring and Validation

**Description:** Monitor the system for 24 hours after 100% cutover, validate all metrics are meeting targets, and create post-cutover report.

**Acceptance Criteria:**
1. 24-hour monitoring period started
2. CloudWatch dashboards monitored continuously
3. Hourly metric snapshots taken
4. User feedback monitored (support tickets, social media)
5. Error logs reviewed for any patterns
6. Performance metrics within targets for full 24 hours
7. Post-cutover report created
8. Stakeholders notified of successful cutover
9. Lessons learned documented
10. Epic 5 marked complete

**Estimated Time:** 4 hours (excluding 24-hour wait)

**Metrics to Review:**
- Upload success rate: >99.9%
- P95 upload latency: <1s
- P95 get latency: <50ms
- P95 list latency: <100ms
- CloudFront cache hit rate: >85%
- DynamoDB throttling: 0
- Lambda errors: <5/hour
- User complaints: 0

**Post-Cutover Report Sections:**
1. **Executive Summary** - Cutover success, key metrics
2. **Timeline** - Rollout stages and durations
3. **Performance Metrics** - Before/after comparison
4. **Issues Encountered** - Any problems and resolutions
5. **User Impact** - Feedback and support tickets
6. **Lessons Learned** - What went well, what could improve
7. **Next Steps** - Cleanup tasks (Epic 6)

---

## Dependencies

**External Dependencies:**
- On-call engineer availability during rollout
- Stakeholder approval for production cutover
- Communication plan for users (if downtime expected)

**Internal Dependencies:**
- Epic 1: Infrastructure Setup (completed)
- Epic 2: Lambda Implementation (completed)
- Epic 3: Dual-Write Implementation (completed)
- Epic 4: Data Migration (completed)

---

## Technical Notes

### Gradual Rollout Strategy

**Source:** [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md)

Gradual rollout minimizes risk:

1. **10% traffic** - Detect issues with minimal user impact
2. **50% traffic** - Validate performance at scale
3. **100% traffic** - Full cutover

**At each stage:**
- Monitor for 2-4 hours
- Verify metrics are within targets
- Check for errors or user complaints
- Go/No-Go decision before next stage

### Fallback Mechanism

**Automatic fallback:**
- Image Service timeout (>5s) → Fall back to PostgreSQL
- Image Service error (5xx) → Fall back to PostgreSQL
- Network error → Fall back to PostgreSQL

**Manual rollback:**
- Set `USE_IMAGE_SERVICE=false` or `ROLLOUT_PERCENTAGE=0`
- Takes effect immediately (next request)
- No code deployment required

### Performance Comparison

**Source:** [00-overview.md](./image-service-migration/00-overview.md)

Expected improvements:

| Operation | Before (P95) | After (P95) | Improvement |
|-----------|--------------|-------------|-------------|
| Upload | 2500ms | <1000ms | 60% faster |
| Get by ID | 300ms | <50ms | 83% faster |
| List (20) | 400ms | <100ms | 75% faster |
| Update | 350ms | <80ms | 77% faster |
| Delete | 300ms | <100ms | 67% faster |

### Monitoring Dashboards

**Source:** [09-monitoring.md](./image-service-migration/09-monitoring.md)

**Critical Dashboards:**
1. **Image Service Overview** - Lambda invocations, errors, duration
2. **DynamoDB Metrics** - Read/write capacity, throttles
3. **CloudFront Metrics** - Requests, cache hit rate, errors
4. **Comparison Dashboard** - PostgreSQL vs DynamoDB side-by-side

**Alert Conditions:**
- Lambda error rate >1%
- DynamoDB throttling >0
- P95 latency >1s for uploads, >100ms for reads
- CloudFront 5xx errors >10/hour

---

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] Staging cutover successful (100% traffic)
- [ ] Production data migrated (100% integrity)
- [ ] Production rollout complete (10% → 50% → 100%)
- [ ] All performance targets met
- [ ] Zero user-facing errors during cutover
- [ ] 24-hour post-cutover monitoring complete
- [ ] Post-cutover report created and shared
- [ ] Stakeholders notified
- [ ] Ready for cleanup (Epic 6)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation at scale | Medium | High | Gradual rollout, monitor at each stage, rollback ready |
| DynamoDB throttling under load | Low | High | On-demand capacity, tested in staging, CloudWatch alarms |
| Image Service unavailable | Low | Critical | Automatic fallback to PostgreSQL, 5s timeout |
| User-facing errors during cutover | Low | Critical | Gradual rollout, comprehensive testing, immediate rollback |
| Data inconsistency post-cutover | Very Low | Critical | Dual-write still active, verification scripts, monitoring |
| Rollback fails | Very Low | Critical | Test rollback in staging, document procedure, practice |

---

**Previous Epic:** [Epic 4: Data Migration](./epic-4-data-migration.md)
**Next Epic:** [Epic 6: Cleanup & Optimization](./epic-6-cleanup-optimization.md)
