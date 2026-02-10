# Backend Implementation Instructions - WISH-20280

## Overview
Implement comprehensive audit logging for flag schedule operations with admin tracking.

## Implementation Steps (from PLAN.yaml)

### Step 1-2: Database Schema + Migration
1. Add admin tracking columns to feature_flag_schedules table in `packages/backend/database-schema/src/schema/feature-flags.ts`
   - `created_by: varchar(255)` (nullable)
   - `cancelled_by: varchar(255)` (nullable)
   - `cancelled_at: timestamp with time zone` (nullable)

2. Generate migration: `pnpm drizzle-kit generate`
   - Should create 0013_*.sql in `packages/backend/database-schema/src/migrations/app/`

### Step 3: Create Audit Logging Infrastructure
Create new directory: `apps/api/lego-api/core/audit/`

**File: types.ts**
```typescript
// Audit event types and Zod schemas
// Event types: flag_schedule.created, flag_schedule.cancelled, flag_schedule.applied, flag_schedule.failed
// Use Zod schemas for event metadata structure
```

**File: ports.ts**
```typescript
// AuditLoggerPort interface for dependency injection
// Method: logEvent(eventType, metadata) -> Result<void>
```

**File: audit-logger.ts**
```typescript
// CloudWatch-based audit logger implementation
// Uses @repo/logger for structured logging
// Fire-and-forget pattern - errors don't fail operations
```

### Step 4: Update Schedule Service
File: `apps/api/lego-api/domains/config/application/schedule-service.ts`
- Add AuditLoggerPort as constructor dependency
- Add optional adminContext parameter (userId, email) to createSchedule and cancelSchedule methods
- Call audit logger before database commit
- Wrap audit calls in try-catch (fire-and-forget)
- Pass admin fields to repository

### Step 5: Update Schedule Repository
File: `apps/api/lego-api/domains/config/adapters/schedule-repository.ts`
- Update INSERT query to include created_by column
- Update cancellation query to include cancelled_by and cancelled_at columns
- Accept admin fields as parameters

### Step 6: Update Schedule Routes
File: `apps/api/lego-api/domains/config/routes.ts`
- Extract admin user from `c.get('user')` (AuthUser interface has userId, email)
- Pass adminContext to service methods
- No audit logic in routes (orchestration only)

### Step 7: Update Schedule Zod Schemas
File: `apps/api/lego-api/domains/config/types.ts`
- Extend ScheduleSchema with `createdBy`, `cancelledBy`, `cancelledAt` (all optional)
- Update ScheduleResponseSchema to include new fields
- Use z.infer<> for type inference

### Step 8: Export Schemas to API Client
File: `packages/core/api-client/src/schemas/feature-flags.ts`
- Re-export updated schedule schemas from backend
- Ensure frontend alignment

### Step 9: Update Cron Job
File: `apps/api/lego-api/jobs/process-flag-schedules.ts`
- Inject audit logger
- Log `flag_schedule.applied` on successful application
- Log `flag_schedule.failed` on errors
- No admin context (automatic events)

### Step 10-12: Write Tests

**File: apps/api/lego-api/core/audit/__tests__/audit-logger.test.ts**
- Test: Logs events with correct metadata
- Test: Fire-and-forget (errors don't throw)
- Test: Structured CloudWatch logging format

**File: apps/api/lego-api/domains/config/__tests__/schedule-service.test.ts**
- Test: Create schedule logs audit event with admin context
- Test: Cancel schedule logs audit event
- Test: Audit logging failure doesn't fail schedule creation
- Test: created_by persisted to database
- Test: cancelled_by persisted to database

**File: apps/api/lego-api/jobs/__tests__/process-flag-schedules.test.ts**
- Test: Cron applies schedule logs automatic event (no admin)
- Test: Cron failure logs error event

### Step 13: HTTP Integration Tests
File: `apps/api/lego-api/domains/config/__http__/feature-flag-scheduling.http`
- Extend existing file with 3+ new requests
- Test: Create schedule, verify created_by in response
- Test: Cancel schedule, verify cancelled_by and cancelled_at in response
- Test: GET schedules, verify admin fields present

## Patterns to Follow

**Hexagonal Architecture:**
- Service depends on AuditLoggerPort interface (not concrete implementation)
- Inject audit logger via constructor
- Service orchestrates audit + database

**Zod-First Types:**
- All schemas defined with Zod
- Types inferred with z.infer<>
- No TypeScript interfaces

**Fire-and-Forget Audit:**
```typescript
try {
  await auditLogger.logEvent(eventType, metadata)
} catch (error) {
  logger.error('Audit logging failed', { error, eventType })
  // Don't fail the operation
}
```

**Admin Context Flow:**
```typescript
// Routes
const user = c.get('user') // AuthUser from adminAuth middleware
const adminContext = { userId: user.userId, email: user.email }

// Service
await scheduleService.createSchedule(data, adminContext)
```

## Existing Infrastructure

**Admin auth middleware:** `apps/api/lego-api/middleware/auth.ts`
- AuthUser interface: { userId, email, username, groups }
- adminAuth middleware already applied to schedule routes

**Logger:** Use `@repo/logger` for all logging
```typescript
import { logger } from '@repo/logger'
logger.info('message', { metadata })
```

## Acceptance Criteria Coverage

Ensure all 15 ACs are covered:
- AC1: Database migration with nullable columns
- AC2-5: Audit events (created, cancelled, applied, failed)
- AC6: Admin context in service layer
- AC7: Fire-and-forget audit integration
- AC8: Admin fields in API responses
- AC9-10: Zod schemas updated and exported
- AC11: Minimum 8 unit tests
- AC12: HTTP integration tests
- AC13: Backward compatibility tests
- AC14-15: Documentation (handled in PROOF.md)

## Output

Create: `_implementation/BACKEND-LOG.md` with:
- Files created/modified
- Test results
- Any issues encountered
- Signal: BACKEND COMPLETE or BACKEND BLOCKED
