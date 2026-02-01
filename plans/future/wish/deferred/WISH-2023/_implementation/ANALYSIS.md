# Elaboration Analysis - WISH-2023

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope **exceeds** stories.index.md definition - includes full backend endpoint and CloudWatch integration not mentioned in index |
| 2 | Internal Consistency | FAIL | High | Goals contradict Non-goals; Non-goals contradict Scope; AC10 documentation task not in scope definition |
| 3 | Reuse-First | PASS | — | Correctly reuses existing logger, Zod schemas, error handling patterns |
| 4 | Ports & Adapters | FAIL | Critical | Story plans endpoint `POST /api/observability/compression-failures` but does NOT specify service layer per api-layer.md architecture requirement |
| 5 | Local Testability | PASS | — | `.http` tests specified (AC12); Frontend unit tests specified (AC11) |
| 6 | Decision Completeness | PASS | — | All Open Questions resolved with decisions and rationale |
| 7 | Risk Disclosure | PASS | — | CloudWatch costs, latency impact, payload size risks all disclosed with mitigations |
| 8 | Story Sizing | PASS | — | 12 ACs with clear scope: frontend telemetry util + backend endpoint + CloudWatch integration. Properly sized at 2 points |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Scope mismatch with stories.index.md** | Critical | Stories.index.md describes "CloudWatch metrics + error logging" with no mention of backend endpoint. Story AC2 adds full REST endpoint `POST /api/observability/compression-failures`. Either update stories.index.md to include endpoint scope OR remove backend endpoint from story (frontend-only telemetry via existing logging infrastructure) |
| 2 | **Missing service layer architecture** | Critical | Story violates api-layer.md rule: "NEVER create a route without a corresponding service". Scope section specifies `domains/observability/routes.ts` but does NOT specify `services/observability/index.ts`. Must add service layer: `apps/api/lego-api/services/observability/index.ts` with pure business logic functions |
| 3 | **Goals contradict Non-goals** | High | Goal says "Track compression failures via CloudWatch metrics" but Non-goals says "Not implementing compression success rate tracking". These are not contradictory but poorly worded. Success rate requires tracking attempts + failures. Failure-only tracking is correctly scoped. Clarify goal wording |
| 4 | **Non-goals contradict Scope (AC10)** | High | Non-goals says "Not implementing historical trend analysis dashboard (CloudWatch Logs Insights sufficient)" but AC10 requires "Document CloudWatch Logs Insights queries". This is not contradictory - AC10 is documentation, not dashboard implementation. But wording creates confusion. Clarify Non-goals to explicitly allow query documentation |
| 5 | **AC10 not reflected in Scope section** | Medium | Scope section does NOT mention `docs/observability/compression-failures.md` documentation file. AC10 requires this deliverable. Add to Scope: "Documentation file for CloudWatch query examples" |
| 6 | **Missing error timeout threshold** | Medium | AC6 mentions "Compression takes > 10 seconds (WISH-2022 timeout threshold)" but WISH-2022 compression implementation (imageCompression.ts) shows NO timeout logic. This is an assumption not validated against actual implementation. Either verify timeout exists in WISH-2022 or remove timeout-based error classification |
| 7 | **Frontend error type classification incomplete** | Medium | AC6 specifies error types (Timeout, OutOfMemory, etc.) but frontend compressImage() function (imageCompression.ts:170-182) only catches generic Error with message. No structured error type from browser-image-compression library. Error classification logic will require heuristics (message parsing) which is fragile. Add note in Risks section |
| 8 | **Privacy concern - User-Agent logging** | Low | AC9 says "Do NOT log user ID" but AC5 and AC7 require logging User-Agent string. User-Agent can contain PII in rare cases (custom browsers with user info). While generally safe, add note in Privacy AC that User-Agent is minimal technical metadata compliant with standard logging practices |
| 9 | **CloudWatch Logs log group inconsistency** | Low | AC7 says "Log to existing log group: `/aws/lambda/wishlist-api`" but lego-api Lambda function may use different log group naming. Verify actual Lambda function name and log group during implementation |
| 10 | **Fire-and-forget telemetry not architected** | Medium | AC8 requires "fire-and-forget" telemetry with 2-second timeout but provides no implementation guidance. Frontend should use `navigator.sendBeacon()` for fire-and-forget OR async fetch with timeout and error suppression. Add to Test Plan or Technical Decisions |

## Split Recommendation

**Not Required** - Story is properly sized at 2 points with 12 ACs focused on single feature (compression failure telemetry).

## Preliminary Verdict

**Verdict**: FAIL

**Rationale:**
1. **Critical**: Scope mismatch between stories.index.md and elaborated story (backend endpoint added)
2. **Critical**: Missing service layer architecture violates api-layer.md mandatory pattern
3. **High**: Multiple internal consistency issues between Goals/Non-goals/Scope/ACs

**Required Actions Before Implementation:**
1. Update stories.index.md to include backend endpoint scope OR remove backend endpoint (frontend-only telemetry)
2. Add service layer to architecture: `apps/api/lego-api/services/observability/index.ts`
3. Resolve Goals/Non-goals wording conflicts
4. Add documentation deliverable to Scope section
5. Verify WISH-2022 timeout threshold or remove from error classification
6. Add technical decision for fire-and-forget implementation approach

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | **No service layer specified** | Backend implementation cannot follow hexagonal architecture | Add `apps/api/lego-api/services/observability/index.ts` to Scope with functions: `logCompressionFailure(payload)` → publishes to CloudWatch. Route handler must be thin adapter calling service |
| 2 | **No Zod schema definition for telemetry payload** | Backend validation cannot be implemented | Add to Scope: `CompressionFailurePayloadSchema` in `apps/api/lego-api/services/observability/__types__/index.ts` with fields from AC7 (timestamp, format, originalSize, browser, errorType, errorMessage, userAgent, compressionSettings) |
| 3 | **No CloudWatch SDK integration point** | Cannot publish metrics/logs without CloudWatch client | Add to Scope or Reuse Plan: AWS SDK v3 CloudWatch Logs client and CloudWatch Metrics client. Either reuse existing CloudWatch integration from backend OR add new `core/observability/cloudwatch.ts` adapter |
| 4 | **No telemetry endpoint error handling specification** | AC2 only specifies happy path (204) and validation (400) | Add AC or Test Plan coverage for: CloudWatch publish failure (should return 500 or 503), malformed JSON (should return 400), authentication (endpoint should be public or require auth?) |
| 5 | **Authentication not specified for telemetry endpoint** | Security vulnerability - public endpoint allows telemetry spam | Add to Scope or Decisions: Is endpoint public (allows anonymous telemetry) or requires authentication? If public, add rate limiting to Non-MVP risks. If authenticated, specify auth mechanism |

---

## Worker Token Summary

- Input: ~8,500 tokens (WISH-2023.md + stories.index.md + api-layer.md + imageCompression.ts + useS3Upload.ts + logger types + elab-analyst.agent.md)
- Output: ~1,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
