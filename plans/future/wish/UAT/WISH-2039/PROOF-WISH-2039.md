# PROOF-WISH-2039: User-Level Targeting for Feature Flags

## Summary

Implemented user-level targeting (include/exclude lists) for the feature flag system, extending WISH-2009 infrastructure. Users can now be explicitly included in or excluded from feature flags, overriding percentage-based rollout.

## Acceptance Criteria Verification

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | Database table for user overrides | PASS | `featureFlagUserOverrides` table in `packages/backend/database-schema/src/schema/feature-flags.ts` |
| AC2 | POST /api/admin/flags/:flagKey/users endpoint | PASS | Route handler in `apps/api/lego-api/domains/config/routes.ts` |
| AC3 | DELETE /api/admin/flags/:flagKey/users/:userId endpoint | PASS | Route handler in `apps/api/lego-api/domains/config/routes.ts` |
| AC4 | GET /api/admin/flags/:flagKey/users endpoint | PASS | Route handler with pagination in `apps/api/lego-api/domains/config/routes.ts` |
| AC5 | Evaluation priority: exclusion > inclusion > percentage | PASS | Logic in `evaluateFlag()` in `services.ts`, tests verify priority |
| AC6 | Zod validation for override type | PASS | `OverrideTypeSchema = z.enum(['include', 'exclude'])` in types |
| AC7 | Rate limiting: 100 changes per flag per hour | PASS | `checkRateLimit()` function with RATE_LIMIT_MAX_CHANGES = 100 |
| AC8 | Cache invalidation on override changes | PASS | `invalidateUserOverride()` called after add/remove operations |
| AC9 | Pagination for list endpoint (default 50, max 500) | PASS | `pageSize = Math.min(pagination.pageSize ?? 50, 500)` |
| AC10 | Backwards compatibility without override repo | PASS | Service works with optional `userOverrideRepo` dependency |
| AC11 | Shared schemas in api-client package | PASS | Schemas added to `packages/core/api-client/src/schemas/feature-flags.ts` |
| AC12 | Admin authorization required | PASS | Routes use `/admin/flags/` path with existing auth middleware |

## Test Results

### Unit Tests: 17 tests passing

```
apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts

User Override Feature (WISH-2039)
  - DEBUG: should have all expected methods
  evaluateFlag with user overrides
    - returns false for excluded user even if flag is 100% enabled
    - returns true for included user even if flag is 0% rollout
    - prioritizes exclusion over inclusion for same user
    - falls back to percentage rollout when no override exists
    - returns false for disabled flag even with inclusion override
  addUserOverride
    - creates a new user override successfully
    - returns NOT_FOUND for non-existent flag
    - invalidates user override cache after adding
  removeUserOverride
    - removes existing user override
    - returns NOT_FOUND for non-existent override
    - invalidates user override cache after removing
  listUserOverrides
    - returns all overrides separated by type
    - returns NOT_FOUND for non-existent flag
  rate limiting
    - allows normal rate of updates
    - internal rate limit check works correctly
  backwards compatibility
    - works without userOverrideRepo configured

Test Files  1 passed (1)
     Tests  17 passed (17)
```

### HTTP Tests: 9 test cases documented

Test cases in `apps/api/lego-api/__http__/feature-flags-user-targeting.http`:
1. Add user to include list
2. Add user to exclude list
3. List all user overrides
4. Verify evaluation for included user
5. Remove user override
6. Verify override was removed
7. Add override to non-existent flag (404)
8. Remove non-existent override (404)
9. Invalid override type (400)

## Files Changed

### New Files
- `apps/api/lego-api/domains/config/__tests__/user-overrides.test.ts` - 17 unit tests
- `apps/api/lego-api/__http__/feature-flags-user-targeting.http` - HTTP test cases

### Modified Files
- `packages/backend/database-schema/src/schema/feature-flags.ts` - Added `featureFlagUserOverrides` table
- `apps/api/lego-api/domains/config/types.ts` - Added Zod schemas for user overrides
- `packages/core/api-client/src/schemas/feature-flags.ts` - Shared schemas for frontend
- `apps/api/lego-api/domains/config/ports/index.ts` - Added `UserOverrideRepository` interface
- `apps/api/lego-api/domains/config/adapters/repositories.ts` - Added `createUserOverrideRepository`
- `apps/api/lego-api/domains/config/adapters/cache.ts` - Added user override cache methods
- `apps/api/lego-api/domains/config/adapters/index.ts` - Export new repository
- `apps/api/lego-api/domains/config/application/services.ts` - Updated evaluation, added management methods
- `apps/api/lego-api/domains/config/routes.ts` - Added 3 admin endpoints

## Architecture Decisions

1. **Evaluation Priority**: Implemented as exclusion > inclusion > percentage. This ensures VIP users can be explicitly excluded even if they would otherwise be included.

2. **Rate Limiting**: In-memory rate limiter with 100 changes per flag per hour window. Prevents abuse while allowing normal admin operations.

3. **Caching Strategy**: User overrides are cached per-user per-flag with the same TTL as flags. Cache is invalidated on any modification.

4. **Database Design**: Composite unique constraint on (flag_id, user_id) allows efficient upsert operations and prevents duplicate overrides.

## Quality Gate Status

- Build: Pre-existing type issues in repository (Drizzle eq() types) - not introduced by this PR
- Types: All new code type-safe, using Zod for runtime validation
- Lint: All files pass ESLint after formatting fixes
- Tests: 17/17 unit tests passing

## Verification Date

2026-01-31
