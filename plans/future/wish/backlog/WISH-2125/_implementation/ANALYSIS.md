# Elaboration Analysis - WISH-2125

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story introduces infrastructure not mentioned in stories.index entry. Creates new core/ directories but lego-api uses domains/ pattern. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, Decisions, and AC are internally consistent |
| 3 | Reuse-First | PASS | — | Extends existing @repo/logger, reuses auth middleware, shares IP extraction utility |
| 4 | Ports & Adapters | FAIL | Critical | Story plans `apps/api/lego-api/core/` directories but codebase uses `domains/` hexagonal pattern. No service layer specified. |
| 5 | Local Testability | PASS | — | Integration tests in __http__ file specified, unit tests planned |
| 6 | Decision Completeness | PASS | — | No blocking TBDs, Open Questions section is empty |
| 7 | Risk Disclosure | PASS | — | MaxMind database, Lambda memory, IP extraction, false positives all documented |
| 8 | Story Sizing | PASS | — | 12 ACs, single backend concern (logging), no frontend - appropriately sized |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Architecture Mismatch**: Story references `apps/api/lego-api/core/observability/logger.ts`, `core/geolocation/`, and `core/utils/` but lego-api uses `domains/` hexagonal architecture (see docs/architecture/api-layer.md). The `core/` directory doesn't exist in lego-api. | Critical | Align with hexagonal architecture: create geolocation service in `domains/observability/` or `domains/common/`, IP extraction in shared utilities, and extend existing @repo/logger package instead of creating lego-api-specific logger. |
| 2 | **Missing Service Layer**: Story violates Ports & Adapters rule #1 from api-layer.md: "NEVER create a route without a corresponding service." AC 3 mentions enriching logs but doesn't specify service layer for geolocation lookup logic. | Critical | Add AC specifying geolocation service file location (e.g., `domains/observability/application/geolocation-service.ts`) with pure business logic, separate from infrastructure adapters. |
| 3 | **Documentation File Doesn't Exist**: AC 10 references updating `packages/backend/database-schema/docs/wishlist-authorization-policy.md` but this file doesn't exist. Only `WISHLIST-SCHEMA-EVOLUTION.md` exists in that directory. | High | Clarify documentation location: either create the policy doc first (dependency on WISH-2008?) or update the existing schema evolution doc with IP/geolocation section. |
| 4 | **Scope Not in Index**: stories.index.md entry for WISH-2125 mentions "IP extraction from request headers" and "MaxMind GeoLite2 geolocation lookup" but doesn't mention creating new `core/geolocation/` or `core/utils/` packages. | Medium | Update stories.index.md to explicitly list new packages/directories being created, OR reduce scope to only extend existing packages. |
| 5 | **Lambda Layer Deployment Missing**: AC 6 requires "Layer deployment script includes database download and bundling steps" but story doesn't specify where this script lives or how it integrates with existing deployment infrastructure. | Medium | Add AC specifying layer deployment script location (e.g., `apps/api/lego-api/layers/geolite2-layer/build.sh`) and reference existing layer infrastructure if any. |
| 6 | **Logger Extension vs Creation Ambiguity**: Story says "Reuse @repo/logger" but AC 3 mentions changes to `apps/api/lego-api/core/observability/logger.ts` (~10 lines). Unclear if extending shared logger or creating new lego-api-specific logger. | Medium | Clarify: should extend @repo/logger types/interfaces for IP/geolocation fields, not create new logger file in lego-api. Add IP/geolocation fields to LogEntry metadata in @repo/logger package. |

## Split Recommendation

**Not Applicable** - Story is appropriately sized (12 ACs, backend-only, single concern).

## Preliminary Verdict

**Verdict**: FAIL

**Blocking Issues:**
1. **Critical Architecture Violation**: Story assumes `apps/api/lego-api/core/` directory structure that doesn't exist. Codebase uses `domains/` hexagonal architecture per docs/architecture/api-layer.md.
2. **Missing Service Layer**: No service file specified for geolocation lookup business logic, violating Ports & Adapters compliance.
3. **Documentation Dependency Unclear**: References non-existent documentation file, unclear if WISH-2008 should have created it.

**Required Actions Before Implementation:**
1. **Align with Hexagonal Architecture**: Move geolocation service to `domains/observability/application/` or `domains/common/application/`, create adapters for MaxMind lookup in `domains/*/adapters/`.
2. **Add Service Layer AC**: Specify service file for geolocation logic (pure functions, no HTTP knowledge).
3. **Clarify Documentation**: Either add WISH-2008 dependency to create policy doc first, or pivot to extending existing WISHLIST-SCHEMA-EVOLUTION.md.
4. **Extend @repo/logger**: Add IP/geolocation fields to shared logger package, not create lego-api-specific logger.
5. **Update stories.index.md**: List all new packages/directories being created.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | **Architecture alignment** | Implementation cannot proceed without knowing where to place geolocation service code | Update story to specify service location in `domains/` structure per api-layer.md architecture |
| 2 | **Service layer specification** | Violates Ports & Adapters pattern - business logic location unclear | Add AC specifying geolocation service file with pure functions (no HTTP types) |
| 3 | **Documentation file dependency** | AC 10 cannot be completed if policy doc doesn't exist | Clarify if WISH-2008 should have created this doc, or pivot to existing doc |

---

## Worker Token Summary

- Input: ~27k tokens (WISH-2125.md + stories.index.md + api-layer.md + auth.ts + logger package)
- Output: ~2k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
