# Dev Feasibility Review: WISH-20280 - Audit Logging for Flag Schedule Operations

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Story extends well-established patterns from admin domain audit infrastructure and WISH-2119 schedule service
- No architecture changes required - fits within existing hexagonal architecture (ports & adapters)
- Clean separation of concerns - audit logging doesn't touch core schedule logic
- Database migration is backward-compatible (nullable columns)
- Fire-and-forget audit pattern proven in admin domain (errors don't fail operations)

---

## Likely Change Surface (Core Only)

### Backend Packages

**Config Domain (Primary):**
- `apps/api/lego-api/domains/config/application/schedule-service.ts` - Integrate audit logger calls
- `apps/api/lego-api/domains/config/adapters/schedule-repository.ts` - Update INSERT/UPDATE queries for admin tracking columns
- `apps/api/lego-api/domains/config/routes.ts` - Extract admin user context from JWT, pass to service layer
- `apps/api/lego-api/domains/config/types.ts` - Extend schedule Zod schemas with admin tracking fields

**New Audit Infrastructure:**
- `apps/api/lego-api/core/audit/` (NEW directory)
  - `audit-logger.ts` - Lightweight CloudWatch logger for schedule events
  - `types.ts` - Audit event type definitions and Zod schemas
  - `__tests__/audit-logger.test.ts` - Unit tests for audit service

**Cron Job:**
- `apps/api/lego-api/jobs/process-flag-schedules.ts` - Add audit logging for applied/failed events

**Database Schema:**
- `packages/backend/database-schema/src/schema/feature-flags.ts` - Add admin tracking columns to `feature_flag_schedules` table
- `packages/backend/database-schema/src/migrations/app/YYYYMMDDHHMMSS_add_schedule_audit_fields.ts` - Migration script

**Shared Schemas:**
- `packages/core/api-client/src/schemas/feature-flags.ts` - Re-export updated schedule schemas for frontend alignment

---

### Endpoints (Core Journey)

**Modified Endpoints:**
- `POST /api/admin/flags/:flagKey/schedule` - Add audit logging call, persist `created_by` field
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Add audit logging call, persist `cancelled_by` and `cancelled_at` fields
- `GET /api/admin/flags/:flagKey/schedule` - Return admin tracking fields in response

**No New Endpoints** - Extends existing WISH-2119 endpoints only

---

### Critical Deploy Touchpoints

1. **Database Migration (MUST run before code deploy):**
   - Migration: `ADD COLUMN created_by, cancelled_by, cancelled_at` (all nullable)
   - Verify migration applied successfully in staging before production deploy
   - Rollback plan: Migration is additive (nullable columns), safe to reverse if needed

2. **CloudWatch Logs:**
   - Verify audit events appear in `/aws/lambda/lego-api-config-domain` log group
   - Structured logging format must include `eventType` and `metadata` fields

3. **JWT Claims:**
   - Verify admin JWTs include `userId` and `email` claims (coordinate with auth service)
   - If missing, add claims to JWT before deploying audit logging code

---

## MVP-Critical Risks

### Risk 1: JWT Claims Missing Admin Context
**Why it blocks MVP:**
Admin user tracking cannot function without `userId` field in JWT claims. All audit events would be missing admin attribution, defeating the primary goal of accountability.

**Required Mitigation:**
- Review auth middleware implementation early in Phase 1
- Verify JWT structure includes `userId` (REQUIRED) and `email` (optional but recommended)
- If claims missing, coordinate with auth team to add fields BEFORE implementing audit logging
- Fallback: Log warning and set `created_by = NULL` if claims unavailable (graceful degradation)

**Confidence After Mitigation:** High (auth middleware likely already includes userId)

---

### Risk 2: Audit Logging Errors Block Schedule Operations
**Why it blocks MVP:**
If audit service throws unhandled exceptions, schedule create/cancel operations will fail, breaking the core feature (flag scheduling).

**Required Mitigation:**
- Implement fire-and-forget pattern: wrap audit logger calls in try-catch blocks
- Log audit failures to CloudWatch (error level) but do NOT propagate exceptions
- Unit test: Verify audit logger errors don't fail schedule operations
- Follow admin domain pattern (proven implementation available)

**Confidence After Mitigation:** High (fire-and-forget pattern well-established)

---

### Risk 3: Database Migration Breaks Backward Compatibility
**Why it blocks MVP:**
If migration adds NOT NULL columns, old code will break immediately after deployment (cannot insert schedules without admin fields).

**Required Mitigation:**
- All admin tracking columns MUST be nullable (`created_by VARCHAR(255)`, `cancelled_by VARCHAR(255)`, `cancelled_at TIMESTAMP`)
- Verify migration script includes `NULL` constraint (not `NOT NULL`)
- Test backward compatibility: Insert schedule with NULL admin fields, verify GET response handles gracefully
- Rollback plan: Migration is additive, can be reversed without data loss

**Confidence After Mitigation:** High (nullable columns ensure safety)

---

## Missing Requirements for MVP

**None identified.** Story seed provides comprehensive requirements:
- Database schema changes clearly defined (column names, types, nullability)
- Audit event types specified (`flag_schedule.created`, `flag_schedule.cancelled`, `flag_schedule.applied`, `flag_schedule.failed`)
- Service layer integration pattern described (fire-and-forget, Result type)
- Test plan requirements documented (HTTP tests, unit tests, manual CloudWatch verification)

**No PM clarification needed** - proceed with implementation.

---

## MVP Evidence Expectations

### Core Journey Evidence

**Database Schema:**
- Migration script applied successfully (verify with `SELECT * FROM information_schema.columns WHERE table_name = 'feature_flag_schedules'`)
- Admin tracking columns present: `created_by`, `cancelled_by`, `cancelled_at`

**API Responses:**
- POST schedule returns `created_by` field (HTTP 201 response)
- DELETE schedule returns `cancelled_by` and `cancelled_at` fields (HTTP 200 response)
- GET schedules returns admin tracking fields for all schedules (HTTP 200 response)

**Audit Logging:**
- CloudWatch logs contain `flag_schedule.created` events with admin metadata (manual verification)
- CloudWatch logs contain `flag_schedule.cancelled` events with admin metadata (manual verification)
- Cron job logs `flag_schedule.applied` events (no admin context) (manual verification)

**Testing:**
- HTTP integration tests pass (`.http` file with 3+ requests)
- Unit tests pass (8+ tests covering audit logging integration)
- Fire-and-forget test passes (audit error doesn't fail schedule creation)

---

### Critical CI/Deploy Checkpoints

**Pre-Deploy:**
1. TypeScript compilation passes (no type errors)
2. ESLint passes (no linting errors)
3. Unit tests pass (8+ new tests for audit integration)
4. Database migration script validated (nullable columns, idempotent)

**Post-Deploy (Staging):**
1. Migration applied successfully (verify columns exist)
2. POST schedule creates record with `created_by` field
3. DELETE schedule updates `cancelled_by` and `cancelled_at` fields
4. CloudWatch logs contain audit events (manual verification)

**Production Deploy:**
1. Run migration in production database (during maintenance window if needed)
2. Verify API responses include admin tracking fields (smoke test)
3. Monitor CloudWatch logs for audit events (confirm logging active)

---

**DEV FEASIBILITY COMPLETE - NO BLOCKERS IDENTIFIED**
