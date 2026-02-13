# Elaboration Analysis - INST-1107

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | **PASS** | — | Scope matches stories.index.md exactly: single file download via presigned URL. No scope creep detected. |
| 2 | Internal Consistency | **PASS** | — | Goals, Non-goals, Decisions, and ACs are consistent. AC allocation aligns with scope. Local test plan matches ACs. |
| 3 | Reuse-First | **PASS** | — | Excellent reuse plan: S3 presigned URL pattern from inspiration domain, RTK Query framework, Button primitive, MOC service authorization pattern. Estimated 80% code reuse. |
| 4 | Ports & Adapters | **FAIL** | **Critical** | **DEFECT**: Story plans to add download endpoint in routes.ts without specifying service layer method. Per api-layer.md, business logic MUST be in `application/services.ts`, not routes. Route handler must call `mocService.getFileDownloadUrl(userId, mocId, fileId)`. |
| 5 | Local Testability | **PASS** | — | Comprehensive test plan with .http requests, unit tests, integration tests, and E2E tests. Test tooling well-defined. |
| 6 | Decision Completeness | **PASS** | — | All critical decisions made: 15-min expiry, RFC 5987 encoding, 404 for unauthorized (not 403), no caching. No blocking TBDs. |
| 7 | Risk Disclosure | **PASS** | — | Risks explicitly disclosed: S3 IAM permissions, filename encoding edge cases, presigned URL expiry, CORS configuration. Mitigation strategies documented. |
| 8 | Story Sizing | **PASS** | — | Story sized at 3 points (2-3 days). 72 ACs is high but scope is well-defined and pattern-based. No split indicators: 4 files touched, 1 endpoint, backend-focused with simple frontend component. Within acceptable range. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Missing Service Layer Specification** | **Critical** | Add service layer method `getFileDownloadUrl` to `apps/api/lego-api/domains/mocs/application/services.ts` per api-layer.md. Route handler must call service, not contain business logic. |
| 2 | **Route Handler Scope Ambiguity** | High | AC-1 says "endpoint exists in routes.ts" but doesn't specify that it must be a thin adapter calling service layer. Update AC-1 to clarify: "Endpoint delegates to mocService.getFileDownloadUrl()". |
| 3 | **Service Method Not in Scope Section** | Medium | Scope section lists "Files to Modify" for routes.ts and types.ts but omits `application/services.ts`. Add service file to scope with clear method signature. |
| 4 | **Authorization Pattern Incomplete** | Medium | Story mentions "MOC service authorization pattern" but doesn't specify WHERE the ownership check happens. Should be explicit: service layer verifies `moc.userId === userId` before generating URL. |

## Split Recommendation

**Not Applicable** - Story does not require splitting.

## Preliminary Verdict

**CONDITIONAL PASS** - One critical issue blocks implementation: missing service layer specification violates Ports & Adapters architecture. Story can proceed to implementation once service layer method is added to scope and ACs.

**Required Changes:**
1. Add service method to Scope section: `apps/api/lego-api/domains/mocs/application/services.ts` - Add `getFileDownloadUrl` method
2. Update AC-1 to clarify thin route handler: "Route delegates to mocService.getFileDownloadUrl(userId, mocId, fileId)"
3. Add new AC (AC-73): "Service method `getFileDownloadUrl` exists in MocService with signature: `async getFileDownloadUrl(userId: string, mocId: string, fileId: string): Promise<Result<{downloadUrl: string, expiresAt: string}, ErrorCode>>`"
4. Add new AC (AC-74): "Service layer performs ownership check: queries file → verifies file.mocId belongs to user's MOC → returns 'NOT_FOUND' error if unauthorized"

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Service layer method not specified | Implementation phase - developers will add business logic to routes.ts (architecture violation) | Add service method to scope with clear signature and ownership verification logic |
| 2 | Unclear where authorization happens | Security implementation - ownership check might be skipped or placed in wrong layer | Specify that service layer performs JOIN query: `moc_files.mocId = mocs.id AND mocs.userId = ?` |

**Resolution:**
- Gap #1 and #2 are related: Both resolved by adding service layer specification per api-layer.md
- Service method must handle: (1) query file by fileId, (2) verify ownership via JOIN or separate query, (3) generate presigned S3 URL, (4) return result or error
- Route handler becomes thin: parse params → call service → map errors to HTTP status codes

**No other MVP-critical gaps detected.** Core journey is complete once service layer added.

---

## Worker Token Summary

- Input: ~68,000 tokens (story file, _pm/ artifacts, stories.index.md, api-layer.md, codebase patterns)
- Output: ~3,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
