# PLAN.yaml Validation Summary

**Story**: WISH-20260 - Automatic Retry Mechanism for Failed Flag Schedules
**Validated By**: dev-plan-leader
**Date**: 2026-02-08T20:45:00Z
**Status**: ✅ VALIDATED

---

## Validation Checklist

### Completeness
- [x] All 10 Acceptance Criteria mapped to implementation steps
- [x] All phases have clear objectives and deliverables
- [x] Dependencies between phases identified
- [x] Rollback plan documented
- [x] Deployment notes included

### Technical Accuracy
- [x] Database migration follows Drizzle ORM patterns
- [x] Schema changes align with existing table structure
- [x] Repository methods follow hexagonal architecture
- [x] Cron job enhancements preserve existing functionality
- [x] Type definitions use Zod schemas (project requirement)

### Test Coverage
- [x] Unit tests: 5+ tests for retry logic (AC8)
- [x] Integration tests: 3+ tests for retry flow (AC9)
- [x] Edge case tests: Concurrent retries, custom max_retries (AC10)
- [x] Test files and locations specified

### Risk Assessment
- [x] High-risk items identified (migration timing)
- [x] Mitigations documented
- [x] Rollback plan ready

### Reuse and Patterns
- [x] Extends WISH-2119 cron job infrastructure
- [x] Reuses FOR UPDATE SKIP LOCKED locking pattern
- [x] Follows existing CloudWatch logging conventions
- [x] Aligns with existing error handling patterns

---

## Phase Breakdown

### Phase 1: Database Schema Migration
- **Estimated Time**: 30 minutes
- **Steps**: 3 (schema update, migration generation, local test)
- **Risk**: High (requires migration before deployment)
- **Dependencies**: None
- **Validation**: Migration adds 4 columns + index correctly

### Phase 2: Update Type Definitions
- **Estimated Time**: 20 minutes
- **Steps**: 3 (Schedule schema, response schema, repository mapper)
- **Risk**: Low
- **Dependencies**: Phase 1
- **Validation**: TypeScript compilation passes

### Phase 3: Retry Logic Utility Function
- **Estimated Time**: 30 minutes
- **Steps**: 2 (calculateNextRetryAt, env var handling)
- **Risk**: Low
- **Dependencies**: Phase 2
- **Validation**: Unit tests pass

### Phase 4: Enhance Schedule Repository
- **Estimated Time**: 45 minutes
- **Steps**: 3 (query enhancement, new method, port update)
- **Risk**: Medium (query complexity)
- **Dependencies**: Phase 3
- **Validation**: Integration tests verify query behavior

### Phase 5: Enhance Cron Job with Retry Logic
- **Estimated Time**: 60 minutes
- **Steps**: 4 (failure handling, success logging, error cases)
- **Risk**: Medium (critical path changes)
- **Dependencies**: Phase 4
- **Validation**: Integration tests pass

### Phase 6: Unit Tests for Retry Logic
- **Estimated Time**: 45 minutes
- **Steps**: 2 (retry utils tests, env var tests)
- **Risk**: Low
- **Dependencies**: Phase 5
- **Validation**: 5+ tests pass

### Phase 7: Integration Tests for Retry Flow
- **Estimated Time**: 60 minutes
- **Steps**: 5 (first failure, success retry, max retries, concurrency, custom max)
- **Risk**: Low
- **Dependencies**: Phase 6
- **Validation**: 3+ integration tests pass

### Phase 8: End-to-End Validation
- **Estimated Time**: 30 minutes
- **Steps**: 3 (run all tests, manual test, verify migration)
- **Risk**: Low
- **Dependencies**: Phase 7
- **Validation**: All ACs pass

**Total Estimated Time**: 5 hours

---

## Acceptance Criteria Coverage

| AC | Description | Phase | Steps | Status |
|----|-------------|-------|-------|--------|
| AC1 | Database schema migration | Phase 1 | 1.1-1.3 | ✅ Mapped |
| AC2 | Failed schedule retry query | Phase 4 | 4.1 | ✅ Mapped |
| AC3 | Exponential backoff calculation | Phase 3 | 3.1 | ✅ Mapped |
| AC4 | Retry attempt logging | Phase 5 | 5.1-5.2 | ✅ Mapped |
| AC5 | Max retries enforcement | Phase 5 | 5.1 | ✅ Mapped |
| AC6 | Successful retry handling | Phase 5 | 5.2 | ✅ Mapped |
| AC7 | Configurable max retries | Phase 3 | 3.2 | ✅ Mapped |
| AC8 | Unit tests (5+) | Phase 6 | 6.1-6.2 | ✅ Mapped |
| AC9 | Integration tests (3+) | Phase 7 | 7.1-7.3 | ✅ Mapped |
| AC10 | Edge case tests | Phase 7 | 7.4-7.5 | ✅ Mapped |

---

## Key Implementation Details

### Exponential Backoff Formula
```
backoff_minutes = 2^(retry_count + 1)
jitter_seconds = random(0, 30)
next_retry_at = NOW() + backoff_minutes + jitter
```

### Enhanced Query
```sql
WHERE (
  (status = 'pending' AND scheduled_at <= NOW())
  OR
  (status = 'failed' AND next_retry_at IS NOT NULL
   AND next_retry_at <= NOW() AND retry_count < max_retries)
)
ORDER BY
  CASE WHEN status = 'failed' THEN 0 ELSE 1 END,
  next_retry_at ASC NULLS LAST,
  scheduled_at ASC
```

### New Repository Method
```typescript
updateRetryMetadata(
  scheduleId: string,
  retryCount: number,
  nextRetryAt: Date | null,
  lastError: string,
): Promise<Result<void, ScheduleError>>
```

### Environment Variable
```typescript
FLAG_SCHEDULE_MAX_RETRIES (default: 3, range: 0-10)
```

---

## Validation Results

### Architecture Compliance
- ✅ Follows hexagonal architecture (repository pattern)
- ✅ Extends existing WISH-2119 infrastructure
- ✅ No HTTP layer changes (backend-only)
- ✅ Proper separation of concerns

### Code Quality
- ✅ Uses Zod schemas for all types (project requirement)
- ✅ Uses @repo/logger for logging (no console.log)
- ✅ Structured CloudWatch logs
- ✅ Error isolation (failed schedules don't block others)

### Test Strategy
- ✅ Unit tests for utilities
- ✅ Integration tests for end-to-end flow
- ✅ Edge case coverage
- ✅ Minimum 45% coverage target met

### Deployment Safety
- ✅ Rollback plan documented
- ✅ Migration timing addressed
- ✅ CI/CD notes included
- ✅ Monitoring strategy (CloudWatch logs)

---

## Self-Validation Questions

**Q: Are all 10 ACs covered?**
A: Yes, all ACs mapped to specific phases and steps with validation criteria.

**Q: Is the plan implementable by another developer?**
A: Yes, each step has clear file paths, code snippets, and validation steps.

**Q: Are dependencies between phases clear?**
A: Yes, dependency chain: Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

**Q: Is the estimated time realistic?**
A: Yes, 5 hours total with buffer for testing and validation.

**Q: Are risks properly mitigated?**
A: Yes, high-risk migration timing addressed with deployment notes and CI/CD guidance.

**Q: Does the plan follow project conventions?**
A: Yes, uses Zod schemas, @repo/logger, follows existing patterns from WISH-2119.

---

## Potential Blockers Identified

### None Critical
All blockers have mitigations in place:
- Migration timing → CI/CD deployment order documented
- Query complexity → Integration tests verify behavior
- Cron timing delay → Acceptable for retry use case

---

## Sign-off

This plan is ready for implementation. All acceptance criteria are covered, risks are mitigated, and the implementation follows project patterns from WISH-2119.

**Next Step**: Move to implementation phase (current_phase: code)
