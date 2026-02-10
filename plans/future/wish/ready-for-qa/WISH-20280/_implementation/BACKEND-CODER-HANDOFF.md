# Backend Coder Handoff - WISH-20280

## Context
This document provides everything the backend-coder agent needs to implement WISH-20280.

## Story Overview
**Story ID:** WISH-20280  
**Title:** Audit Logging for Flag Schedule Operations  
**Type:** Backend-only (2 points)  
**Parent:** WISH-2119 (Flag Scheduling Infrastructure)

## Agent Instructions
Read agent file: `.claude/agents/dev-implement-backend-coder.agent.md`

## Input Files (AUTHORITATIVE)
1. **Story File:** `plans/future/wish/in-progress/WISH-20280/WISH-20280.md`
2. **Plan File:** `plans/future/wish/in-progress/WISH-20280/_implementation/PLAN.yaml` (13 steps)
3. **Scope File:** `plans/future/wish/in-progress/WISH-20280/_implementation/SCOPE.yaml`
4. **Knowledge Context:** `plans/future/wish/in-progress/WISH-20280/_implementation/KNOWLEDGE-CONTEXT.yaml`

## Output File
`plans/future/wish/in-progress/WISH-20280/_implementation/BACKEND-LOG.md`

## Implementation Steps (from PLAN.yaml)

### Phase 1: Database Schema (Steps 1-2)
1. **Add admin tracking columns** to `packages/backend/database-schema/src/schema/feature-flags.ts`
   - Add to `featureFlagSchedules` table:
     - `createdBy: text('created_by')` (nullable)
     - `cancelledBy: text('cancelled_by')` (nullable)
     - `cancelledAt: timestamp('cancelled_at', { withTimezone: true })` (nullable)
   
2. **Generate migration** with `pnpm drizzle-kit generate`
   - Should create: `packages/backend/database-schema/src/migrations/app/0013_*.sql`
   - Migration adds 3 nullable columns with ALTER TABLE statements
   - Run: `pnpm build --filter @repo/database-schema` after migration

### Phase 2: Audit Infrastructure (Step 3)
3. **Create audit logging infrastructure** in `apps/api/lego-api/core/audit/`
   
   **File: `types.ts`**
   ```typescript
   import { z } from 'zod'
   
   // Event types
   export type AuditEventType = 
     | 'flag_schedule.created'
     | 'flag_schedule.cancelled'
     | 'flag_schedule.applied'
     | 'flag_schedule.failed'
   
   // Zod schemas
   export const AuditEventTypeSchema = z.enum([
     'flag_schedule.created',
     'flag_schedule.cancelled',
     'flag_schedule.applied',
     'flag_schedule.failed',
   ])
   
   export const AuditMetadataSchema = z.object({
     scheduleId: z.string().uuid(),
     flagKey: z.string(),
     adminUserId: z.string().optional(),
     adminEmail: z.string().email().optional(),
     scheduledAt: z.string().datetime().optional(),
     updates: z.record(z.unknown()).optional(),
     appliedAt: z.string().datetime().optional(),
     failedAt: z.string().datetime().optional(),
     errorMessage: z.string().optional(),
     reason: z.string().optional(),
     flagState: z.object({
       enabled: z.boolean(),
       rolloutPercentage: z.number().optional(),
     }).optional(),
   })
   
   export const AuditEventSchema = z.object({
     eventType: AuditEventTypeSchema,
     timestamp: z.string().datetime(),
     metadata: AuditMetadataSchema,
   })
   
   export type AuditMetadata = z.infer<typeof AuditMetadataSchema>
   export type AuditEvent = z.infer<typeof AuditEventSchema>
   ```
   
   **File: `ports.ts`**
   ```typescript
   import type { AuditEventType, AuditMetadata } from './types.js'
   
   export interface AuditLoggerPort {
     logEvent(eventType: AuditEventType, metadata: AuditMetadata): Promise<void>
   }
   ```
   
   **File: `audit-logger.ts`**
   - Implements `AuditLoggerPort`
   - Uses `@repo/logger` for CloudWatch structured logging
   - Fire-and-forget pattern: wrap in try-catch, log errors but don't throw
   - Log at INFO level (except .failed at ERROR level)

### Phase 3: Service Layer Integration (Steps 4-7)
4. **Update schedule service** (`apps/api/lego-api/domains/config/application/schedule-service.ts`)
   - Add `auditLogger: AuditLoggerPort` to `ScheduleServiceDeps`
   - Add optional `adminContext?: { userId: string; email: string }` parameter to:
     - `createSchedule()`
     - `cancelSchedule()`
   - Call audit logger BEFORE database commit (fire-and-forget)
   - Pass admin context to repository for database persistence

5. **Update schedule repository** (`apps/api/lego-api/domains/config/adapters/schedule-repository.ts`)
   - Update `create()` to accept optional `createdBy` field
   - Update `cancel()` to accept optional `cancelledBy` field
   - Update INSERT query to include `created_by` column
   - Update UPDATE query for cancellation to include `cancelled_by` and `cancelled_at`

6. **Update schedule routes** (`apps/api/lego-api/domains/config/routes.ts`)
   - Extract admin context from `c.get('user')` (AuthUser has userId, email fields)
   - Pass `adminContext` to service methods
   - No changes to response schemas (handled in types.ts)

7. **Update schedule Zod schemas** (`apps/api/lego-api/domains/config/types.ts`)
   - Extend `ScheduleSchema` with:
     - `createdBy: z.string().optional()`
     - `cancelledBy: z.string().optional()`
     - `cancelledAt: z.string().datetime().optional()`
   - Update `ScheduleResponseSchema` to include new fields in API responses

### Phase 4: Schema Export (Step 8)
8. **Export schemas to api-client** (`packages/core/api-client/src/schemas/feature-flags.ts`)
   - Re-export updated `ScheduleSchema` and `ScheduleResponseSchema`
   - Ensure frontend/backend alignment

### Phase 5: Cron Job Integration (Step 9)
9. **Update cron job** (`apps/api/lego-api/jobs/process-flag-schedules.ts`)
   - Inject audit logger
   - Log `flag_schedule.applied` event after successful application
   - Log `flag_schedule.failed` event on error (with errorMessage)
   - No admin context (automatic process)

### Phase 6: Testing (Steps 10-13)
10. **Audit logger unit tests** (`apps/api/lego-api/core/audit/__tests__/audit-logger.test.ts`)
    - Test: logEvent() calls logger with correct structure
    - Test: Error handling doesn't throw
    - Test: All event types supported

11. **Schedule service tests** (`apps/api/lego-api/domains/config/__tests__/schedule-service.test.ts`)
    - Test: createSchedule() logs audit event with admin context
    - Test: cancelSchedule() logs audit event with admin context
    - Test: Audit logging failure doesn't fail schedule creation
    - Test: created_by persisted to database
    - Test: cancelled_by persisted to database

12. **Cron job tests** (`apps/api/lego-api/jobs/__tests__/process-flag-schedules.test.ts`)
    - Test: Applied schedule logs audit event (no admin)
    - Test: Failed schedule logs error event

13. **HTTP integration tests** (`apps/api/lego-api/domains/config/__http__/feature-flag-scheduling.http`)
    - Extend existing file with 3+ new requests
    - Assert created_by, cancelled_by, cancelled_at in responses

## Fast-Fail Verification
After EACH chunk, run:
```bash
pnpm check-types --filter lego-api
pnpm check-types --filter @repo/database-schema
```

## Final Verification Commands
```bash
pnpm build --filter @repo/database-schema
pnpm build --filter lego-api
pnpm test --filter lego-api -- core/audit
pnpm test --filter lego-api -- domains/config/__tests__/schedule
pnpm test --filter lego-api -- jobs/__tests__/process-flag-schedules
pnpm lint --filter lego-api
```

## Key Patterns to Follow

### 1. Fire-and-Forget Audit Logging
```typescript
// In service layer
try {
  await auditLogger.logEvent('flag_schedule.created', metadata)
} catch (error) {
  logger.error('Audit logging failed (non-blocking)', { error })
}
// Continue with business logic regardless
```

### 2. Admin Context Extraction (from routes)
```typescript
const user = c.get('user') // AuthUser from auth middleware
const adminContext = {
  userId: user.userId,
  email: user.email,
}
```

### 3. Nullable Columns (repository)
```typescript
.insert(schedules)
  .values({
    // ... existing fields
    createdBy: input.createdBy ?? null,
  })
```

## Existing Infrastructure Reference

### Admin Audit Patterns
See: `apps/api/lego-api/domains/admin/` for similar audit logging patterns

### Auth Middleware
Location: `apps/api/lego-api/middleware/auth.ts`  
Provides: `AuthUser` with `userId`, `email`, `username`, `groups` fields

### Schedule Service
Location: `apps/api/lego-api/domains/config/application/schedule-service.ts`  
Current: Hexagonal architecture, Result types, repository injection

### Database Schema
Table: `featureFlagSchedules` in `packages/backend/database-schema/src/schema/feature-flags.ts`  
Current columns: id, flagId, scheduledAt, status, updates, appliedAt, errorMessage, retry fields, timestamps

## Success Criteria
- [ ] All 13 PLAN.yaml steps completed
- [ ] Minimum 8 unit tests pass
- [ ] All type checks pass
- [ ] Build succeeds
- [ ] HTTP tests extended with admin field assertions
- [ ] BACKEND-LOG.md documents all chunks with scope compliance
- [ ] End with "BACKEND COMPLETE" signal

## Autonomy Level
**conservative** - No architectural decisions without escalation

## Notes
- All admin tracking columns MUST be nullable for backward compatibility
- CloudWatch structured logging via `@repo/logger` for all audit events
- No database persistence for audit events in MVP (CloudWatch only)
- Follow existing WISH-2119 schedule service patterns
- Reuse admin domain audit patterns where applicable
