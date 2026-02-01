# Elaboration Analysis - WISH-2009

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story plans hexagonal architecture but stories.index.md shows "In Elaboration" with no scope defined. Scope mismatch: story defines complex service layer (`application/feature-flag-service.ts`, `adapters/feature-flag-repository.ts`) but index entry shows minimal detail. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are internally consistent. No contradictions found. |
| 3 | Reuse-First | FAIL | High | Story plans to create Redis cache adapter but **no Redis infrastructure exists in codebase**. Searched `packages/backend/**/*redis*.ts` and `packages/backend/**/*cache*.ts` - no files found. Story assumes Redis exists but provides no setup guidance. Must either: (1) Create Redis infrastructure first, or (2) Use simpler in-memory cache for MVP. |
| 4 | Ports & Adapters | FAIL | Critical | Story violates API architecture: plans `apps/api/lego-api/domains/config/` but `docs/architecture/api-layer.md` **requires services in `apps/api/services/{domain}/`**, not `apps/api/lego-api/domains/`. Existing codebase uses `lego-api/domains/` pattern (gallery, wishlist, health) but this conflicts with documented architecture. Story must clarify which pattern is canonical. |
| 5 | Local Testability | PASS | — | `.http` file planned (`__http__/feature-flags.http`), 4 HTTP requests specified. Backend and frontend unit tests defined (10 + 5). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Open Questions section states "None - all decisions finalized for MVP scope." |
| 7 | Risk Disclosure | CONDITIONAL | Medium | 4 MVP-critical risks documented but **Redis cache risk underspecified**: Story assumes Redis exists without validating infrastructure availability. Risk #3 mentions "Flag Cache Staleness" but doesn't address "What if Redis isn't available at all?" |
| 8 | Story Sizing | PASS | — | 16 ACs, 1 new domain (config), backend + frontend work. Sizing is appropriate for 2-point estimate. No split indicators. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Redis Infrastructure Missing** | Critical | Story assumes Redis cache exists (`apps/api/lego-api/core/cache/redis.ts`) but no Redis files found in codebase. Must either: (1) Add WISH-XXXX dependency to create Redis infrastructure first, or (2) Use in-memory cache (e.g., Map with TTL) for MVP and defer Redis to future story. |
| 2 | **Architecture Pattern Conflict** | Critical | Story uses `apps/api/lego-api/domains/config/` but `docs/architecture/api-layer.md` requires `apps/api/services/{domain}/`. Existing domains (gallery, wishlist) already use `lego-api/domains/` pattern. Must clarify: Is `lego-api/domains/` the new standard or migration in progress? Update story to match canonical pattern. |
| 3 | **Scope Alignment Mismatch** | High | stories.index.md shows WISH-2009 as "In Elaboration" with minimal detail, but story defines 16 ACs with complex hexagonal architecture. Index entry must be updated with full scope: 3 endpoints, 5 packages, database migration, Redis cache. |
| 4 | **Shared Schema Package Location** | Medium | AC 16 requires "Frontend and backend Zod schemas aligned" but story specifies schemas in `packages/core/api-client/src/schemas/feature-flags.ts`. No backend schema location specified. Backend should define schemas in `apps/api/lego-api/domains/config/types.ts` and export, then frontend imports from `@repo/api-client`. Clarify schema ownership. |
| 5 | **Middleware Injection Location** | Medium | AC 8 plans "feature flag middleware" that injects flags into `req.featureFlags` but doesn't specify **where** middleware is applied. Must clarify: Global app-level middleware? Per-route middleware? Middleware package location (`apps/api/lego-api/middleware/feature-flag.ts`)? |
| 6 | **Admin Authorization Check** | High | AC 6 requires "admin role (authorization check)" for `POST /api/admin/flags/:flagKey` but doesn't specify how admin role is validated. Story must reference existing auth middleware from `apps/api/lego-api/middleware/auth.ts` or define admin check logic. |
| 7 | **User ID Hashing Algorithm** | Low | AC 3 specifies "murmurhash3 or similar" but doesn't commit to specific library. Recommend: Use `murmurhash-js` (existing npm package) or Node.js `crypto.createHash('sha256')` for consistency. Document chosen algorithm in story. |

## Split Recommendation

Not applicable - story is appropriately sized for 2-point estimate.

## Preliminary Verdict

**Verdict**: FAIL

**Rationale**: Three critical blockers prevent implementation:

1. **Missing Redis Infrastructure** - Story assumes Redis cache exists but codebase search shows no Redis files. Implementation will fail without cache layer.

2. **Architecture Pattern Conflict** - Story uses `lego-api/domains/` pattern but documented API layer architecture requires `services/{domain}/`. Must resolve canonical pattern before proceeding.

3. **Scope Misalignment** - stories.index.md shows minimal detail ("In Elaboration") but story defines complex 16-AC implementation. Index must be updated to reflect full scope.

**Required Actions Before Implementation**:
- [ ] Add Redis infrastructure dependency OR switch to in-memory cache for MVP
- [ ] Clarify canonical API architecture pattern (domains vs services)
- [ ] Update stories.index.md with full WISH-2009 scope
- [ ] Specify backend schema location and import strategy
- [ ] Document middleware injection location
- [ ] Define admin authorization check strategy
- [ ] Commit to specific hashing algorithm

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | **Redis Infrastructure** | Flag caching (AC 7, 8) | Story depends on Redis for 5-minute TTL caching but no Redis infrastructure exists. Blocks: (1) Flag caching, (2) Cache invalidation on update, (3) Fallback to database. **Fix**: Either add WISH-XXXX dependency for Redis setup OR use in-memory cache (Map with TTL) for MVP. |
| 2 | **Architecture Clarity** | All backend implementation (AC 2-9) | Story uses `lego-api/domains/config/` but documented architecture requires `services/{domain}/`. Existing domains already violate documented pattern. Blocks: (1) File structure decisions, (2) Import paths, (3) Code review compliance. **Fix**: Update `docs/architecture/api-layer.md` to document `lego-api/domains/` pattern OR migrate story to `services/config/`. |
| 3 | **Admin Authorization** | Admin flag updates (AC 6) | Story requires admin role check for `POST /api/admin/flags/:flagKey` but doesn't specify how admin is validated. Blocks: (1) Authorization middleware, (2) Test fixtures for admin users, (3) 403 error handling. **Fix**: Reference existing auth middleware or define admin check in `middleware/auth.ts` with role extraction from JWT. |

---

## Worker Token Summary

- Input: ~8.5k tokens (WISH-2009.md: 3.8k, stories.index.md: 2.2k, api-layer.md: 2.5k, agent instructions: ~1.5k, file system checks: ~0.5k)
- Output: ~1.8k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
