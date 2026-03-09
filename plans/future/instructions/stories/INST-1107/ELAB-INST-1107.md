# Elaboration Report - INST-1107

**Date**: 2026-02-07
**Verdict**: CONDITIONAL PASS

## Summary

Download Files story is well-scoped with excellent architecture and comprehensive testing plan. One critical issue (missing service layer specification) has been resolved by adding four new acceptance criteria (AC-73 through AC-76) that explicitly define the service layer method and Ports & Adapters pattern. Story is now ready for implementation.

## Audit Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Scope Alignment | **PASS** | Scope matches stories.index.md exactly: single file download via presigned URL. No scope creep detected. |
| 2 | Internal Consistency | **PASS** | Goals, Non-goals, Decisions, and ACs are consistent. AC allocation aligns with scope. Local test plan matches ACs. |
| 3 | Reuse-First | **PASS** | Excellent reuse plan: S3 presigned URL pattern from inspiration domain, RTK Query framework, Button primitive, MOC service authorization pattern. Estimated 80% code reuse. |
| 4 | Ports & Adapters | **RESOLVED** | Critical defect identified: story planned to add business logic in routes.ts. Resolved by adding AC-73 through AC-76 specifying service layer method and thin adapter pattern. |
| 5 | Local Testability | **PASS** | Comprehensive test plan with .http requests, unit tests, integration tests, and E2E tests. Test tooling well-defined. |
| 6 | Decision Completeness | **PASS** | All critical decisions made: 15-min expiry, RFC 5987 encoding, 404 for unauthorized (not 403), no caching. No blocking TBDs. |
| 7 | Risk Disclosure | **PASS** | Risks explicitly disclosed: S3 IAM permissions, filename encoding edge cases, presigned URL expiry, CORS configuration. Mitigation strategies documented. |
| 8 | Story Sizing | **PASS** | Story sized at 3 points (2-3 days). 76 ACs (was 72 + 4 new) well-defined and pattern-based. No split indicators: 4 files touched, 1 endpoint, backend-focused with simple frontend component. Within acceptable range. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Missing Service Layer Specification | Critical | Add service layer method `getFileDownloadUrl` to `apps/api/lego-api/domains/mocs/application/services.ts` per api-layer.md. Route handler must call service, not contain business logic. | **RESOLVED** - AC-73, AC-74, AC-75, AC-76 added |
| 2 | Route Handler Scope Ambiguity | High | AC-1 says "endpoint exists in routes.ts" but doesn't specify that it must be a thin adapter calling service layer. Update AC-1 to clarify: "Endpoint delegates to mocService.getFileDownloadUrl()". | **RESOLVED** - AC-1 clarified |
| 3 | Service Method Not in Scope Section | Medium | Scope section lists "Files to Modify" for routes.ts and types.ts but omits `application/services.ts`. Add service file to scope with clear method signature. | **RESOLVED** - Scope updated with service method |
| 4 | Authorization Pattern Incomplete | Medium | Story mentions "MOC service authorization pattern" but doesn't specify WHERE the ownership check happens. Should be explicit: service layer verifies `moc.userId === userId` before generating URL. | **RESOLVED** - AC-74 specifies service-layer ownership verification |

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Service layer method not specified - developers might add business logic to routes.ts (architecture violation per api-layer.md) | Add as AC | MVP-critical: blocks implementation phase. Resolved by adding AC-73 (service method signature) and AC-76 (business logic placement). |
| 2 | Unclear where authorization happens - ownership check might be skipped or placed in wrong layer | Add as AC | MVP-critical: security implementation blocker. Resolved by adding AC-74 (service layer ownership verification) and AC-75 (thin route handler pattern). |
| 3 | Route handler scope ambiguity - AC-1 doesn't specify thin adapter pattern | Update AC-1 | Clarified AC-1 to explicitly state route handler delegates to service layer. |
| 4 | Service method not in Scope section - only routes.ts and types.ts listed | Update Scope | Added service layer method to Scope section with clear signature and responsibility description. |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Presigned URL Caching Consideration - no caching but could cache for 10 min | Deferred to KB | Low impact, medium effort. Document in future story INST-3082 (Analytics). |
| 2 | Download Analytics Missing - no metrics for downloads, failure rates | Deferred to KB | Low impact, low effort. Track in INST-3082 (Download History/Analytics). |
| 3 | Rate Limiting Not Specified - endpoint could be abused for DDoS | Deferred to KB | Medium impact, low effort. Add in Phase 2 (INST-1203: Rate Limiting & Observability). |
| 4 | CORS Edge Case - S3 CORS config not documented | Deferred to KB | Medium impact, low effort. Document in infrastructure notes or deployment checklist. |
| 5 | Content-Type Handling - ResponseContentType not set, browser may guess incorrectly | Deferred to KB | Low impact, low effort. Set based on file.mimeType in future enhancement. |
| 6 | Download Link Expiry Warning - no indication that URL expires in 15 min | Deferred to KB | Low impact, medium effort. Add countdown timer in INST-3081. |
| 7 | Copy Download Link Feature - share presigned URLs within org | Deferred to KB | Medium impact, low effort. Track as INST-3083. |
| 8 | QR Code for Mobile Downloads - scan on desktop, download on phone | Deferred to KB | Low impact, low effort. Track as INST-3084. |
| 9 | Batch Download (ZIP) - download all files button | Deferred to KB | High impact, high effort. Already tracked as INST-3080 (explicitly deferred in story). |
| 10 | Download Progress Tracking - custom progress UI for large files | Deferred to KB | Medium impact, medium effort. Track as INST-3081 (explicitly deferred in story). |
| 11 | File Preview Before Download - PDF thumbnails | Deferred to KB | Medium impact, high effort. Track as INST-3085. |
| 12 | Download Speed Optimization - CloudFront for global users | Deferred to KB | Low impact, medium effort. Track as INST-3086. |
| 13 | Download Notifications - email when large file ready | Deferred to KB | Low impact, low effort. Track as INST-3087. |
| 14 | File Integrity Check - verify with checksum | Deferred to KB | Low impact, medium effort. Track as INST-3088. |
| 15 | Download History Tracking - track downloads for auditing | Deferred to KB | Medium impact, low effort. Track as INST-3082. |
| 16 | Partial Downloads / Resume Support - range requests for large files | Deferred to KB | Low impact, medium effort. Track as INST-3089. |

### Follow-up Stories Suggested

(None in autonomous mode - requires PM judgment)

### Items Marked Out-of-Scope

(None in autonomous mode - all non-blocking items deferred to KB)

### KB Entries Created (Autonomous Mode Only)

Knowledge Base service was unavailable during elaboration. All 16 non-blocking findings have been deferred to DEFERRED-KB-WRITES.yaml for future logging when KB becomes available:
- Presigned URL caching considerations
- Download analytics and observability
- Rate limiting recommendations
- CORS and infrastructure edge cases
- Content-Type handling for file types
- User experience enhancements (expiry warnings, progress tracking, previews, etc.)
- Batch operations and advanced features
- File integrity and security considerations
- Performance optimizations (CDN, resume support)

## Proceed to Implementation?

**YES** - Story may proceed to implementation.

All MVP-critical gaps have been resolved by adding four new acceptance criteria that explicitly specify the service layer architecture and Ports & Adapters pattern. The story is ready for the development team to implement.

---

## Autonomous Elaboration Summary

**Mode**: autonomous (DECISIONS.yaml and analysis-based)

**ACs Added**: 4 (AC-73, AC-74, AC-75, AC-76) - Service layer specification

**ACs Updated**: 1 (AC-1 clarified for thin adapter pattern)

**Scope Updated**: Yes (added service layer method to Scope section)

**KB Entries Created**: 0 (KB unavailable - 16 items deferred)

**Audit Issues Resolved**: 1 (Ports & Adapters FAIL → RESOLVED)

**Verdict**: CONDITIONAL PASS

---

## New Acceptance Criteria Added

These criteria were added to resolve the Ports & Adapters architecture issue:

### AC-73: Service Method Exists
**Service method `getFileDownloadUrl` exists in MocService** (`apps/api/lego-api/domains/mocs/application/services.ts`) with signature: `async getFileDownloadUrl(userId: string, mocId: string, fileId: string): Promise<Result<{downloadUrl: string, expiresAt: string}, ErrorCode>>`

### AC-74: Service Layer Ownership Verification
**Service layer performs ownership verification**: queries file by fileId → verifies file.mocId belongs to MOC owned by userId → returns 'NOT_FOUND' error if unauthorized (no info leakage)

### AC-75: Thin Adapter Pattern
**Route handler in routes.ts is thin adapter**: parses params → calls mocService.getFileDownloadUrl() → maps service errors to HTTP status codes (per api-layer.md Ports & Adapters pattern)

### AC-76: Service Layer Business Logic
**Service layer handles all business logic**: file query, ownership check, presigned URL generation, error handling (route handler contains NO business logic)

---

## Next Steps

1. Developers implement story with 76 total acceptance criteria
2. Attach E2E tests for download happy paths
3. Verify IAM permissions for S3 GetObject in dev/staging
4. When KB available, import deferred findings from DEFERRED-KB-WRITES.yaml
5. Track follow-up stories (INST-3080 through INST-3089) in product roadmap
