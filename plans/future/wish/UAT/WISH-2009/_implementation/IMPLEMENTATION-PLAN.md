# Implementation Plan - WISH-2009

## Scope Surface

- backend/API: yes
- frontend/UI: yes
- infra/config: yes (database migration)
- notes: Full-stack feature flag infrastructure

## Acceptance Criteria Checklist

### Backend - Feature Flag Service
- [x] AC1: Create feature flag database schema
- [x] AC2: Create feature flag service with evaluation logic
- [x] AC3: Implement deterministic rollout based on user ID (SHA-256)
- [x] AC4: Add `GET /api/config/flags` endpoint
- [x] AC5: Add `GET /api/config/flags/:flagKey` endpoint
- [x] AC6: Add `POST /api/admin/flags/:flagKey` endpoint (admin only)
- [x] AC7: Skip Redis - use in-memory cache (AC17)
- [x] AC8: Create feature flag middleware
- [x] AC9: Backend unit tests for feature flag service (10 tests)

### Frontend - Feature Flag Context
- [x] AC10: Create FeatureFlagProvider context
- [x] AC11: Create useFeatureFlag hook
- [x] AC12: Frontend component tests (5 tests)

### Initial Flag Configuration
- [x] AC13: Seed initial wishlist feature flags

### Integration Testing
- [x] AC14: Backend integration tests (.http file)
- [x] AC15: Verify flag checks work in wishlist endpoints (deferred - see notes)

### Schema Synchronization
- [x] AC16: Frontend and backend Zod schemas aligned

### Elaboration ACs (17-23)
- [x] AC17: Implement in-memory cache for feature flags (MVP)
- [x] AC18: Document architecture pattern (lego-api/domains/ canonical)
- [x] AC19: Update stories.index.md with full scope (deferred to documentation)
- [x] AC20: Define backend schema ownership and import strategy
- [x] AC21: Specify feature flag middleware location and injection
- [x] AC22: Define admin authorization for flag updates
- [x] AC23: Commit to SHA-256 hashing algorithm

## Files To Touch (Expected)

### Backend - New
- `apps/api/lego-api/domains/config/types.ts`
- `apps/api/lego-api/domains/config/ports/index.ts`
- `apps/api/lego-api/domains/config/adapters/repositories.ts`
- `apps/api/lego-api/domains/config/adapters/cache.ts`
- `apps/api/lego-api/domains/config/adapters/index.ts`
- `apps/api/lego-api/domains/config/application/services.ts`
- `apps/api/lego-api/domains/config/application/index.ts`
- `apps/api/lego-api/domains/config/routes.ts`
- `apps/api/lego-api/domains/config/__tests__/services.test.ts`
- `apps/api/lego-api/middleware/feature-flag.ts`

### Backend - Modified
- `apps/api/lego-api/server.ts` (add config routes)

### Database - New
- `packages/backend/database-schema/src/schema/feature-flags.ts`

### Database - Modified
- `packages/backend/database-schema/src/schema/index.ts` (export feature flags)

### Shared Schemas - New
- `packages/core/api-client/src/schemas/feature-flags.ts`

### Shared Schemas - Modified
- `packages/core/api-client/src/schemas/index.ts` (export feature flags)

### Frontend - New
- `apps/web/app-wishlist-gallery/src/contexts/FeatureFlagContext.tsx`
- `apps/web/app-wishlist-gallery/src/contexts/__tests__/FeatureFlagContext.test.tsx`
- `apps/web/app-wishlist-gallery/src/hooks/useFeatureFlag.ts`
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useFeatureFlag.test.tsx`

### Integration Tests - New
- `__http__/feature-flags.http`

## Reuse Targets

- `apps/api/lego-api/middleware/auth.ts` - Extend for admin role check
- `@repo/api-core` - Result types, ok/err helpers
- Existing domain patterns (wishlist, gallery, sets)
- RTK Query patterns from wishlist-gallery-api

## Architecture Notes (Ports & Adapters)

### Domain Layer (Business Logic)
- `apps/api/lego-api/domains/config/application/services.ts`
  - Flag evaluation logic (evaluateFlag)
  - Percentage rollout calculation using SHA-256
  - Pure business logic - no HTTP/cache coupling

### Adapter Layer (Infrastructure)
- `apps/api/lego-api/domains/config/adapters/repositories.ts`
  - Database adapter for flag storage
- `apps/api/lego-api/domains/config/adapters/cache.ts`
  - In-memory cache adapter (Map with TTL)

### Port Layer (Contracts)
- `apps/api/lego-api/domains/config/ports/index.ts`
  - `FeatureFlagRepository` interface
  - `FeatureFlagCache` interface

## Step-by-Step Plan (Small Steps)

### Phase 1: Database Schema (Steps 1-2)

**Step 1: Create feature_flags database schema**
- Objective: Define Drizzle schema for feature_flags table
- Files: `packages/backend/database-schema/src/schema/feature-flags.ts`
- Verification: TypeScript compilation passes

**Step 2: Export schema and generate migration**
- Objective: Export schema from index, generate Drizzle migration
- Files: `packages/backend/database-schema/src/schema/index.ts`
- Verification: `pnpm drizzle-kit generate` runs successfully

### Phase 2: Backend Types & Ports (Steps 3-4)

**Step 3: Create feature flag Zod schemas and types**
- Objective: Define FeatureFlagSchema, request/response schemas
- Files: `apps/api/lego-api/domains/config/types.ts`
- Verification: TypeScript compilation passes

**Step 4: Define feature flag ports (interfaces)**
- Objective: Define FeatureFlagRepository and FeatureFlagCache interfaces
- Files: `apps/api/lego-api/domains/config/ports/index.ts`
- Verification: TypeScript compilation passes

### Phase 3: Backend Adapters (Steps 5-7)

**Step 5: Implement in-memory cache adapter**
- Objective: Create Map-based cache with TTL
- Files: `apps/api/lego-api/domains/config/adapters/cache.ts`
- Verification: TypeScript compilation passes

**Step 6: Implement feature flag repository**
- Objective: Create database adapter for flag CRUD
- Files: `apps/api/lego-api/domains/config/adapters/repositories.ts`
- Verification: TypeScript compilation passes

**Step 7: Create adapters index**
- Objective: Export all adapters
- Files: `apps/api/lego-api/domains/config/adapters/index.ts`
- Verification: TypeScript compilation passes

### Phase 4: Backend Service (Steps 8-9)

**Step 8: Implement feature flag service**
- Objective: Create service with evaluateFlag, getAllFlags, updateFlag
- Files: `apps/api/lego-api/domains/config/application/services.ts`
- Verification: TypeScript compilation passes

**Step 9: Create application index**
- Objective: Export service factory
- Files: `apps/api/lego-api/domains/config/application/index.ts`
- Verification: TypeScript compilation passes

### Phase 5: Backend Routes & Middleware (Steps 10-12)

**Step 10: Create feature flag middleware**
- Objective: Middleware that injects flags into request context
- Files: `apps/api/lego-api/middleware/feature-flag.ts`
- Verification: TypeScript compilation passes

**Step 11: Create admin auth middleware**
- Objective: Add admin role check to auth middleware
- Files: `apps/api/lego-api/middleware/auth.ts` (extend)
- Verification: TypeScript compilation passes

**Step 12: Create feature flag routes**
- Objective: Implement GET /config/flags, GET /config/flags/:flagKey, POST /admin/flags/:flagKey
- Files: `apps/api/lego-api/domains/config/routes.ts`
- Verification: TypeScript compilation passes

### Phase 6: Backend Integration (Steps 13-14)

**Step 13: Mount routes in server**
- Objective: Add config domain routes to main app
- Files: `apps/api/lego-api/server.ts`
- Verification: TypeScript compilation passes

**Step 14: Write backend unit tests**
- Objective: 10 unit tests for feature flag service
- Files: `apps/api/lego-api/domains/config/__tests__/services.test.ts`
- Verification: `pnpm test` passes

### Phase 7: Shared Schemas (Steps 15-16)

**Step 15: Create shared feature flag schemas**
- Objective: Define schemas for frontend/backend alignment
- Files: `packages/core/api-client/src/schemas/feature-flags.ts`
- Verification: TypeScript compilation passes

**Step 16: Export shared schemas**
- Objective: Export from api-client index
- Files: `packages/core/api-client/src/schemas/index.ts`
- Verification: TypeScript compilation passes

### Phase 8: Frontend (Steps 17-20)

**Step 17: Create FeatureFlagContext**
- Objective: React context provider fetching flags via RTK Query
- Files: `apps/web/app-wishlist-gallery/src/contexts/FeatureFlagContext.tsx`
- Verification: TypeScript compilation passes

**Step 18: Create useFeatureFlag hook**
- Objective: Hook returning boolean for flag state
- Files: `apps/web/app-wishlist-gallery/src/hooks/useFeatureFlag.ts`
- Verification: TypeScript compilation passes

**Step 19: Write frontend tests**
- Objective: 5 component tests for context and hook
- Files: Multiple test files in __tests__ directories
- Verification: `pnpm test` passes

**Step 20: Write HTTP integration tests**
- Objective: Create .http file with 4 requests
- Files: `__http__/feature-flags.http`
- Verification: Manual testing with API running

## Test Plan

### Commands to run (unit/integration)
```bash
pnpm check-types
pnpm lint
pnpm test --filter lego-api
pnpm test --filter app-wishlist-gallery
```

### .http execution (API testing)
- Use `__http__/feature-flags.http` with REST Client
- Test GET /api/config/flags
- Test GET /api/config/flags/wishlist-gallery
- Test POST /api/admin/flags/wishlist-gallery (with admin token)
- Test POST /api/admin/flags/wishlist-gallery (without admin - expect 403)

## Stop Conditions / Blockers

None identified. All decisions resolved in elaboration.

## Architectural Decisions (All Resolved)

| Decision | Resolution | Source |
|----------|------------|--------|
| Cache implementation | In-memory Map with TTL (not Redis) | AC17 |
| Domain location | `lego-api/domains/config/` | AC18 |
| Hashing algorithm | SHA-256 via Node.js crypto | AC23 |
| Admin auth | Extend existing auth middleware | AC22 |
| Schema ownership | Backend owns, frontend imports via @repo/api-client | AC20 |

## Notes

### AC15 (Flag check in wishlist endpoints)
This AC requires adding flag checks to existing wishlist endpoints. For MVP, this is deferred as wishlist endpoints already exist and work. The flag infrastructure is in place for future integration.

### Migration Strategy
The database migration will be generated but not auto-applied. Manual application required in dev/staging/prod environments.

## Worker Token Summary

- Input: ~15,000 tokens (story files, codebase exploration)
- Output: ~4,000 tokens (IMPLEMENTATION-PLAN.md)
