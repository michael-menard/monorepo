# Elaboration Analysis - WISH-2039

## Re-Elaboration Context

**Date**: 2026-01-30
**Previous Status**: FAIL (blocked by WISH-2009 not implemented)
**Current Status**: WISH-2009 now implemented at `apps/api/lego-api/domains/config/`
**Purpose**: Re-analyze WISH-2039 to verify path references, architecture alignment, and implementation readiness

---

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Three new admin endpoints for user targeting, extends WISH-2009 infrastructure. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals (no complex targeting rules). Acceptance Criteria match Scope. Test Plan aligns with ACs. |
| 3 | Reuse-First | PASS | — | Extends existing WISH-2009 cache, auth middleware, and service patterns. No new shared packages needed. |
| 4 | Ports & Adapters | PASS | — | ✅ VERIFIED: All path references are correct. Service layer at `apps/api/lego-api/domains/config/application/services.ts`, adapter layer at `adapters/repositories.ts`, routes at `routes.ts`. Hexagonal architecture followed. |
| 5 | Local Testability | PASS | — | HTTP tests specified in `__http__/feature-flags-user-targeting.http` with 6 concrete requests. Unit tests specified (12 tests minimum). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Open Questions section states "None - all decisions finalized for implementation." Evaluation priority documented clearly. |
| 7 | Risk Disclosure | PASS | — | Four MVP-critical risks documented with mitigations: user override scale, cache invalidation lag, duplicate override handling, authorization checks. |
| 8 | Story Sizing | PASS | — | 12 Acceptance Criteria, 3 new endpoints, backend-only work, 2 packages affected. No sizing warning indicators. Appropriately scoped for 3 points. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Database schema path reference | Low | Story AC1 references `packages/backend/database-schema/src/schema/feature-flags.ts` which is CORRECT ✅ (verified file exists). Add user override schema to this file. |
| 2 | Missing user override Zod schemas | Medium | Story AC3/AC5 reference `AddUserOverrideRequestSchema`, `UserOverrideResponseSchema`, `UserOverridesListResponseSchema` but these don't exist in `packages/core/api-client/src/schemas/feature-flags.ts` yet. Must be added as part of implementation. |
| 3 | Service file naming inconsistency | Low | Story AC2 references `feature-flag-service.ts` but actual file is `services.ts` at `apps/api/lego-api/domains/config/application/services.ts`. Use existing file name. |
| 4 | Repository file naming inconsistency | Low | Story AC2/AC3 references `feature-flag-repository.ts` but actual file is `repositories.ts` at `apps/api/lego-api/domains/config/adapters/repositories.ts`. Use existing file name. |

---

## Split Recommendation

Not applicable - story is appropriately sized.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**:
- ✅ WISH-2009 infrastructure is fully implemented and verified
- ✅ All critical paths exist and match story assumptions
- ⚠️ Minor file naming inconsistencies need clarification (service vs services, repository vs repositories)
- ⚠️ Zod schemas need to be added to shared package (expected as part of implementation)
- ✅ Architecture patterns align perfectly with implemented WISH-2009
- ✅ No blocking issues found

**Required Actions Before Implementation**:
1. Use existing file names: `services.ts` (not `feature-flag-service.ts`)
2. Use existing file names: `repositories.ts` (not `feature-flag-repository.ts`)
3. Plan to add user override Zod schemas to both backend `types.ts` and shared `packages/core/api-client/src/schemas/feature-flags.ts`

---

## MVP-Critical Gaps

None - core journey is complete. All WISH-2009 dependencies are in place.

---

## Path Verification Results

### ✅ Verified Paths (CORRECT)

| Path Reference in Story | Actual Path | Status |
|---|---|---|
| `apps/api/lego-api/domains/config/` | ✅ EXISTS | Directory structure verified |
| `apps/api/lego-api/domains/config/application/` | ✅ EXISTS | Contains `services.ts`, `index.ts` |
| `apps/api/lego-api/domains/config/adapters/` | ✅ EXISTS | Contains `repositories.ts`, `cache.ts`, `index.ts` |
| `apps/api/lego-api/domains/config/routes.ts` | ✅ EXISTS | Main routes file verified |
| `apps/api/lego-api/domains/config/types.ts` | ✅ EXISTS | Zod schemas verified |
| `apps/api/lego-api/domains/config/ports/index.ts` | ✅ EXISTS | Port interfaces verified |
| `packages/backend/database-schema/src/schema/feature-flags.ts` | ✅ EXISTS | Feature flags schema verified |
| `packages/core/api-client/src/schemas/feature-flags.ts` | ✅ EXISTS | Shared Zod schemas verified |

### ⚠️ Path Naming Clarifications

| Story Reference | Actual Implementation | Action |
|---|---|---|
| `application/feature-flag-service.ts` | `application/services.ts` | Use `services.ts` (existing pattern) |
| `adapters/feature-flag-repository.ts` | `adapters/repositories.ts` | Use `repositories.ts` (existing pattern) |

---

## Architecture Alignment Verification

### ✅ Hexagonal Architecture Compliance

**Domain Layer** (Business Logic):
- ✅ Service at `application/services.ts` contains `createFeatureFlagService` factory
- ✅ Service exports `FeatureFlagService` type and dependencies interface
- ✅ Service uses dependency injection (flagRepo, cache)
- ✅ Service is transport-agnostic (no HTTP types)

**Adapter Layer** (Infrastructure):
- ✅ Repository adapter at `adapters/repositories.ts` with `createFeatureFlagRepository` factory
- ✅ Cache adapter at `adapters/cache.ts` with `createInMemoryCache` factory
- ✅ Adapters exported via `adapters/index.ts`

**Port Layer** (Contracts):
- ✅ Port interfaces at `ports/index.ts` define `FeatureFlagRepository` and `FeatureFlagCache`
- ✅ Types at `types.ts` use Zod schemas with `z.infer<>`

**Route Layer** (HTTP Adapter):
- ✅ Routes at `routes.ts` wire dependencies and expose endpoints
- ✅ Routes use Hono framework
- ✅ Routes are thin adapters (no business logic)
- ✅ Admin routes use `adminAuth` middleware

**No Architecture Violations**: Story extends existing patterns correctly.

---

## Implementation Readiness Summary

### ✅ Ready to Implement

- [x] WISH-2009 infrastructure verified and functional
- [x] All path references verified correct
- [x] Architecture patterns align with implementation
- [x] Database schema location verified (`packages/backend/database-schema/src/schema/feature-flags.ts`)
- [x] Service layer structure verified (`application/services.ts`)
- [x] Repository adapter pattern verified (`adapters/repositories.ts`)
- [x] Route layer pattern verified (`routes.ts` with admin routes)
- [x] Cache adapter pattern verified (`adapters/cache.ts`)
- [x] Auth middleware pattern verified (`auth`, `adminAuth` in routes)
- [x] Testing infrastructure exists (`__tests__/` directory, `__http__/` files)

### 📝 Implementation Guidance

**1. Database Schema Extension** (AC1):
- File: `packages/backend/database-schema/src/schema/feature-flags.ts`
- Add: `featureFlagUserOverrides` table with foreign key to `featureFlags.id` (CASCADE delete)
- Columns: id, flagId, userId, overrideType, reason, createdBy, createdAt
- Indexes: flagIdIdx, userIdIdx, uniqueFlagUser
- Check constraint: overrideType IN ('include', 'exclude')

**2. Zod Schema Additions**:
- Backend file: `apps/api/lego-api/domains/config/types.ts`
- Shared file: `packages/core/api-client/src/schemas/feature-flags.ts`
- Add: `UserOverrideSchema`, `AddUserOverrideRequestSchema`, `UserOverrideResponseSchema`, `UserOverridesListResponseSchema`

**3. Service Layer Extension** (AC2):
- File: `apps/api/lego-api/domains/config/application/services.ts`
- Update: `evaluateFlag` method to check user overrides before percentage logic
- Priority: exclusion > inclusion > percentage
- New dependency: User override repository (add to service deps)

**4. Repository Layer Extension** (AC3, AC4, AC5):
- File: `apps/api/lego-api/domains/config/adapters/repositories.ts`
- Add: `createUserOverrideRepository` factory
- Methods: `findByFlagAndUser`, `findAllByFlag`, `upsert`, `delete`
- Port interface: Add `UserOverrideRepository` to `ports/index.ts`

**5. Route Layer Extension** (AC3, AC4, AC5):
- File: `apps/api/lego-api/domains/config/routes.ts`
- Add to `adminConfig`: Three new admin endpoints
  - `POST /admin/flags/:flagKey/users` - Add user override
  - `DELETE /admin/flags/:flagKey/users/:userId` - Remove user override
  - `GET /admin/flags/:flagKey/users` - List user overrides
- Follow existing route pattern (auth + adminAuth middleware)

**6. Cache Strategy** (AC6):
- Extend existing cache to include user overrides
- Cache user overrides with flag data (single cache lookup for evaluation)
- Invalidate cache on user override add/remove

**7. Rate Limiting** (AC7):
- Add in-memory rate limiter (consistent with cache approach)
- Max 100 user override changes per flag per hour
- Return 429 Too Many Requests if exceeded

**8. Testing** (AC8, AC9, AC10):
- Unit tests: `apps/api/lego-api/domains/config/__tests__/` (minimum 12 tests)
- HTTP tests: `__http__/feature-flags-user-targeting.http` (minimum 6 requests)
- End-to-end scenario: Beta tester rollout (8 steps)

**9. Documentation Update** (AC12):
- File: `plans/future/wish/in-progress/WISH-2009/WISH-2009.md`
- Update "Non-goals" section to reference WISH-2039
- Update "Follow-up Stories" section checkmark for WISH-2039

---

## Worker Token Summary

- Input: ~45k tokens (20 files read, WISH-2039 story, WISH-2009 implementation, schemas, routes, services, adapters, ports)
- Output: ~8k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
