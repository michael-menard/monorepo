# Elaboration Analysis - WISH-2013

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Security hardening for file uploads, virus scanning, S3 configuration as documented. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and AC align. All security features properly scoped. No contradictions. |
| 3 | Reuse-First | PASS | — | Properly extends WISH-2011 MSW fixtures and WISH-2002 presign flow. Reuses @repo/api-core, @repo/logger. |
| 4 | Ports & Adapters | PASS | — | Virus scanner port defined. Storage adapter enhances existing WishlistImageStorage. All business logic in service layer. |
| 5 | Local Testability | PASS | — | MSW-based integration tests reuse WISH-2011 infrastructure. Test fixtures include malicious files. No live S3 dependency. |
| 6 | Decision Completeness | PASS | — | ClamAV Lambda layer selected for MVP. 15-minute TTL, 10MB limit, HTTPS-only all specified. No blocking TBDs. |
| 7 | Risk Disclosure | PASS | — | 5 risks identified with mitigations: cold start time, upload latency, false positives, S3 policy misconfiguration, CORS errors. |
| 8 | Story Sizing | PASS | — | 17 ACs, single domain (wishlist), test-focused. Complexity: Medium. Effort: 2-3 points. Appropriate sizing. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | File size validation missing in storage adapter | High | Add file size check to `generateUploadUrl()` before generating presigned URL (AC3) |
| 2 | Current storage adapter already implements MIME type/extension validation | Low | AC1/AC2 partially implemented. Enhance error messages and audit logging. |
| 3 | Missing `@repo/api-core` virus scanning utilities | Medium | Verify `@repo/api-core` exports or create new adapter in `apps/api/lego-api/core/security/` |
| 4 | Documentation references old `services/{domain}/` pattern | Low | Story uses correct `lego-api/domains/` pattern. No fix needed - architecture docs updated in WISH-2029. |

## Split Recommendation

**Not Applicable** - Story is appropriately sized with clear boundaries.

## Preliminary Verdict

**CONDITIONAL PASS** - Proceed with fixes for Issues #1 and #3

**Rationale:**
- Story is well-structured with clear security requirements
- Hexagonal architecture properly maintained with ports/adapters
- MSW test infrastructure from WISH-2011 provides excellent foundation
- File size validation missing from current implementation (Issue #1) must be added
- Virus scanning adapter needs implementation details verified (Issue #3)
- Overall scope is appropriate for 2-3 point story

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | File size validation not enforced server-side | AC3 - Oversized file rejection | Add `fileSize` parameter to presign route query, validate against MAX_FILE_SIZE in storage adapter |
| 2 | Virus scanner port implementation not specified | AC5 - Post-upload virus scanning | Define async virus scanning integration point: S3 event trigger or API callback after upload |
| 3 | Security audit logging not implemented | AC16 - Security event tracking | Add @repo/logger calls for validation failures, virus detections, S3 policy denials |

**Explanation of MVP-Critical Status:**

1. **File Size Validation (Gap #1):** Without server-side file size validation, users could upload 100MB+ files by bypassing client-side checks, leading to excessive S3 costs and potential abuse. Blocks AC3 and production readiness.

2. **Virus Scanner Implementation (Gap #2):** The story defines a `VirusScanner` port but doesn't specify the integration mechanism. Need to clarify: S3 event trigger Lambda vs. synchronous call vs. async queue. Blocks AC5 implementation and security requirement.

3. **Security Audit Logging (Gap #3):** AC16 requires structured logging for security events but no implementation details provided. Need to specify log fields, CloudWatch integration, and log format. Required for security compliance and incident response.

---

## Worker Token Summary

- Input: ~18,500 tokens (WISH-2013.md + WISH-2011.md + api-layer.md + wishlist domain files + stories.index.md)
- Output: ~2,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
