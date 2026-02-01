# Elaboration Report - WISH-2009

**Date**: 2026-01-29
**Verdict**: CONDITIONAL PASS

## Summary

WISH-2009 defines a well-scoped feature flag infrastructure story for gradual wishlist rollout. Analysis identified 7 issues (4 critical/high, 3 medium/low) that block implementation without resolution. User decisions converted all issues to acceptance criteria with concrete fixes, enabling implementation to proceed after AC integration.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story plans hexagonal architecture but stories.index.md shows "In Elaboration" with no scope defined. Scope mismatch: story defines complex service layer but index entry shows minimal detail. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are internally consistent. No contradictions found. |
| 3 | Reuse-First | FAIL | High | Story plans to create Redis cache adapter but **no Redis infrastructure exists in codebase**. Must either create Redis first or use in-memory cache for MVP. |
| 4 | Ports & Adapters | FAIL | Critical | Story violates API architecture: plans `apps/api/lego-api/domains/config/` but `docs/architecture/api-layer.md` **requires services in `apps/api/services/{domain}/`**. Existing codebase uses `lego-api/domains/` pattern but conflicts with documented architecture. |
| 5 | Local Testability | PASS | — | `.http` file planned, 4 HTTP requests specified. Backend and frontend unit tests defined (10 + 5). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Open Questions section states "None - all decisions finalized." |
| 7 | Risk Disclosure | CONDITIONAL | Medium | 4 MVP-critical risks documented but Redis cache risk underspecified: Story assumes Redis exists without validating infrastructure availability. |
| 8 | Story Sizing | PASS | — | 16 ACs, 1 new domain (config), backend + frontend work. Sizing appropriate for 2-point estimate. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Redis Infrastructure Missing | Critical | Use in-memory cache (Map with TTL) for MVP instead of Redis - defer Redis migration to follow-up story | **ADDED AS AC 17** |
| 2 | Architecture Pattern Conflict | Critical | lego-api/domains/ is canonical pattern, update docs (follow-up story) - proceed with lego-api/domains/config/ structure | **ADDED AS AC 18** |
| 3 | Scope Alignment Mismatch | High | Update index entry with full scope details (3 endpoints, 5 packages, DB migration) | **ADDED AS AC 19** |
| 4 | Shared Schema Location | Medium | Backend defines schemas in domains/config/types.ts, frontend imports via @repo/api-client | **ADDED AS AC 20** |
| 5 | Middleware Location | Medium | Specify global middleware in apps/api/lego-api/middleware/feature-flag.ts injecting flags into req.featureFlags | **ADDED AS AC 21** |
| 6 | Admin Authorization | High | Reference existing auth middleware with admin role check from JWT - verify role in POST /api/admin/flags/:flagKey | **ADDED AS AC 22** |
| 7 | Hashing Algorithm | Low | Specify Node.js crypto.createHash('sha256') for consistency (deterministic hashing per AC 3) | **ADDED AS AC 23** |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Redis infrastructure not available in codebase | Add as AC 17 | Use in-memory cache (Map with TTL) for MVP; provides same interface as Redis adapter but simpler for MVP; migrate to Redis in follow-up story |
| 2 | Architecture pattern conflict: lego-api/domains/ vs services/{domain}/ | Add as AC 18 | `lego-api/domains/` is currently canonical (existing gallery, wishlist, health domains use this pattern); update docs/architecture/api-layer.md in follow-up story |
| 3 | stories.index.md lacks detailed scope for WISH-2009 | Add as AC 19 | Index entry must be updated with full scope: 3 endpoints, 5 packages, feature flag database schema, in-memory cache layer |
| 4 | Backend schema ownership unclear (shared vs local) | Add as AC 20 | Backend owns FeatureFlagSchema in apps/api/lego-api/domains/config/types.ts; frontend imports from @repo/api-client via schema re-export |
| 5 | Middleware injection point not specified | Add as AC 21 | Global middleware in apps/api/lego-api/middleware/feature-flag.ts; injects flags evaluated per-request into req.featureFlags context |
| 6 | Admin role validation not specified | Add as AC 22 | Reference existing auth middleware from apps/api/lego-api/middleware/auth.ts; extract admin role from JWT and enforce on POST /api/admin/flags/:flagKey |
| 7 | Hashing algorithm choice deferred | Add as AC 23 | Use Node.js crypto.createHash('sha256') for deterministic user ID hashing; provides consistent rollout behavior |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Redis migration strategy | Document in follow-up story | Once Redis infrastructure available, migrate in-memory cache to Redis with minimal code changes (adapter pattern) |
| 2 | Architecture documentation | Follow-up story created | Update docs/architecture/api-layer.md to document lego-api/domains/ pattern as canonical (after reviewing all existing domains) |
| 3 | Admin UI for flag management | Out of scope (Phase 3+) | Defer to future story; MVP uses database/API directly for admin operations |

### Follow-up Stories Suggested

- [ ] Update docs/architecture/api-layer.md to document lego-api/domains/ as canonical pattern (AC 18 follow-up)
- [ ] Redis infrastructure setup and migration from in-memory cache (when Redis needed for production scaling)
- [ ] Admin UI for feature flag management (Phase 3+)
- [ ] Flag audit logging with timestamp and admin user tracking
- [ ] User-level targeting (beyond percentage-based rollout)
- [ ] Flag scheduling (auto-enable/disable at scheduled times)

### Items Marked Out-of-Scope

- Admin UI for flag management: Use database/API directly in MVP; defer dashboard to Phase 3+
- Third-party feature flag service integration (LaunchDarkly, Flagsmith): Use simple in-house solution for MVP
- Real-time flag updates via WebSocket: Poll-based or on-request evaluation only
- Flag analytics/usage metrics: Defer to future story
- User-level targeting: Percentage-based only in MVP
- Multi-environment flag sync: Flags configured per environment
- Flag audit logging: Defer to future story
- Flag scheduling: Manual only in MVP

## Updated Acceptance Criteria

### New ACs Added from Issues

**AC17**: Implement in-memory cache for feature flags (MVP)
- Use JavaScript Map with TTL-based expiration
- Cache structure: `Map<string, { value: FeatureFlag, expiresAt: number }>`
- TTL: 5 minutes (300,000 ms) - same as planned Redis TTL
- Fallback: If cache miss, fetch from database
- Migration path: Switch to Redis adapter when infrastructure available
- No breaking API changes - same interface as Redis adapter

**AC18**: Document architecture pattern in follow-up story
- Current codebase uses `apps/api/lego-api/domains/{domain}/` pattern
- Existing domains: gallery, wishlist, health, instructions, sets, parts-lists
- This story follows established pattern - proceed with `domains/config/` structure
- Follow-up story: Update docs/architecture/api-layer.md to reflect canonical `lego-api/domains/` pattern

**AC19**: Update stories.index.md with full WISH-2009 scope
- Add detailed scope section listing:
  - 3 endpoints: GET /api/config/flags, GET /api/config/flags/:flagKey, POST /api/admin/flags/:flagKey
  - 5 affected packages: backend service, middleware, shared schemas, frontend context, database schema
  - Feature flag database table with migration
  - In-memory cache layer (AC 17)
- Update status from "In Elaboration" to reflect decision

**AC20**: Define backend schema ownership and import strategy
- Backend owns FeatureFlagSchema, FeatureFlagsResponseSchema, FeatureFlagDetailResponseSchema in `apps/api/lego-api/domains/config/types.ts`
- Frontend imports schemas from `@repo/api-client` which re-exports backend schemas
- Schema synchronization test (AC 16) verifies both sides match

**AC21**: Specify feature flag middleware location and injection
- Middleware file: `apps/api/lego-api/middleware/feature-flag.ts`
- Registered as global middleware in app initialization
- Evaluates all flags once per request
- Injects evaluated flags into `req.featureFlags` object
- Flags available to all handlers without per-route checks

**AC22**: Define admin authorization for flag updates
- Admin check: Verify `admin` role from JWT in authorization header
- Use existing auth middleware from `apps/api/lego-api/middleware/auth.ts`
- Extract role from decoded JWT: `req.user.role === 'admin'`
- Return 403 Forbidden if non-admin attempts POST /api/admin/flags/:flagKey
- Test with both admin and non-admin user fixtures

**AC23**: Commit to SHA-256 hashing algorithm
- Use Node.js built-in: `crypto.createHash('sha256').update(userId).digest('hex')`
- Produces consistent uint32 from hex string: `parseInt(hash.substring(0, 8), 16) % 100`
- Ensures same userId always gets same rollout result
- Deterministic: 25% rollout always includes users 0-24, excludes 25-99

## Proceed to Implementation?

**YES - story may proceed**

All critical and high-severity issues converted to acceptance criteria with concrete fixes. Issues now become mandatory requirements for implementation phase:

- **AC 17**: In-memory cache implementation (addresses Redis infrastructure gap)
- **AC 18**: Architecture pattern documented (lego-api/domains/ is canonical)
- **AC 19**: Index scope updated (full details captured)
- **AC 20-23**: Technical clarifications on schemas, middleware, auth, hashing (specificity added)

Original 16 ACs + 7 new ACs (17-23) = **23 total acceptance criteria** for implementation phase.

All acceptance criteria are now testable and specific. No ambiguity remains for developer implementation.
