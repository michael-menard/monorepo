# Elaboration Analysis - WISH-2124

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md (lines 828-866). Redis migration from in-memory cache for feature flags. Infrastructure-only change with no API contract modifications. |
| 2 | Internal Consistency | **FAIL** | **Critical** | **MAJOR DEFECT**: Story AC2 and Architecture Notes (lines 350-392) define a simplified `CacheAdapter` interface with `get(key)`, `set(key, value, ttl)`, `delete(key)` methods. However, WISH-2009 already implemented `FeatureFlagCache` port with different signatures: `get(environment)`, `set(environment, flags[], ttl)`, `getFlag(environment, flagKey)`, `invalidate(environment)`. Story proposes incompatible interface that would break existing WISH-2009 service layer. |
| 3 | Reuse-First | PASS | — | Reuses @repo/logger, packages/backend/db for fallback reads. Creates redis-client singleton in core/cache/ for future domain reuse. |
| 4 | Ports & Adapters | **FAIL** | **Critical** | **DEFECT**: AC2 and AC14 reference correct `domains/config/` structure BUT propose incompatible cache interface. Story must either: (A) Implement `RedisCacheAdapter` conforming to existing `FeatureFlagCache` port, OR (B) Create migration story to refactor cache interface across all domains. Architecture Notes show Redis adapter implementing wrong interface. |
| 5 | Local Testability | PASS | — | AC11 specifies Docker Compose Redis setup. AC10 includes load testing (50 concurrent requests). Integration tests with ephemeral Docker Redis. Infrastructure validation via CDK/Terraform. |
| 6 | Decision Completeness | **FAIL** | **Medium** | AC1 selects ioredis v5.x but doesn't specify WHERE Redis client singleton lives (AC mentions `apps/api/lego-api/core/cache/redis-client.ts` but `core/` directory doesn't exist). Must clarify: create new `core/` directory OR place in existing location. AC15 clarifies cache key pattern but pattern in example code (`flag:{key}`) contradicts WISH-2009's environment-scoped design. |
| 7 | Risk Disclosure | PASS | — | 5 MVP-critical risks with mitigations: Lambda cold start (Risks section lines 535-543), VPC security (lines 545-553), cache invalidation race (lines 555-562), cost overruns (lines 564-571), connection pool exhaustion (lines 573-583). |
| 8 | Story Sizing | **CONDITIONAL** | Medium | 16 ACs exceeds recommended 8-AC threshold. Story includes: adapter implementation (AC1-2), error handling (AC3-6), cache management (AC7-8), infrastructure (AC9, AC12-13), testing (AC10-11), service wiring (AC14-16). However, infrastructure stories naturally have more ACs due to operational concerns. Estimated 4 points is reasonable if interface alignment resolved. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Cache interface incompatibility with WISH-2009 | **CRITICAL** | **BLOCKING**: Story proposes `CacheAdapter` interface (lines 350-357) incompatible with WISH-2009's `FeatureFlagCache` port. WISH-2009 uses environment-scoped caching (`get(environment)`, `set(environment, flags[], ttl)`), story proposes key-value caching (`get(key)`, `set(key, value, ttl)`). Must update AC2 and Architecture Notes to implement `RedisCacheAdapter` conforming to `FeatureFlagCache` interface from `domains/config/ports/index.ts`. Example: `get(environment)` retrieves all flags for env from Redis hash, `getFlag(environment, flagKey)` uses Redis HGET, `set()` stores entire flag map, `invalidate(environment)` deletes Redis hash. |
| 2 | Missing core/ directory specification | High | AC1, Architecture Notes (lines 429-445), and Scope (line 82) reference `apps/api/lego-api/core/cache/redis-client.ts` but codebase inspection shows `core/` doesn't exist. Must add to Scope: "Create `apps/api/lego-api/core/` directory for shared infrastructure" OR update all references to place Redis client in existing `domains/config/adapters/` (less reusable but simpler). Recommend: Create core/ for cross-domain Redis reuse per hexagonal architecture best practices. |
| 3 | Cache key pattern contradicts WISH-2009 environment scoping | High | AC2 and Architecture Notes (lines 366-368) show cache key pattern `flag:{key}` but WISH-2009's `FeatureFlagCache` port expects environment-scoped caching. AC15 attempts to address with `feature_flags:{environment}:{flagKey}` but doesn't reconcile with service layer expecting `FeatureFlagCache.get(environment)` to return ALL flags for that environment. Must specify Redis data structure: (A) Single hash per environment `feature_flags:{env}` with HSET/HGET, OR (B) Individual keys `feature_flags:{env}:{key}` with separate TTLs (breaks current interface expecting atomic environment cache). |
| 4 | Incomplete DI wiring location | Medium | AC14 mentions "DI container in `apps/api/lego-api/domains/config/index.ts`" (line 293) but file inspection shows `domains/config/` only has `routes.ts` and `types.ts` in root. Application layer exports `createFeatureFlagService` factory. Must clarify WHERE DI wiring happens: update `application/index.ts` factory signature, OR create new `domains/config/index.ts` DI container, OR wire in `routes.ts`. Recommend: Update `createFeatureFlagService()` factory to accept cache adapter parameter. |
| 5 | Service layer update specification unclear | Medium | AC14 (lines 289-300) says "update service to inject RedisCacheAdapter" but doesn't specify HOW. WISH-2009 service uses `createFeatureFlagService({ repository, cache })` factory pattern. Must clarify: "Update `createFeatureFlagService` factory in `application/services.ts` to accept `cache: FeatureFlagCache` parameter, instantiate with `createRedisCache()` instead of `createInMemoryCache()`." |
| 6 | REDIS_URL environment variable location ambiguous | Low | AC16 (lines 316-327) and AC11 (lines 251-262) mention `.env.local` without specifying path. Docker Compose setup implies `apps/api/lego-api/.env.local`. Should clarify: "Create/update `apps/api/lego-api/.env.local` with REDIS_URL=redis://localhost:6379". |
| 7 | TTL specification mismatch | Low | AC7 specifies 300 seconds (5 minutes) but WISH-2009's cache interface uses `ttlMs` (milliseconds). Must clarify unit conversion: `set(environment, flags, 300000)` (300000ms = 5min) OR update interface to accept seconds. Check WISH-2009 implementation for current behavior. |
| 8 | Load testing AC missing success criteria details | Low | AC10 (lines 238-250) says "average response time < 50ms" but this conflicts with AC success criteria (line 61) stating "P95 < 100ms for cache hits". Should align: Load test expects P95 < 100ms (not average < 50ms) to match production success criteria. |

## Split Recommendation

**NOT RECOMMENDED** - While 16 ACs exceeds typical threshold, this is infrastructure story with legitimate operational complexity. However, IF Issue #1 (interface incompatibility) proves complex to resolve, consider split:

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| WISH-2124-A | Cache Interface Refactoring | Refactor FeatureFlagCache to support both in-memory and Redis backends | None (modifies WISH-2009) |
| WISH-2124-B | Redis Infrastructure | AC1-16 (all current ACs) | Depends on WISH-2124-A |

**Current recommendation: Resolve interface compatibility in-place rather than splitting.**

## Preliminary Verdict

**FAIL** - MVP-critical interface incompatibility blocks implementation

**Reasoning:**
- **Issue #1 is MVP-critical**: Story cannot proceed without resolving cache interface mismatch between proposed `CacheAdapter` and existing `FeatureFlagCache` port from WISH-2009
- **Issues #2-3 are high severity**: Missing directory and cache key pattern ambiguities will cause implementation confusion
- **Issues #4-8 are clarifications**: Important for implementation guidance but not blockers

**Required Fixes Before Implementation:**
1. **CRITICAL**: Rewrite AC2 and Architecture Notes to implement `RedisCacheAdapter` conforming to `FeatureFlagCache` interface (environment-scoped, not key-value)
2. **HIGH**: Specify Redis data structure choice (single hash per environment vs individual keys)
3. **HIGH**: Clarify core/ directory creation or alternate Redis client location
4. **MEDIUM**: Document DI wiring location and service factory signature update
5. **MEDIUM**: Clarify service layer integration with existing factory pattern

**Once fixed, story will be CONDITIONAL PASS pending verification of interface compatibility.**

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Cache interface incompatibility | Core Redis migration cannot integrate with WISH-2009 service layer | Update all AC2, AC14, Architecture Notes (lines 350-413) to show `RedisCacheAdapter` implementing `FeatureFlagCache` port from `domains/config/ports/index.ts`. Example implementation must show: `get(environment: string): Promise<CachedFeatureFlags \| null>` retrieving Redis hash with all flags for environment, `set(environment: string, flags: FeatureFlag[], ttlMs: number)` storing entire flag map, `getFlag(environment, flagKey)` using Redis HGET for single flag retrieval. Must preserve environment-scoped caching model from WISH-2009. |
| 2 | Redis data structure undefined | Cache invalidation and retrieval patterns blocked | Add new AC (suggest AC17): "Redis stores feature flags in hash structure `feature_flags:{environment}` with HSET per flag. TTL applies to entire hash (atomic environment cache). Commands: HSET feature_flags:production {flagKey} {JSON.stringify(flag)}, HGETALL feature_flags:production, DEL feature_flags:production. Preserves WISH-2009's atomic environment cache semantics while enabling distributed caching." Alternative: Store flags as individual keys but this breaks FeatureFlagCache.get(environment) expecting single cache hit for all flags. |

---

## Worker Token Summary

- Input: ~12,000 tokens (WISH-2124.md 663 lines + agent instructions 246 lines + stories.index.md + api-layer.md 275 lines + codebase inspection: cache.ts, ports/index.ts, services.ts)
- Output: ~2,400 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~14,400 tokens
