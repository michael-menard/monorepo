# ELAB-STORY-015: MOC Instructions - Initialization & Finalization

**Elaboration Date:** 2026-01-21
**Story:** STORY-015
**Verdict:** CONDITIONAL PASS

---

## Executive Summary

STORY-015 is a well-structured story for migrating the MOC Instructions Initialize and Finalize endpoints to Vercel. The scope aligns with the stories index, the architecture follows ports & adapters principles, and the reuse plan leverages existing shared packages appropriately. However, there are several issues that require attention before implementation can proceed safely.

---

## Audit Checklist Results

### 1. Scope Alignment

| Check | Status | Notes |
|-------|--------|-------|
| Endpoints match index | PASS | Index specifies `initialize-with-files` and `finalize-with-files`; story covers both |
| No extra endpoints | PASS | Story does not introduce additional endpoints |
| No extra infrastructure | PASS | No new infra beyond what's in scope |
| No extra features | PASS | Features match AWS Lambda implementation |

**Result:** PASS

---

### 2. Internal Consistency

| Check | Status | Notes |
|-------|--------|-------|
| Goals vs Non-goals | PASS | OpenSearch explicitly deferred in Non-goals; story correctly excludes it from core function |
| Decisions vs Non-goals | PASS | No contradictions found |
| AC matches Scope | PASS | All 29 ACs map to the two endpoints and core package |
| Local Testing Plan matches AC | PASS | HTTP tests cover all AC scenarios |

**Issue Found:**

- **ISSUE-1 (Medium):** AC-27 requires ">80% coverage" for unit tests, but no specific metric enforcement mechanism is documented. The existing `vitest.config.ts` in `moc-instructions-core` does not show coverage thresholds.

**Result:** CONDITIONAL PASS (pending ISSUE-1 clarification)

---

### 3. Reuse-First Enforcement

| Check | Status | Notes |
|-------|--------|-------|
| Shared packages reused | PASS | Story correctly identifies `@repo/logger`, `@repo/lambda-responses`, `@repo/upload-config`, `@repo/rate-limit`, `@repo/file-validator`, `@repo/db` |
| No per-story utilities | PASS | Parts validation is to be inlined or extracted to shared package if needed |
| New packages justified | PASS | No new shared packages required |

**Issues Found:**

- **ISSUE-2 (Medium):** The Reuse Plan references `@repo/upload-config` but this package exists at `packages/tools/upload-config` (tools namespace, not backend). Per `vercel.migration.plan.meta.md` package boundary rules: "`packages/tools/*` is for CLIs/scripts only and must not be required at runtime." If `upload-config` is used at runtime in Vercel functions, it may violate this rule.

- **ISSUE-3 (Low):** The Reuse Plan references `@repo/rate-limit` which exists at `packages/tools/rate-limit`. Same concern as ISSUE-2 regarding runtime usage in tools namespace.

**Result:** CONDITIONAL PASS (pending ISSUE-2, ISSUE-3 clarification)

---

### 4. Ports & Adapters Compliance

| Check | Status | Notes |
|-------|--------|-------|
| Core logic transport-agnostic | PASS | Story explicitly defines `InitializeWithFilesDeps` interface with injected dependencies |
| Adapters explicitly identified | PASS | Vercel handlers at `apps/api/platforms/vercel/api/mocs/` are clearly adapters |
| Platform-specific logic isolated | PASS | S3 operations injected via `generatePresignedUrl` function |

**Result:** PASS

---

### 5. Local Testability

| Check | Status | Notes |
|-------|--------|-------|
| Backend `.http` tests defined | PASS | Story provides detailed `.http` test requests |
| Tests are executable | PASS | Tests use `{{baseUrl}}` variable pattern consistent with project |
| Seed data documented | PASS | Deterministic UUIDs and upsert pattern specified |

**Issues Found:**

- **ISSUE-4 (High):** The `.http` test `#finalizeMocSuccess` uses `{{mocId}}` and `{{fileId1}}/{{fileId2}}` variables, but there's no documented mechanism for capturing these values from `#initializeMocSingleFile` or `#initializeMocMultipleFiles` responses. The test plan requires chained execution but doesn't specify how to chain.

- **ISSUE-5 (Medium):** HP-4 (`#finalizeMocIdempotent`) and HP-5/HP-6 are listed in the Test Plan but not included in the HTTP Contract Plan's "Required `.http` Requests" section. These tests need to be added or explicitly excluded.

**Result:** CONDITIONAL PASS (pending ISSUE-4, ISSUE-5 fixes)

---

### 6. Decision Completeness

| Check | Status | Notes |
|-------|--------|-------|
| No blocking TBDs | PASS | No TBDs found in story |
| Open Questions resolved | PASS | No Open Questions section with unresolved items |

**Result:** PASS

---

### 7. Risk Disclosure

| Check | Status | Notes |
|-------|--------|-------|
| Auth risks disclosed | PASS | AUTH_BYPASS documented for local dev |
| DB risks disclosed | PASS | Transaction handling mentioned |
| Upload risks disclosed | PASS | Presigned URL flow documented |
| S3 coordination risks | PASS | Two-phase lock pattern documented |
| OpenSearch deferral | PASS | Explicitly in Non-goals |

**Issues Found:**

- **ISSUE-6 (Medium):** The finalize endpoint in AWS Lambda imports `@/core/search/opensearch` for indexing (line 415 of finalize handler). The story's Non-goals state OpenSearch is deferred, but there's no explicit handling for this in the Vercel migration. Story should clarify whether finalize will skip indexing or stub it.

- **ISSUE-7 (Low):** Environment variable `MOC_BUCKET` is specified but the AWS Lambda uses `LEGO_API_BUCKET_NAME`. Story should confirm which variable name will be used in Vercel or document the mapping.

**Result:** CONDITIONAL PASS (pending ISSUE-6 clarification)

---

## Issues Summary

| ID | Severity | Description | Required Fix |
|----|----------|-------------|--------------|
| ISSUE-1 | Medium | AC-27 coverage threshold not enforceable | Clarify: either remove ">80%" requirement or add coverage config |
| ISSUE-2 | Medium | `@repo/upload-config` in tools namespace | Clarify: confirm runtime usage is acceptable or move package |
| ISSUE-3 | Low | `@repo/rate-limit` in tools namespace | Same as ISSUE-2 |
| ISSUE-4 | High | Chained `.http` tests missing variable capture | Add intermediate test setup or manual steps for variable extraction |
| ISSUE-5 | Medium | Missing `.http` tests for HP-4/5/6 | Add missing tests to HTTP Contract Plan |
| ISSUE-6 | Medium | OpenSearch indexing not addressed in migration | Add explicit decision: skip, stub, or handle |
| ISSUE-7 | Low | Env var naming inconsistency (MOC_BUCKET vs LEGO_API_BUCKET_NAME) | Document canonical name for Vercel |

---

## Required Fixes (Critical/High)

### ISSUE-4 (High): HTTP Test Variable Chaining

The HTTP Contract Plan must include instructions for how QA should chain the initialize → finalize flow:

**Suggested Fix:**
Add a note to the HTTP Contract Plan:
```
### Test Execution Order

1. Execute `#initializeMocSingleFile` or `#initializeMocMultipleFiles`
2. Copy `mocId` from response `data.mocId`
3. Copy `fileId` values from response `data.uploadUrls[].fileId`
4. Set these as HTTP client variables for subsequent requests
5. Execute `#finalizeMocSuccess` with the captured values
```

---

## Acceptable As-Is

The following are acceptable and require no changes:
- Endpoint routes and methods
- Core package architecture (`initializeWithFiles`, `finalizeWithFiles`)
- Seed data structure and deterministic UUIDs
- Dependency injection pattern for S3 operations
- Error code mapping (400, 401, 403, 404, 409, 422, 429)
- Two-phase lock pattern for idempotent finalization

---

## Verdict

**CONDITIONAL PASS**

STORY-015 may proceed to implementation **once the following are addressed**:

1. **ISSUE-4 (High):** Add HTTP test execution order documentation for variable chaining
2. **ISSUE-6 (Medium):** Add explicit handling for OpenSearch indexing in Non-goals or Architecture Notes

The remaining Medium/Low issues (ISSUE-1, ISSUE-2, ISSUE-3, ISSUE-5, ISSUE-7) are acceptable for Dev to address during implementation but should be tracked.

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | QA-Elab | Story Elaboration/Audit completed for STORY-015 |
