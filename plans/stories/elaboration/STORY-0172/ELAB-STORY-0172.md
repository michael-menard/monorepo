# Elaboration Report - STORY-0172

**Date**: 2026-01-25
**Verdict**: SPLIT REQUIRED

## Summary

The expanded acceptance criteria (18 additional items) signal that STORY-0172 has exceeded optimal sizing boundaries. While the core binary upload and finalization work remains viable, the decision to include all gaps and enhancements as acceptance criteria transforms this into a significantly larger scope that warrants architectural separation.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md entry exactly. Two endpoints (upload-part, finalize). No scope creep detected. |
| 2 | Internal Consistency | PASS | — | Goals align with scope. Non-goals clearly exclude STORY-0171 work. AC-3, AC-5, AC-8 all consistent with endpoints and architecture notes. |
| 3 | Reuse-First | PASS | — | Story correctly identifies existing packages (@repo/file-validator, @repo/upload-types, @repo/logger) and existing AWS implementation for reference. No unnecessary new packages created. |
| 4 | Ports & Adapters | PASS | — | Clear port interfaces defined (uploadPart, finalizeSession). Adapter responsibilities explicitly separated (DB via Drizzle, S3 via AWS SDK). Core logic is transport-agnostic. |
| 5 | Local Testability | PASS | — | `.http` test file specified (`__http__/story-0172-binary-finalization.http`). Test IDs documented. Happy path, error cases, and E2E scenarios defined. No Playwright needed (backend-only). |
| 6 | Decision Completeness | PASS | — | Three PM decisions documented with rationale (Vercel tier, no core package, binary handling). No blocking TBDs. Open Questions section absent (good - no blockers). |
| 7 | Risk Disclosure | PASS | — | Six risks explicitly documented: binary handling in Vercel, body size limits (Pro tier requirement), two-phase locking, S3 multipart coordination, magic bytes validation, slug uniqueness. Dependencies on STORY-0171 clearly stated. |
| 8 | Story Sizing | FAIL | High | Original 3 ACs expanded to 21 ACs with user decisions. Story now encompasses error handling, retry strategies, validation ranges, ETag handling, UX decisions, logging, transaction semantics, CORS handling, rate limiting, and performance optimizations. Scope has grown beyond single-story capacity. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Scope explosion from gap/enhancement acceptance | Critical | SPLIT story into: Core (upload-part + finalize with original 3 ACs) and Enhancements (18 additional ACs for reliability, observability, and performance). | BLOCKING |
| 2 | Mixed stability concerns and performance enhancements | High | Separate infrastructure concerns (retry, transaction, rate limiting) from performance optimizations (parallel validation, batch endpoints). | REQUIRES SPLIT |
| 3 | Merged MVP and Phase 2 work | High | Core story should deliver binary upload + finalization. Gaps (8 items) should move to "Phase 2: Reliability" story. Enhancements (10 items) should move to "Phase 3: Performance & Observability" story. | BLOCKING |

## Split Recommendation

**SPLIT into 3 stories:**

### Story A: STORY-0172A - Binary Upload & Finalization (Core MVP)
**Scope**: Original 3 acceptance criteria
- AC-3: Upload Part Endpoint (Binary Handling)
- AC-5: Finalize Session Endpoint
- AC-8: Part Size Configuration

**Focus**: Ship working endpoints with Vercel parity to AWS implementation. All original design decisions intact.

**Acceptance**: Happy path tests + basic error cases (empty body, invalid part number, non-existent session).

---

### Story B: STORY-0172B - Upload Reliability & Resilience (Phase 2)
**Scope**: 8 gaps marked "Add as AC"
- gap_1_s3_retry: S3 retry strategy and exhaustion handling
- gap_2_vercel_timeout: Vercel 30s timeout + client timeout coordination
- gap_3_partnumber_range: Validate partNumber in range [1, 10000]
- gap_4_etag_format: Document ETag format differences (multipart vs single-part)
- gap_5_slug_conflict_ux: Slug conflict UX guidance (auto-retry vs prompt)
- gap_6_upload_logging: Structured logging strategy (partNumber, size, etag)
- gap_7_lock_recovery_testing: Explicit test for stale lock recovery (>5 min)
- gap_8_cors_handling: CORS preflight for browser uploads
- gap_9_db_transactions: Database transaction boundary specification
- gap_10_rate_limiting: Rate limiting for finalize endpoint

**Focus**: Harden endpoints against production edge cases and failure modes.

**Dependencies**: STORY-0172A (core must be working first)

---

### Story C: STORY-0172C - Upload Performance & Observability (Phase 3)
**Scope**: 10 enhancements marked "Add as AC"
- enhance_1_websocket_progress: Real-time progress tracking via WebSocket
- enhance_2_parallel_validation: Parallel file validation during finalize
- enhance_3_checksum_validation: MD5/SHA checksum verification
- enhance_4_batch_upload: Batch upload-part endpoint (multiple parts per request)
- enhance_5_thumbnail_generation: Auto-generate thumbnails from images
- enhance_6_webhook_notifications: Post-finalize webhook notifications
- enhance_7_resume_from_failure: Upload resume from partial finalize state
- enhance_8_opentelemetry: Structured finalize telemetry
- enhance_9_multi_region: (Out-of-Scope per user decision)
- enhance_10_deduplication: (Out-of-Scope per user decision)

**Focus**: Enable advanced features and observability that improve user experience and operational insights.

**Dependencies**: STORY-0172A (core), STORY-0172B (reliability)

---

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No retry strategy for S3 UploadPartCommand failures | Add as AC | S3 SDK has built-in retries, but story should document expected behavior if retry exhausts. Client should re-upload part. Add note to AC-3. |
| 2 | No explicit handling for Vercel function timeout (30s) | Add as AC | If binary upload takes >30s (slow network), function times out. Story mentions maxDuration: 30 but doesn't specify client-side timeout handling. Add error case: REQUEST_TIMEOUT. |
| 3 | Missing validation for partNumber range (1-10000) | Add as AC | S3 supports parts 1-10000. Story validates partNumber > 0 but not upper bound. Could cause confusing S3 errors. Add validation: partNumber <= 10000. |
| 4 | No discussion of ETag format variations | Add as AC | S3 ETags for multipart uploads vs single-part differ (multipart has suffix "-N"). Story doesn't document this nuance. Add note to AC-3 or Risks section. |
| 5 | Slug conflict resolution only returns suggestedSlug | Add as AC | AC-5 returns suggestedSlug on 409 conflict, but doesn't specify if client should auto-retry or prompt user. Add UX guidance to decision or test plan. |
| 6 | No logging strategy for binary upload size | Add as AC | Story references @repo/logger but doesn't specify what to log for upload-part (partNumber, size, etag). Add structured logging example to Reuse Plan. |
| 7 | Two-phase lock TTL recovery not tested | Add as AC | AC-5 mentions stale lock recovery (>5 min) but test plan doesn't include explicit test for this edge case. Add test: FS-CONC-002 (already listed but not in error case table). |
| 8 | Missing CORS preflight handling note | Add as AC | Vercel serverless functions need explicit OPTIONS handling for browser uploads. Story doesn't mention if upload-part endpoint expects browser uploads or server-mediated only. Clarify in Architecture Notes. |
| 9 | No database transaction boundary specification | Add as AC | Finalize endpoint has multiple DB writes (MOC, mocFiles, session update). Story doesn't specify if these should be wrapped in explicit transaction or rely on implicit per-statement. Add transaction guidance. |
| 10 | Rate limiting not mentioned for finalize endpoint | Add as AC | STORY-015/016 Vercel handlers include rate limiting. Finalize is expensive (magic bytes, S3 calls). Should finalize have rate limit? Document decision. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Real-time progress tracking via WebSocket | Add as AC | Upload-part could emit progress events to WebSocket (STORY-019). Would enable live upload progress UI. Defer to follow-up story. |
| 2 | Parallel part validation during finalize | Add as AC | Finalize validates files sequentially (HeadObject + magic bytes). Could parallelize with Promise.all(). Reduces finalize latency. Consider for performance optimization. |
| 3 | Checksum validation beyond magic bytes | Add as AC | Story uses magic bytes (first 512 bytes) but S3 supports MD5/SHA checksums. Could add optional checksum verification for data integrity. Low ROI for MVP. |
| 4 | Batch upload-part endpoint | Add as AC | Instead of 1 part per request, accept array of parts. Reduces HTTP overhead for small files. Requires streaming multiplexing. Defer to Phase 2. |
| 5 | Thumbnail auto-generation from first image | Add as AC | AC-5 sets first image as thumbnail but doesn't auto-resize. Could integrate image processing (Sharp.js) to generate optimized thumbnails. Defer to UX enhancement story. |
| 6 | Finalize webhook notifications | Add as AC | After successful finalize, trigger webhook to notify frontend. Enables async finalize UX. Requires webhook infrastructure. Defer to notification story. |
| 7 | Upload resume from failed finalize | Add as AC | If finalize fails after MOC creation but before session update, next finalize should detect partial state and resume. Story has idempotency for complete finalize but not partial. Add to edge cases or defer. |
| 8 | Structured finalize telemetry | Add as AC | Finalize is critical path. Add OpenTelemetry spans for each step (validate, create MOC, files, etc.). Enables performance debugging. Low effort if telemetry exists. |
| 9 | Multi-region S3 upload optimization | Out-of-Scope | For global users, route upload-part to closest S3 region. Reduces latency. Requires multi-region bucket config. Defer to infrastructure optimization. |
| 10 | Deduplication of identical files | Out-of-Scope | If user uploads same file twice (same hash), reuse S3 object. Saves storage. Requires content-addressable storage pattern. Significant refactor. |

### Follow-up Stories Suggested

None at elaboration phase. Follow-up stories will be created as part of split execution:
- STORY-0172B (Phase 2: Reliability)
- STORY-0172C (Phase 3: Performance & Observability)

### Items Marked Out-of-Scope

- **enhance_9_multi_region**: Multi-region S3 optimization requires infrastructure changes and global routing logic. Deferred to future infrastructure story.
- **enhance_10_deduplication**: Content-addressable storage and deduplication requires significant refactor. Deferred to future storage optimization story.

## Proceed to Implementation?

**NO - requires split**

This story has grown to encompass 21 acceptance criteria (3 original + 18 from user decisions). Attempting to deliver all items in a single iteration risks:
- Excessive cognitive load on developer
- Extended implementation timeline
- Reduced code quality due to scope pressure
- Difficulty isolating failures during testing

**Recommended Path Forward:**

1. **Execute SPLIT** into 3 stories (Core MVP → Phase 2 Reliability → Phase 3 Performance)
2. **PM Refinement** of split stories to ensure each has clear, bounded scope
3. **Tech Lead Review** of split architecture to confirm separation concerns
4. **Implementation** in sequence: MVP → Reliability → Performance

---

## Summary of User Decisions

| Category | Count | Action |
|----------|-------|--------|
| Gaps marked "Add as AC" | 8 | Create STORY-0172B (Phase 2: Reliability) |
| Enhancements marked "Add as AC" | 8 | Create STORY-0172C (Phase 3: Performance & Observability) |
| Items marked "Out-of-Scope" | 2 | Noted for future consideration, not in any story |
| Follow-up stories requested | 0 | — |

**Total AC expansion**: 3 → 21 (700% growth)
**Verdict Impact**: CONDITIONAL PASS → **SPLIT REQUIRED**
