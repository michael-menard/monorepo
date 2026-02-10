# Dev Feasibility - WISH-2119: Flag Scheduling Infrastructure

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Builds incrementally on WISH-2009 (feature flag infrastructure)
- Well-scoped: 3 admin endpoints + cron job + database table
- Follows established patterns (hexagonal architecture, Zod schemas, Hono routes)
- No novel technical challenges (scheduled job processing is well-understood pattern)
- Database schema is straightforward (single table with status tracking)
- Reuses existing auth middleware, cache invalidation, and flag update logic from WISH-2009

## Likely Change Surface (Core Only)

### Packages for Core Journey

1. **Backend - Config Domain** (`apps/api/lego-api/domains/config/`)
   - `application/schedule-service.ts` - Schedule CRUD logic (new)
   - `adapters/schedule-repository.ts` - Database adapter for schedules (new)
   - `routes.ts` - Add schedule endpoints (extend existing)
   - `types.ts` - Schedule schemas (extend existing)

2. **Backend - Cron Job** (`apps/api/lego-api/jobs/`)
   - `process-flag-schedules.ts` - Cron job handler (new)
   - Invokes schedule service to apply pending schedules

3. **Database Schema** (`packages/backend/database-schema/`)
   - `src/schema/feature-flags.ts` - Add schedules table schema (extend existing)
   - `src/migrations/app/` - Migration for schedules table (new)

4. **Shared Schemas** (`packages/core/api-client/src/schemas/`)
   - `feature-flags.ts` - Add schedule schemas (extend existing)

### Endpoints for Core Journey

**New Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule` - Create schedule
- `GET /api/admin/flags/:flagKey/schedule` - List schedules
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Cancel schedule

**Reused from WISH-2009:**
- Admin auth middleware for authorization checks
- Flag evaluation service for atomic flag updates
- Cache invalidation logic on flag updates

### Critical Deploy Touchpoints

1. **Database Migration**
   - Create `feature_flag_schedules` table
   - Indexes: flag_id, scheduled_at, status
   - Must run before deploying cron job

2. **Cron Job Deployment**
   - Lambda function configured to run every 1 minute
   - EventBridge rule triggers cron job
   - Must verify cron job permissions (database access, flag update access)

3. **Environment Variables**
   - No new env vars required (reuses DATABASE_URL, REDIS_URL from WISH-2009)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Cron Job Double-Processing of Schedules

**Why it blocks MVP:**
If two concurrent cron job executions process the same schedule, flag may be updated multiple times or inconsistently.

**Required Mitigation:**
- Use PostgreSQL row-level locking: `SELECT ... FOR UPDATE SKIP LOCKED` in schedule query
- This ensures each schedule processed by only one cron execution
- Add unit test simulating concurrent cron execution

**Code Pattern (required in AC):**
```typescript
// In schedule repository
const pendingSchedules = await db
  .select()
  .from(scheduleTable)
  .where(
    and(
      eq(scheduleTable.status, 'pending'),
      lte(scheduleTable.scheduledAt, new Date())
    )
  )
  .for('update', { skipLocked: true }) // Row-level locking
```

---

### Risk 2: Flag Update Failure Leaves Schedule in Limbo

**Why it blocks MVP:**
If flag update fails (database error, Redis unavailable), schedule remains in 'pending' status and may be retried indefinitely or never completed.

**Required Mitigation:**
- Wrap flag update in try-catch block
- On success: Set schedule status = 'applied' with appliedAt timestamp
- On failure: Set schedule status = 'failed' with error message
- Log all failures to CloudWatch with structured logging

**Code Pattern (required in AC):**
```typescript
try {
  await flagService.updateFlag(schedule.flagKey, schedule.updates)
  await scheduleRepository.markApplied(schedule.id)
} catch (error) {
  await scheduleRepository.markFailed(schedule.id, error.message)
  logger.error('Failed to apply schedule', { scheduleId: schedule.id, error })
}
```

---

### Risk 3: Admin Authorization Not Enforced on Schedule Endpoints

**Why it blocks MVP:**
If non-admin users can create/cancel schedules, they gain unauthorized control over feature flags.

**Required Mitigation:**
- Reuse auth middleware from WISH-2009 (apps/api/lego-api/middleware/auth.ts)
- Verify JWT contains admin role before allowing schedule CRUD operations
- Return 403 Forbidden for non-admin users
- Add integration tests for 403 scenarios

**Code Pattern (required in AC):**
```typescript
// In routes.ts
scheduleRouter.use('/api/admin/*', authMiddleware, requireAdminRole)

scheduleRouter.post('/api/admin/flags/:flagKey/schedule', async (c) => {
  // Admin role already verified by middleware
  // ...schedule creation logic
})
```

---

### Risk 4: Cron Job Timeout on Large Schedule Batches

**Why it blocks MVP:**
If 100+ pending schedules accumulate, cron job may timeout before processing all schedules (Lambda 15-minute max timeout).

**Required Mitigation:**
- Limit cron job to process max 100 schedules per execution
- Subsequent executions process remaining schedules
- Add CloudWatch metric for schedules processed per execution
- Add alert if backlog exceeds threshold (e.g., 500 pending schedules)

**Code Pattern (required in AC):**
```typescript
const MAX_SCHEDULES_PER_RUN = 100

const pendingSchedules = await scheduleRepository.getPendingSchedules({
  limit: MAX_SCHEDULES_PER_RUN,
  beforeTime: new Date(),
})
```

---

### Risk 5: Missing Migration Breaks Existing Flag Infrastructure

**Why it blocks MVP:**
If migration adds foreign key constraint incorrectly or alters existing feature_flags table schema, WISH-2009 functionality may break.

**Required Mitigation:**
- Create new table `feature_flag_schedules` (do NOT alter existing feature_flags table)
- Foreign key: `flag_id` references `feature_flags(id)` with ON DELETE CASCADE
- Test migration on local database before deploying
- Verify WISH-2009 endpoints still function after migration

**Schema (required in AC):**
```sql
CREATE TABLE feature_flag_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'cancelled')),
  updates JSONB NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedules_flag_id ON feature_flag_schedules(flag_id);
CREATE INDEX idx_schedules_scheduled_at ON feature_flag_schedules(scheduled_at);
CREATE INDEX idx_schedules_status ON feature_flag_schedules(status);
```

---

## Missing Requirements for MVP

### Requirement 1: Cron Job Invocation Frequency

**Gap:** Index states "every 1 minute" but does not specify Lambda configuration (EventBridge rule, timeout, memory).

**Required Decision Text for PM:**
```
AC: Configure cron job as Lambda function triggered by EventBridge rule
- Schedule expression: rate(1 minute)
- Lambda timeout: 2 minutes (allows 1 minute processing + buffer)
- Lambda memory: 512 MB (sufficient for batch schedule processing)
- Lambda environment: Reuse DATABASE_URL, REDIS_URL from WISH-2009
```

---

### Requirement 2: Schedule Retention Policy

**Gap:** No specification for how long completed/failed/cancelled schedules remain in database.

**Required Decision Text for PM:**
```
AC: Schedule retention policy
- Applied schedules: Retain for 90 days (audit trail)
- Failed schedules: Retain indefinitely (manual review required)
- Cancelled schedules: Retain for 30 days
- Add optional cleanup cron job in future story (out of scope for MVP)
```

---

### Requirement 3: Schedule Conflict Handling

**Gap:** What happens if two schedules update the same flag at nearly the same time?

**Required Decision Text for PM:**
```
AC: Schedule conflict behavior (MVP - simple approach)
- Allow multiple schedules for same flag (no uniqueness constraint)
- Process schedules in chronological order (ORDER BY scheduled_at ASC)
- Last schedule to execute wins (overwrites previous flag state)
- Document in API: "Overlapping schedules may cause unexpected flag states; avoid scheduling concurrent updates"
- Consider unique constraint (flag_id, scheduled_at) in future story
```

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **HTTP Tests** (`__http__/feature-flag-scheduling.http`)
   - Create schedule: Assert 201 status, schedule ID returned, status = 'pending'
   - List schedules: Assert 200 status, array with created schedule
   - Cancel schedule: Assert 200 status, status changed to 'cancelled'
   - Admin auth: Assert 403 for non-admin user

2. **Integration Tests**
   - Cron job processes schedule: Create schedule with past scheduled_at, invoke cron handler, assert flag updated
   - Row locking: Create 5 pending schedules, invoke cron concurrently, assert each processed once
   - Failed update: Simulate database error, assert schedule status = 'failed'

3. **Database Verification**
   - Migration creates table with correct schema
   - Indexes created on flag_id, scheduled_at, status
   - Foreign key constraint enforces referential integrity

4. **CloudWatch Logs**
   - Schedule applied: `{ "message": "Schedule applied", "scheduleId": "...", "flagKey": "..." }`
   - Schedule failed: `{ "level": "error", "message": "Failed to apply schedule", "scheduleId": "...", "error": "..." }`

### Critical CI/Deploy Checkpoints

1. **Pre-Deploy:**
   - TypeScript compilation passes
   - All unit tests pass (schedule service, cron job handler)
   - Integration tests pass (HTTP tests, cron job tests)
   - Migration dry-run succeeds on staging database

2. **Deploy Order:**
   - Step 1: Deploy database migration (create schedules table)
   - Step 2: Deploy API endpoints (schedule CRUD)
   - Step 3: Deploy cron job Lambda (schedule processing)
   - Step 4: Verify cron job triggers successfully (CloudWatch logs)

3. **Post-Deploy Verification:**
   - Create test schedule via API
   - Wait for cron job execution (max 60 seconds)
   - Verify schedule status = 'applied'
   - Verify flag updated correctly
   - Delete test schedule

---

## Architecture Compliance

### Hexagonal Architecture (Ports & Adapters)

**Compliant:** Yes

- **Application Layer:** `schedule-service.ts` contains pure business logic (schedule CRUD, validation)
- **Adapter Layer:** `schedule-repository.ts` handles database/cache interactions
- **Port Layer:** `types.ts` defines contracts (ScheduleSchema, ScheduleResponseSchema)
- **No HTTP/Database Coupling:** Service layer has no knowledge of Hono or Drizzle ORM

**Pattern Reuse:**
- Follows same structure as WISH-2009 feature flag service
- Reuses auth middleware, cache layer, and database client

### Zod-First Types (REQUIRED)

All types must be inferred from Zod schemas:

```typescript
// CORRECT
const ScheduleSchema = z.object({
  id: z.string().uuid(),
  flagKey: z.string(),
  scheduledAt: z.string().datetime(),
  status: z.enum(['pending', 'applied', 'failed', 'cancelled']),
  updates: z.object({
    enabled: z.boolean().optional(),
    rolloutPercentage: z.number().int().min(0).max(100).optional(),
  }),
})

type Schedule = z.infer<typeof ScheduleSchema>

// WRONG - never use interfaces
interface Schedule {
  id: string
  flagKey: string
  // ...
}
```

---

## Future Work (Non-Blocking)

### Enhancement Opportunities

1. **Recurring Schedules** (Phase 4+)
   - Cron-like schedule syntax: "0 9 * * 1" (every Monday at 9am)
   - Requires recurrence_rule column and more complex cron logic

2. **Schedule Preview** (Phase 4+)
   - Endpoint: `POST /api/admin/flags/:flagKey/schedule/preview`
   - Returns simulated flag state after schedule applies
   - Helps admins verify schedule correctness before creating

3. **Bulk Schedule Creation** (Phase 4+)
   - Create multiple schedules in single API call
   - Useful for coordinated feature rollouts across multiple flags

4. **Schedule Audit Logging** (Phase 4+)
   - Track which admin created/cancelled each schedule
   - Integrate with WISH-2019 (flag audit logging story)

5. **Automatic Retry for Failed Schedules** (Phase 4+)
   - Retry failed schedules with exponential backoff
   - Max 3 retries before marking as permanently failed

---

## Verdict

**FEASIBLE FOR MVP:** Yes

**Recommended Changes Before Implementation:**
1. Add AC for cron job Lambda configuration (EventBridge rule, timeout, memory)
2. Add AC for schedule retention policy
3. Add AC for schedule conflict handling behavior
4. Add AC for row-level locking in cron job query
5. Add AC for error handling (failed schedule status tracking)

All changes are clarifications, not scope expansions. Core implementation is straightforward and reuses established patterns from WISH-2009.
