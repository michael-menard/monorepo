# Elaboration Report - WISH-2023

**Date**: 2026-01-31
**Verdict**: FAIL

## Summary

Story WISH-2023 requires major revision due to critical infrastructure changes (AWS to Vercel deployment) and missing architecture components. The original CloudWatch-based telemetry approach is incompatible with Vercel hosting and must be replaced with stdout logging. Additionally, the backend endpoint requires proper service layer architecture and Zod schema validation per project standards.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope exceeds stories.index.md definition - includes full backend endpoint and CloudWatch integration not mentioned in index |
| 2 | Internal Consistency | FAIL | High | Goals contradict Non-goals; Non-goals contradict Scope; AC10 documentation task not in scope definition |
| 3 | Reuse-First | PASS | — | Correctly reuses existing logger, Zod schemas, error handling patterns |
| 4 | Ports & Adapters | FAIL | Critical | Story plans endpoint `POST /api/observability/compression-failures` but does NOT specify service layer per api-layer.md architecture requirement |
| 5 | Local Testability | PASS | — | `.http` tests specified (AC12); Frontend unit tests specified (AC11) |
| 6 | Decision Completeness | PASS | — | All Open Questions resolved with decisions and rationale |
| 7 | Risk Disclosure | PASS | — | CloudWatch costs, latency impact, payload size risks all disclosed with mitigations |
| 8 | Story Sizing | PASS | — | 12 ACs with clear scope: frontend telemetry util + backend endpoint + CloudWatch integration. Properly sized at 2 points |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | **Infrastructure Change: AWS CloudWatch → Vercel Stdout** | Critical | Remove all CloudWatch references. App now deploys to Vercel, not AWS. Replace CloudWatch Metrics and CloudWatch Logs with simple stdout logging (Vercel captures logs automatically). Backend endpoint should publish telemetry logs to stdout, not AWS services. | Pending PM Review |
| 2 | **Missing service layer architecture** | Critical | Story violates api-layer.md rule: "NEVER create a route without a corresponding service". Scope section specifies `domains/observability/routes.ts` but does NOT specify `services/observability/index.ts`. Must add service layer: `apps/api/lego-api/services/observability/index.ts` with pure business logic functions. | Pending PM Review |
| 3 | **Missing Zod schema for telemetry payload** | Critical | Backend validation cannot be implemented without schema. Add to Scope: `CompressionFailurePayloadSchema` in `apps/api/lego-api/services/observability/__types__/index.ts` with fields from AC7 (timestamp, format, originalSize, browser, errorType, errorMessage, userAgent, compressionSettings). | Pending PM Review |
| 4 | **Goals contradict Non-goals** | High | Goal says "Track compression failures via CloudWatch metrics" but Non-goals says "Not implementing compression success rate tracking". These are not contradictory but poorly worded. Clarify goal wording. | Pending PM Review |
| 5 | **AC10 not reflected in Scope section** | Medium | Scope section does NOT mention `docs/observability/compression-failures.md` documentation file. AC10 requires this deliverable. Add to Scope: "Documentation file for query examples". | Pending PM Review |
| 6 | **Missing error handling specification for telemetry endpoint** | Medium | AC2 only specifies happy path (204) and validation (400). Must add coverage for: stdout publish failure handling, malformed JSON (400), authentication requirements. | Pending PM Review |
| 7 | **Authentication not specified for telemetry endpoint** | Medium | Security vulnerability - public endpoint allows telemetry spam. Specify: Is endpoint public (allows anonymous telemetry) or requires authentication? If public, add rate limiting. | Pending PM Review |
| 8 | **Frontend error type classification incomplete** | Medium | AC6 specifies error types but compressImage() function only catches generic Error. Error classification will require heuristics (message parsing) which is fragile. Add note in Risks section. | Pending PM Review |
| 9 | **Missing timeout threshold validation** | Medium | AC6 mentions "Compression takes > 10 seconds" but WISH-2022 implementation shows NO timeout logic. Verify timeout exists in WISH-2022 or remove from error classification. | Pending PM Review |
| 10 | **CloudWatch Logs log group inconsistency** | Low | AC7 references `/aws/lambda/wishlist-api` log group but app no longer uses AWS Lambda. Update to stdout logging specification. | Pending PM Review |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | **No service layer specified** | Add as AC | Backend endpoint requires service layer per api-layer.md. Must add `services/observability/index.ts` with business logic functions |
| 2 | **No Zod schema for telemetry payload** | Add as AC | Backend validation impossible without schema. Must define `CompressionFailurePayloadSchema` in service layer types |
| 3 | **CloudWatch not viable on Vercel** | MAJOR CHANGE | Original story uses CloudWatch (AWS service). App now deploys to Vercel. Must replace with stdout logging (Vercel captures logs automatically). Simplify backend to receive and log telemetry data to stdout. |
| 4 | **No telemetry endpoint error handling** | Add as AC | Must specify error handling for stdout publish failures and edge cases |
| 5 | **Authentication/rate-limiting not specified** | Add as AC | Public telemetry endpoint vulnerable to spam. Must specify authentication and/or rate-limiting requirements |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | CloudWatch Logs Insights query examples | Out of Scope | Queries no longer applicable with stdout logging. Defer analysis tools to future story |
| 2 | CloudWatch Metrics dashboards | Out of Scope | Metrics infrastructure not viable on Vercel. Defer to future monitoring story |
| 3 | Real-time alerting for compression failures | Out of Scope | Originally deferred to Phase 5. Still deferred. |

### Follow-up Stories Suggested

- [ ] WISH-2023-FU1: Add service layer and Zod schema to WISH-2023 scope (architect-led, 1 point)
- [ ] WISH-2023-FU2: Add error handling and authentication to WISH-2023 (PM-led, 1 point)
- [ ] Phase 5: Implement stdout telemetry aggregation and analysis tools (defer to future)

### Items Marked Out-of-Scope

- **CloudWatch Metrics**: Application deploying to Vercel, not AWS. CloudWatch not available. Use stdout logging instead.
- **CloudWatch Logs integration**: Replaced by Vercel native log capture. No AWS credentials needed.
- **Historical trend analysis**: Defer to Phase 5 when telemetry aggregation infrastructure is in place.
- **Real-time alerting**: Defer to Phase 5 monitoring story.
- **A/B testing infrastructure**: Out of scope for MVP telemetry story.

## Proceed to Implementation?

**NO - Blocked by major story changes**

This story requires significant revision before implementation can proceed:

1. **Infrastructure change**: Replace all CloudWatch references with stdout logging (reflects current Vercel deployment)
2. **Architecture missing**: Add service layer and Zod schema per project standards
3. **Error handling undefined**: Specify error cases and handling
4. **Authentication undefined**: Specify endpoint security model

**Recommended Action**: Use `/pm-fix-story plans/future/wish WISH-2023` to address gaps and major changes before moving to ready-to-work.
