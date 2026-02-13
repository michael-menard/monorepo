# Elaboration Analysis - REPA-004

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index exactly: extract image processing from wishlist to @repo/upload |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, and Test Plan are all consistent |
| 3 | Reuse-First | PASS | — | Story explicitly reuses @repo/upload-client and @repo/logger; creates shared package per monorepo rules |
| 4 | Ports & Adapters | PASS | — | No API endpoints involved; pure refactor story |
| 5 | Local Testability | PASS | — | Vitest unit tests (80%+ coverage) + Playwright E2E tests specified |
| 6 | Decision Completeness | PASS | — | All design decisions documented; no blocking TBDs |
| 7 | Risk Disclosure | PASS | — | Risks disclosed: dependency versions, type safety, progress callbacks, presigned URL schema |
| 8 | Story Sizing | CONDITIONAL | Medium | 7 ACs, 2 packages touched, 450+ LOC extraction - at upper boundary but acceptable for refactor |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Package @repo/upload does not exist yet | Critical | Story depends on REPA-001 (Create @repo/upload Package Structure) - verify REPA-001 completed first |
| 2 | No existing tests for useS3Upload hook | High | Story claims "existing wishlist tests" but useS3Upload.ts has no __tests__ directory - must create tests alongside migration |
| 3 | Story assumes exact dependency versions | Medium | AC-7 mentions exact versions (browser-image-compression v2.0.2, heic2any v0.0.4) but doesn't verify these exist in wishlist package.json |
| 4 | @repo/logger import not verified | Low | Story uses @repo/logger but doesn't confirm it's already used in imageCompression.ts (currently uses console.log) |

## Split Recommendation (if applicable)

N/A - Story is appropriately sized for a refactor. 7 ACs are all tightly coupled (extraction + migration must happen together).

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Conditions**:
1. REPA-001 MUST be completed before starting REPA-004 (blocks: package structure)
2. Add AC-8 for creating useUpload hook tests (currently missing)
3. Verify exact dependency versions in wishlist package.json match story assumptions
4. Update imageCompression.ts to use @repo/logger before extraction (or do it during extraction)

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Missing useUpload hook tests | Core validation of generalized hook behavior | Add test AC: "Create useUpload.test.tsx with React Testing Library covering upload orchestration, error states, and retry logic" |
| 2 | Dependency on REPA-001 | Cannot start without package structure | Enforce in stories.index.md: REPA-004 depends_on REPA-001 (already documented but critical to verify) |
| 3 | No verification of presigned URL schema compatibility | Risk of runtime errors if schema assumptions wrong | Add AC for verifying PresignedUrlResponse schema matches RTK Query mutation output (or update mutation to match) |

---

## Worker Token Summary

- Input: ~48,000 tokens (story file, index, plans, source files, tests, api-layer.md)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
