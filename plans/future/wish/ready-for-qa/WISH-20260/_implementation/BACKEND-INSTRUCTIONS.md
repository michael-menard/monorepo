# Backend Implementation Instructions - WISH-20260

## Story Context
- **Story ID**: WISH-20260
- **Title**: Automatic Retry Mechanism for Failed Flag Schedules
- **Feature Directory**: plans/future/wish
- **Story File**: plans/future/wish/in-progress/WISH-20260/WISH-20260.md
- **Plan File**: plans/future/wish/in-progress/WISH-20260/_implementation/PLAN.yaml
- **Output File**: plans/future/wish/in-progress/WISH-20260/_implementation/BACKEND-LOG.md

## Implementation Plan Location
**IMPORTANT**: This story uses PLAN.yaml (NOT IMPLEMENTATION-PLAN.md).
Read: /Users/michaelmenard/Development/monorepo/plans/future/wish/in-progress/WISH-20260/_implementation/PLAN.yaml

## Phase Execution Order
Execute phases in sequence:
1. phase_1_schema (Database migration)
2. phase_2_types (Type definitions)
3. phase_3_retry_utility (Retry logic utility)
4. phase_4_repository (Repository enhancement)
5. phase_5_cron_logic (Cron job integration)
6. phase_6_unit_tests (Unit tests)
7. phase_7_integration_tests (Integration tests)
8. phase_8_validation (Full validation)

## Key Implementation Notes
- This extends WISH-2119 (flag scheduling infrastructure) - DO NOT rewrite existing logic
- Read existing files BEFORE modifying:
  - apps/api/lego-api/jobs/process-flag-schedules.ts (cron job)
  - apps/api/lego-api/domains/config/adapters/schedule-repository.ts (repository)
  - packages/backend/database-schema/src/schema/feature-flags.ts (schema)
- Use @repo/logger for all logging (NOT console.log)
- Use Zod schemas for all types (NOT TypeScript interfaces)
- FAST-FAIL: Run pnpm check-types after each chunk

## Database Migration Command
After updating schema, generate migration:
```bash
cd packages/backend/database-schema && pnpm db:generate
```

## Test Commands
```bash
# Unit tests
pnpm test --filter lego-api retry-utils.test.ts

# Integration tests
pnpm test --filter lego-api process-flag-schedules.test.ts

# Type check
pnpm check-types --filter lego-api
pnpm check-types --filter database-schema
```

## Critical Requirements
1. Generate Drizzle migration in phase 1
2. Add calculateNextRetryAt utility with exponential backoff
3. Update findPendingWithLock query to include failed schedules ready for retry
4. Add updateRetryMetadata method to repository
5. Enhance cron job error handling with retry logic
6. Write 5+ unit tests for retry logic
7. Write 3+ integration tests for retry flow
8. CloudWatch structured logging for all retry events

## Acceptance Criteria (10 ACs)
- AC1: Database migration adds retry columns
- AC2: Query includes failed schedules ready for retry
- AC3: Exponential backoff calculation correct
- AC4: CloudWatch logs include retry metadata
- AC5: Max retries enforcement
- AC6: Successful retry behavior
- AC7: Configurable max retries via env var
- AC8: 5+ unit tests pass
- AC9: 3+ integration tests pass
- AC10: Edge case tests pass

## Completion Signal
End with "BACKEND COMPLETE" when all phases done and tests pass.
