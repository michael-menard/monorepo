# Implementation Plan - WISH-2039

## Scope Surface

- **backend/API**: yes - Service, repository, routes, database schema
- **frontend/UI**: no
- **infra/config**: no - Uses existing cache infrastructure

**Notes**: Backend-only story extending WISH-2009 feature flag infrastructure with user-level targeting.

---

## Acceptance Criteria Checklist

- [ ] **AC1**: Create `feature_flag_user_overrides` table with Drizzle schema
- [ ] **AC2**: Update `evaluateFlag` to check user overrides (exclusion > inclusion > percentage)
- [ ] **AC3**: POST `/api/admin/flags/:flagKey/users` - Add user override
- [ ] **AC4**: DELETE `/api/admin/flags/:flagKey/users/:userId` - Remove override
- [ ] **AC5**: GET `/api/admin/flags/:flagKey/users` - List overrides with pagination
- [ ] **AC6**: Cache user overrides with flag cache (5-minute TTL)
- [ ] **AC7**: Rate limiting (100 changes per flag per hour)
- [ ] **AC8**: 12+ unit tests for user override logic
- [ ] **AC9**: 6+ HTTP integration tests
- [ ] **AC10**: End-to-end verification
- [ ] **AC11**: Frontend/backend schema alignment
- [ ] **AC12**: Update WISH-2009 documentation

---

## Files To Touch (Expected)

### Create New Files
1. `packages/backend/database-schema/src/migrations/app/0009_add_feature_flag_user_overrides.sql` - Migration
2. `apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts` - Unit tests
3. `apps/api/lego-api/__http__/feature-flags-user-targeting.http` - HTTP tests

### Modify Existing Files
1. `packages/backend/database-schema/src/schema/feature-flags.ts` - Add user overrides table
2. `apps/api/lego-api/domains/config/types.ts` - Add Zod schemas
3. `apps/api/lego-api/domains/config/ports/index.ts` - Add repository port interface
4. `apps/api/lego-api/domains/config/adapters/repositories.ts` - Add repository adapter
5. `apps/api/lego-api/domains/config/adapters/cache.ts` - Add user overrides caching
6. `apps/api/lego-api/domains/config/application/services.ts` - Update evaluateFlag
7. `apps/api/lego-api/domains/config/routes.ts` - Add admin endpoints
8. `packages/core/api-client/src/schemas/feature-flags.ts` - Add shared schemas

---

## Reuse Targets

### From WISH-2009
- `createFeatureFlagService` factory pattern
- `createFeatureFlagRepository` adapter pattern
- `createInMemoryCache` / `createRedisCacheAdapter` patterns
- `auth` / `adminAuth` middleware
- Zod schema patterns and validation approach
- Test structure and mock patterns

### From Existing Codebase
- `@repo/api-core` Result type for error handling
- Drizzle ORM patterns from existing schemas
- Hono route patterns

---

## Architecture Notes (Ports & Adapters)

### Domain Layer (Business Logic)
- `services.ts`: Add user override check to `evaluateFlag` method
- No HTTP/database concerns in service layer
- Evaluation priority: exclusion > inclusion > percentage (documented clearly)

### Port Layer (Contracts)
- `ports/index.ts`: Add `UserOverrideRepository` interface
- `types.ts`: Add Zod schemas for user override types

### Adapter Layer (Infrastructure)
- `repositories.ts`: Add `createUserOverrideRepository` factory
- `cache.ts`: Extend cache to include user overrides per flag

### HTTP Adapter (Routes)
- `routes.ts`: Add three admin endpoints with minimal logic (thin adapter)
- Use existing `adminAuth` middleware for authorization

---

## Step-by-Step Plan (Small Steps)

### Step 1: Add Database Schema for User Overrides

**Objective**: Create Drizzle schema for `feature_flag_user_overrides` table

**Files**:
- `packages/backend/database-schema/src/schema/feature-flags.ts`

**Implementation**:
```typescript
export const featureFlagUserOverrides = pgTable(
  'feature_flag_user_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flagId: uuid('flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    overrideType: text('override_type').notNull(), // 'include' | 'exclude'
    reason: text('reason'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    flagIdIdx: index('idx_ffu_flag_id').on(table.flagId),
    userIdIdx: index('idx_ffu_user_id').on(table.userId),
    uniqueFlagUser: uniqueIndex('ffu_flag_user_unique').on(table.flagId, table.userId),
    overrideTypeCheck: check('override_type_check', sql`override_type IN ('include', 'exclude')`),
  }),
)
```

**Verification**: `pnpm check-types` passes for database-schema package

---

### Step 2: Add Zod Schemas for User Overrides (Backend)

**Objective**: Define Zod schemas in backend types.ts

**Files**:
- `apps/api/lego-api/domains/config/types.ts`

**Implementation**:
```typescript
// User Override Types
export const OverrideTypeSchema = z.enum(['include', 'exclude'])
export type OverrideType = z.infer<typeof OverrideTypeSchema>

export const UserOverrideSchema = z.object({
  id: z.string().uuid(),
  flagId: z.string().uuid(),
  userId: z.string().min(1).max(255),
  overrideType: OverrideTypeSchema,
  reason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
})
export type UserOverride = z.infer<typeof UserOverrideSchema>

export const AddUserOverrideRequestSchema = z.object({
  userId: z.string().min(1).max(255),
  overrideType: OverrideTypeSchema,
  reason: z.string().max(500).optional(),
})
export type AddUserOverrideRequest = z.infer<typeof AddUserOverrideRequestSchema>

export const UserOverrideResponseSchema = z.object({
  userId: z.string(),
  overrideType: OverrideTypeSchema,
  reason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.date(),
})
export type UserOverrideResponse = z.infer<typeof UserOverrideResponseSchema>

export const UserOverridesListResponseSchema = z.object({
  includes: z.array(UserOverrideResponseSchema),
  excludes: z.array(UserOverrideResponseSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
})
export type UserOverridesListResponse = z.infer<typeof UserOverridesListResponseSchema>
```

**Verification**: `pnpm check-types` passes

---

### Step 3: Add Shared Zod Schemas (API Client)

**Objective**: Add schemas to shared package for frontend/backend alignment

**Files**:
- `packages/core/api-client/src/schemas/feature-flags.ts`

**Implementation**: Add same schemas with datetime strings instead of Date objects for JSON serialization

**Verification**: `pnpm check-types` passes for api-client package

---

### Step 4: Add User Override Repository Port Interface

**Objective**: Define repository interface in ports layer

**Files**:
- `apps/api/lego-api/domains/config/ports/index.ts`

**Implementation**:
```typescript
export interface UserOverrideRepository {
  findByFlagAndUser(flagId: string, userId: string): Promise<UserOverride | null>
  findAllByFlag(flagId: string, pagination: { page: number; pageSize: number }): Promise<{
    overrides: UserOverride[]
    total: number
  }>
  upsert(flagId: string, input: { userId: string; overrideType: OverrideType; reason?: string; createdBy?: string }): Promise<Result<UserOverride, 'DB_ERROR'>>
  delete(flagId: string, userId: string): Promise<Result<void, 'NOT_FOUND'>>
  deleteAllByFlag(flagId: string): Promise<void>
}
```

**Verification**: TypeScript compilation passes

---

### Step 5: Implement User Override Repository Adapter

**Objective**: Create repository adapter with Drizzle queries

**Files**:
- `apps/api/lego-api/domains/config/adapters/repositories.ts`

**Implementation**: Add `createUserOverrideRepository` factory function with:
- `findByFlagAndUser` - SELECT with WHERE flag_id AND user_id
- `findAllByFlag` - SELECT with pagination, ORDER BY created_at DESC
- `upsert` - INSERT ON CONFLICT UPDATE
- `delete` - DELETE with WHERE clause
- `deleteAllByFlag` - DELETE all overrides for a flag

**Verification**: `pnpm check-types` passes

---

### Step 6: Extend Cache with User Overrides

**Objective**: Add user override caching capability

**Files**:
- `apps/api/lego-api/domains/config/adapters/cache.ts`
- `apps/api/lego-api/domains/config/ports/index.ts`

**Implementation**:
- Add cache key pattern: `feature_flags:{env}:{flagKey}:overrides:{userId}`
- Add methods to cache interface: `getUserOverride`, `setUserOverride`, `invalidateUserOverrides`
- Keep same 5-minute TTL as flag cache

**Verification**: `pnpm check-types` passes

---

### Step 7: Update Service - evaluateFlag with User Overrides

**Objective**: Add user override check to flag evaluation logic

**Files**:
- `apps/api/lego-api/domains/config/application/services.ts`

**Implementation**:
```typescript
// In evaluateFlag method, BEFORE percentage check:
async evaluateFlag(flagKey: string, userId?: string, environment: string = 'production'): Promise<boolean> {
  const flags = await loadFlags(environment)
  const flag = flags.get(flagKey)

  if (!flag) return false
  if (!flag.enabled) return false

  // WISH-2039: Check user overrides if userId provided
  if (userId) {
    const override = await getUserOverride(flag.id, userId)
    if (override) {
      // Exclusion = false (highest priority)
      if (override.overrideType === 'exclude') return false
      // Inclusion = true (second priority)
      if (override.overrideType === 'include') return true
    }
  }

  // Fall back to percentage-based evaluation
  if (flag.rolloutPercentage >= 100) return true
  if (flag.rolloutPercentage <= 0) return false
  if (!userId) return true

  const userPercentage = hashUserIdToPercentage(userId)
  return userPercentage < flag.rolloutPercentage
}
```

**Verification**: `pnpm check-types` passes

---

### Step 8: Add Service Methods for User Override Management

**Objective**: Add service methods for CRUD operations on user overrides

**Files**:
- `apps/api/lego-api/domains/config/application/services.ts`

**Implementation**:
- `addUserOverride(flagKey, input, environment)` - Add/update user override
- `removeUserOverride(flagKey, userId, environment)` - Remove user override
- `listUserOverrides(flagKey, pagination, environment)` - List all overrides for flag
- Add rate limiting check (100 changes per flag per hour)

**Verification**: `pnpm check-types` passes

---

### Step 9: Add Admin Routes for User Override Management

**Objective**: Add three admin endpoints

**Files**:
- `apps/api/lego-api/domains/config/routes.ts`

**Implementation**:
```typescript
// POST /admin/flags/:flagKey/users - Add user override
adminConfig.post('/flags/:flagKey/users', async c => {
  const flagKey = c.req.param('flagKey')
  const body = await c.req.json()
  const input = AddUserOverrideRequestSchema.safeParse(body)
  if (!input.success) return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)

  const adminId = c.get('userId')
  const result = await featureFlagService.addUserOverride(flagKey, { ...input.data, createdBy: adminId })

  if (!result.ok) {
    if (result.error === 'NOT_FOUND') return c.json({ error: 'Flag not found' }, 404)
    if (result.error === 'RATE_LIMITED') return c.json({ error: 'Rate limit exceeded' }, 429)
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data, 201)
})

// DELETE /admin/flags/:flagKey/users/:userId - Remove user override
adminConfig.delete('/flags/:flagKey/users/:userId', async c => { ... })

// GET /admin/flags/:flagKey/users - List user overrides
adminConfig.get('/flags/:flagKey/users', async c => { ... })
```

**Verification**: `pnpm check-types` passes

---

### Step 10: Write Unit Tests for User Override Logic

**Objective**: Create comprehensive unit tests (12+ tests)

**Files**:
- `apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts`

**Test Cases**:
1. Exclusion override returns false (even if flag 100% enabled)
2. Inclusion override returns true (even if flag 0% enabled)
3. Exclusion priority: user in both lists returns false
4. No override: falls back to percentage-based evaluation
5. Invalid userId: returns false (safe default)
6. Cache hit: reads overrides from cache
7. Cache miss: reads overrides from database
8. Cache invalidation on add override
9. Cache invalidation on remove override
10. Pagination works correctly (50 per page default)
11. Rate limiting blocks excessive updates
12. CASCADE delete: removing flag removes overrides

**Verification**: `pnpm test apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts` passes

---

### Step 11: Write HTTP Integration Tests

**Objective**: Create HTTP tests for new endpoints (6+ requests)

**Files**:
- `apps/api/lego-api/__http__/feature-flags-user-targeting.http`

**Test Cases**:
1. POST /api/admin/flags/wishlist-gallery/users - Add include override
2. POST /api/admin/flags/wishlist-gallery/users - Add exclude override
3. GET /api/admin/flags/wishlist-gallery/users - List all overrides
4. GET /api/config/flags - Verify evaluation for included user
5. DELETE /api/admin/flags/wishlist-gallery/users/:userId - Remove override
6. GET /api/admin/flags/wishlist-gallery/users - Verify removal

**Verification**: Manual HTTP test execution

---

### Step 12: Update WISH-2009 Documentation

**Objective**: Cross-reference WISH-2039 in parent story

**Files**:
- (Reference update only - story is already in UAT)

**Implementation**: Note in PROOF document that WISH-2039 delivers user-level targeting as enhancement to WISH-2009

**Verification**: Documentation review

---

## Test Plan

### Unit Tests
```bash
pnpm test apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts
```

### Type Check
```bash
pnpm check-types
```

### Lint
```bash
pnpm lint
```

### Full Test Suite
```bash
pnpm test
```

### HTTP Tests
Manual execution of `apps/api/lego-api/__http__/feature-flags-user-targeting.http`

---

## Stop Conditions / Blockers

None identified. All dependencies are in place:
- WISH-2009 feature flag infrastructure is fully implemented
- WISH-2019 Redis cache support is available
- Database schema patterns are established
- Auth middleware is ready for reuse

---

## Architectural Decisions

### ARCH-001: User Override Storage Strategy (CONFIRMED)

**Question**: How should user overrides be stored relative to flags?

**Context**: Need to efficiently look up overrides during flag evaluation.

**Decision**: Separate `feature_flag_user_overrides` table with foreign key to `feature_flags`.
- Follows existing pattern from WISH-2009
- Enables efficient queries by flag_id and user_id indexes
- CASCADE delete ensures cleanup when flags are removed

**Status**: Pre-confirmed in story definition (AC1).

---

### ARCH-002: Cache Strategy for User Overrides (CONFIRMED)

**Question**: How should user overrides be cached?

**Context**: Need to balance performance with cache freshness.

**Decision**: Per-user, per-flag caching with same 5-minute TTL as flag cache.
- Cache key: `feature_flags:{env}:{flagKey}:overrides:{userId}`
- Invalidate on override add/remove
- Fallback to database if cache unavailable

**Status**: Pre-confirmed in story definition (AC6).

---

### ARCH-003: Evaluation Priority Order (CONFIRMED)

**Question**: What's the priority when multiple override types exist?

**Context**: User could theoretically be in both include and exclude lists (race condition on upsert).

**Decision**: exclusion > inclusion > percentage
1. Check exclusion first - return false
2. Check inclusion second - return true
3. Fall back to percentage-based evaluation

**Status**: Pre-confirmed in story definition (Evaluation Logic Update section).

---

## Worker Token Summary

- Input: ~25k tokens (story file, 8 source files, 2 test files, 2 agent files)
- Output: ~8k tokens (IMPLEMENTATION-PLAN.md)
