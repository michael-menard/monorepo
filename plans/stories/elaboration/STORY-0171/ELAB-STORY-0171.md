# Elaboration Report - STORY-0171

**Date**: 2026-01-25
**Verdict**: SPLIT REQUIRED

## Summary

STORY-0171 has been thoroughly elaborated and identified as requiring a split. While the core session management functionality (create session, register file, complete file) is well-scoped and ready for implementation, the discovery phase revealed 8 critical gaps and 8 enhancement opportunities that PM and QA have elected to add as acceptance criteria. These additions increase complexity beyond safe single-story boundaries. Recommend splitting into: (1) Core Session CRUD (current scope) and (2) Enhanced Session Features (gaps + enhancements).

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. 3 endpoints: create session, register file, complete file. Split Z=1 dependency structure is correct. |
| 2 | Internal Consistency | PASS | — | Goals align with scope. Non-goals correctly exclude binary upload (STORY-0172) and session finalization. AC allocation matches split boundaries. |
| 3 | Reuse-First | CONDITIONAL | Medium | Story claims to reuse `@repo/rate-limit` and references AWS schemas. However, decision exists on whether to import AWS schemas or inline them. Clarification documented below. |
| 4 | Ports & Adapters | PASS | — | Port interfaces clearly defined. Adapters (Drizzle for DB, S3Client for uploads) are isolated. |
| 5 | Local Testability | PASS | — | `.http` file specified with test IDs. Both happy path and error cases documented. Evidence requirements include DB queries and S3 verification. |
| 6 | Decision Completeness | PASS | — | No TBDs. Environment variables, route rewrites, and seed data all specified. |
| 7 | Risk Disclosure | PASS | — | Session expiration, S3 coordination, rate limiting, and concurrent registration risks are disclosed. |
| 8 | Story Sizing | CONDITIONAL | Medium | 5 ACs in base story well-sized. However, user decisions to add 8 gaps + 8 enhancements as ACs increases scope beyond safe boundaries. Split required to maintain manageability. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Schema reuse inconsistency | Medium | Story "Reuse Plan" section says to reference AWS schemas, but "Patterns to Follow" says "inline schema definitions". Decision: Import AWS schemas for DRY principle. | **RESOLVED by PM decision** |
| 2 | Seed data determinism gap | Low | Seed section specifies fixed UUIDs for test sessions but doesn't include valid session seed for happy path. | **RESOLVED by PM decision** |
| 3 | S3 verification evidence gap | Medium | Story requires "S3 console or CLI showing multipart upload IDs created" but doesn't specify AWS CLI command. Recommend: `aws s3api list-multipart-uploads --bucket $MOC_BUCKET` | **RESOLVED by PM decision** |
| 4 | Scope expansion conflict | High | Discovery found 8 gaps and 8 enhancements. User elected to add ALL as acceptance criteria. This increases story from 5 ACs to 21 ACs, violating safe story sizing principles. | **SPLIT REQUIRED** |

## Split Recommendation

**SPLIT INTO 2 STORIES:**

### STORY-0171a (Recommended as core STORY-0171): Session & File Management - CRUD Only
**Acceptance Criteria: 7** (original 5 + 2 clarifications)
- AC-1: Create Session Endpoint (original)
- AC-2: Register File Endpoint (original)
- AC-4: Complete File Endpoint (original, with clarifications)
- AC-6: Authentication (original)
- AC-7: Vercel Function Configuration (original)
- AC-8: Core Package (new, for code organization)
- AC-9: Database Schema (new, for clarity)

**Effort:** 5-8 days
**Status:** Ready for implementation

### STORY-0171b (Recommended follow-up): Session & File Management - Advanced Features
**Acceptance Criteria: 16** (8 gap remediations + 8 enhancement implementations)

**Gap Remediations (AC-10 through AC-17):**
- AC-10: Session cleanup timing specification
- AC-11: Part size configuration with rationale
- AC-12: Concurrent file registration race condition handling
- AC-13: Complete file idempotency (clarify 200 vs 400 behavior)
- AC-14: Session expiration window edge case handling
- AC-15: MIME type validation documentation
- AC-16: File count limits enforcement
- AC-17: Rate limit bypass for testing

**Enhancement Implementations (AC-18 through AC-25):**
- AC-18: WebSocket progress tracking hooks
- AC-19: Presigned URL batch generation for all parts upfront
- AC-20: TypeScript SDK generation from `.http` file
- AC-21: Session analytics tracking
- AC-22: Duplicate file detection
- AC-23: Automatic session extension on active uploads
- AC-24: Batch file registration endpoint
- AC-25: Upload resume capability

**Effort:** 13-21 days (depends on enhancement complexity)
**Dependency:** Requires STORY-0171a complete
**Status:** Pending PM review after this split recommendation

---

## Discovery Findings

### Gaps Identified (User Decision: Add as AC)

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| gap1_session_cleanup | Session cleanup timing not specified | **Add as AC** | Story defers cleanup to STORY-018, but doesn't specify what happens to orphaned sessions. Clarify that sessions with status="active" and expiresAt < NOW will be cleaned by STORY-018. |
| gap2_part_size_docs | Part size configuration justification missing | **Add as AC** | Story uses `partSizeBytes: 5242880` (5MB) but doesn't explain why. AWS Lambda has max file size of 6MB, but this is for Vercel. Document that 5MB is S3's minimum multipart size. |
| gap3_concurrent_registration | Concurrent file registration within same session | **Add as AC** | Story mentions "concurrent file registration" as edge case but doesn't specify behavior. Database unique constraints prevent duplicates, but what about race conditions? Recommend explicit test case for concurrent POST to same session. |
| gap4_complete_idempotency | Complete file idempotency | **Add as AC** | AC-4 says "Returns 400 for already-completed file" but doesn't specify if this is error or idempotent success. Recommend clarifying: should complete be idempotent (200 with existing fileUrl) or reject (400)? |
| gap5_session_expiration | Session expiration window edge case | **Add as AC** | If a session expires DURING a multipart upload (between register and complete), what happens? Client gets 400 on complete. Should story document a recommended client retry strategy or minimum session TTL buffer? |
| gap6_mime_validation | MIME type validation timing | **Add as AC** | Story validates MIME type at session creation (AC-1) but S3 doesn't enforce it. Client could upload different content type. Document that MIME validation is advisory and real validation happens at finalize (STORY-0172). |
| gap7_file_count_limits | File count limits at session level | **Add as AC** | Story validates file counts at session creation, but doesn't prevent registering MORE files than declared. Should `upload_session_files` count be validated against session metadata? Or is this enforced at finalize? |
| gap8_rate_limit_bypass | Rate limit bypass for testing | **Add as AC** | Story specifies `AUTH_BYPASS=true` for local auth but doesn't mention rate limit bypass. Recommend adding `RATE_LIMIT_BYPASS=true` env var for local testing or document how to reset rate limits via SQL. |

### Enhancement Opportunities (User Decision: Add as AC)

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| enh1_websocket_progress | Progress tracking hooks | **Add as AC** | Session creation could return a WebSocket connection URL for real-time upload progress. Out of scope for this story (depends on STORY-019) but would be a killer feature. |
| enh2_presigned_urls | Presigned URL generation for parts | **Add as AC** | Story makes client call "register file" then "upload part" separately. Enhancement: register file could return presigned URLs for ALL parts upfront, reducing round trips. Trade-off: large sessions = large response payload. |
| enh3_client_sdk | Client SDK generation | **Add as AC** | `.http` file could be used to generate TypeScript SDK with `openapi-generator`. Low effort, high DX value. |
| enh4_session_analytics | Session analytics | **Add as AC** | Track session success rate (completed / created), average upload time, common failure points. Add to observability without blocking this story. |
| enh5_duplicate_detection | Duplicate file detection | **Add as AC** | Before creating session, check if user has already uploaded identical files (by size + hash). Prevents wasted uploads. Requires file hash in metadata (breaking change). |
| enh6_auto_session_extend | Automatic session extension | **Add as AC** | If client is actively uploading, auto-extend expiresAt. Prevents timeout failures on large uploads over slow connections. Adds complexity to state management. |
| enh7_batch_registration | Batch file registration | **Add as AC** | Instead of POST per file, allow `POST /sessions/:id/files/batch` with array. Reduces API calls for multi-file sessions. Trade-off: more complex error handling (partial success). |
| enh8_upload_resume | Upload resume capability | **Add as AC** | Store uploaded part ETags in `upload_session_parts` to enable resume after network failure. Story already has the table but doesn't use it in STORY-0171. Full resume requires STORY-0172 integration. |

### Follow-up Stories Suggested

- [ ] **STORY-0171b**: Session & File Management - Advanced Features (16 ACs combining gap remediations + enhancements). Dependency: requires STORY-0171a complete.
- [ ] **STORY-018**: Session cleanup job (mentioned in story, separate workstream)
- [ ] **STORY-019**: WebSocket notifications for upload progress (enhancement enh1_websocket_progress dependency)

### Items Marked Out-of-Scope

- Binary part upload handling: Deferred to STORY-0172
- Session finalization with two-phase locking: Deferred to STORY-0172
- File content validation and magic bytes: Deferred to STORY-0172
- Background cleanup jobs: Deferred to STORY-018
- WebSocket infrastructure: Deferred to STORY-019

---

## Proceed to Implementation?

**NO - requires split**

The story requires splitting into two separate stories to maintain safe sizing and complexity boundaries:

1. **STORY-0171** (CRUD core): 7 ACs, 5-8 days effort, ready for implementation
2. **STORY-0171b** (Advanced features): 16 ACs, 13-21 days effort, pending PM review

Recommend PM:
1. Approve split recommendation
2. Create STORY-0171b in backlog with 16 ACs for gap/enhancement items
3. Establish STORY-0171b dependency on STORY-0171a
4. Reschedule enhancements to future roadmap phases

---

**Status**: ELABORATION COMPLETE - Split recommendation delivered to PM for decision

