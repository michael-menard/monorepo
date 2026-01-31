# Elaboration Analysis - STORY-0171

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. 3 endpoints: create session, register file, complete file. Split Z=1 dependency structure is correct. |
| 2 | Internal Consistency | PASS | — | Goals align with scope. Non-goals correctly exclude binary upload (STORY-0172) and session finalization. AC allocation matches split boundaries. |
| 3 | Reuse-First | CONDITIONAL | Medium | Story claims to reuse `@repo/rate-limit` and references `apps/api/platforms/aws/endpoints/moc-uploads/sessions/_shared/schemas.ts`. However, story states "inline schema definitions" in patterns section which contradicts schema reuse. Clarification needed on whether to import AWS schemas or inline them. |
| 4 | Ports & Adapters | PASS | — | Port interfaces clearly defined. Adapters (Drizzle for DB, S3Client for uploads) are isolated. |
| 5 | Local Testability | PASS | — | `.http` file specified with test IDs. Both happy path and error cases documented. Evidence requirements include DB queries and S3 verification. |
| 6 | Decision Completeness | PASS | — | No TBDs. Environment variables, route rewrites, and seed data all specified. |
| 7 | Risk Disclosure | PASS | — | Session expiration, S3 coordination, rate limiting, and concurrent registration risks are disclosed. |
| 8 | Story Sizing | PASS | — | 5 ACs (originally 8 before split), 3 endpoints, backend-only work. Well-sized after split. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Schema reuse inconsistency | Medium | Story "Reuse Plan" section says to reference `apps/api/platforms/aws/endpoints/moc-uploads/sessions/_shared/schemas.ts`, but "Patterns to Follow" says "inline schema definitions (matching STORY-015/016 pattern)". AWS schemas exist and are comprehensive. Decision needed: import AWS schemas or inline them? Recommend importing for DRY principle. |
| 2 | Package name mismatch | Low | Story references `@repo/rate-limit` (correct) in AC-1 but the "Reuse Plan" table is ambiguous. Verified `@repo/rate-limit` exists at `packages/tools/rate-limit` and is the correct package. No fix needed, just a note. |
| 3 | Missing AC-3 and AC-5 | Low | Story jumps from AC-2 to AC-4, then AC-6, AC-7. AC-3 and AC-5 were allocated to STORY-0172 (binary upload and finalize). This is correct per split context but could confuse readers. Consider renumbering or adding "AC-3: See STORY-0172" placeholders. |
| 4 | Seed data determinism | Low | Seed section specifies fixed UUIDs for test sessions (expired session, other user's session) but doesn't specify a seed for the authenticated dev user's own valid session. Consider adding a valid session seed for RF-HP-001 test. |
| 5 | S3 verification evidence gap | Medium | Story requires "S3 console or CLI showing multipart upload IDs created" but doesn't specify how to query this locally. Recommend adding AWS CLI command to evidence requirements: `aws s3api list-multipart-uploads --bucket $MOC_BUCKET`. |

## Split Recommendation

**Not Applicable** - Story is already the result of a split from STORY-017 (Z=1 of 2).

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Session cleanup timing not specified | Low | Low | Story defers cleanup to STORY-018, but doesn't specify what happens to orphaned sessions created in STORY-0171. Clarify that sessions with status="active" and expiresAt < NOW will be cleaned by STORY-018. |
| 2 | Part size configuration justification missing | Low | Low | Story uses `partSizeBytes: 5242880` (5MB) but doesn't explain why. AWS Lambda has max file size of 6MB, but this is for Vercel. Document that 5MB is S3's minimum multipart size. |
| 3 | Concurrent file registration within same session | Medium | Low | Story mentions "concurrent file registration" as an edge case but doesn't specify behavior. Database unique constraints prevent duplicates, but what about race conditions on session validation? Recommend explicit test case for concurrent POST to same session. |
| 4 | Complete file idempotency | Medium | Low | AC-4 says "Returns 400 for already-completed file" but doesn't specify if this is an error or idempotent success. Recommend clarifying: should complete be idempotent (200 with existing fileUrl) or reject (400)? |
| 5 | Session expiration window edge case | Medium | Medium | If a session expires DURING a multipart upload (between register and complete), what happens? Client gets 400 on complete. Should the story document a recommended client retry strategy or minimum session TTL buffer? |
| 6 | MIME type validation timing | Low | Low | Story validates MIME type at session creation (AC-1) but S3 doesn't enforce it. Client could upload different content type. Document that MIME validation is advisory and real validation happens at finalize (STORY-0172). |
| 7 | File count limits at session level | Low | Medium | Story validates file counts at session creation, but doesn't prevent registering MORE files than declared. Should `upload_session_files` count be validated against session metadata? Or is this enforced at finalize? |
| 8 | Rate limit bypass for testing | Low | Low | Story specifies `AUTH_BYPASS=true` for local auth but doesn't mention rate limit bypass. Recommend adding `RATE_LIMIT_BYPASS=true` env var for local testing or document how to reset rate limits via SQL. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Progress tracking hooks | Medium | High | Session creation could return a WebSocket connection URL for real-time upload progress. Out of scope for this story (depends on STORY-019) but would be a killer feature. |
| 2 | Presigned URL generation for parts | High | Medium | Story makes client call "register file" then "upload part" separately. Enhancement: register file could return presigned URLs for ALL parts upfront, reducing round trips. Trade-off: large sessions = large response payload. |
| 3 | Client SDK generation | Medium | Low | `.http` file could be used to generate TypeScript SDK with `openapi-generator`. Low effort, high DX value. |
| 4 | Session analytics | Low | Low | Track session success rate (completed / created), average upload time, common failure points. Add to observability without blocking this story. |
| 5 | Duplicate file detection | Medium | High | Before creating session, check if user has already uploaded identical files (by size + hash). Prevents wasted uploads. Requires file hash in metadata (breaking change). |
| 6 | Automatic session extension | Medium | Medium | If client is actively uploading, auto-extend expiresAt. Prevents timeout failures on large uploads over slow connections. Adds complexity to state management. |
| 7 | Batch file registration | Low | Medium | Instead of POST per file, allow `POST /sessions/:id/files/batch` with array. Reduces API calls for multi-file sessions. Trade-off: more complex error handling (partial success). |
| 8 | Upload resume capability | High | High | Store uploaded part ETags in `upload_session_parts` to enable resume after network failure. Story already has the table but doesn't use it in STORY-0171. Full resume requires STORY-0172 integration. |

---

## Preliminary Verdict

**CONDITIONAL PASS**

### Conditions:
1. **Schema Reuse Decision Required (Medium Priority):** Clarify whether to import AWS schemas from `apps/api/platforms/aws/endpoints/moc-uploads/sessions/_shared/schemas.ts` or inline them. Story contradicts itself. Recommend importing for DRY.
2. **Evidence Specification (Low Priority):** Add specific AWS CLI command for S3 verification to evidence requirements section.
3. **Complete File Idempotency Clarification (Medium Priority):** Specify whether calling complete on already-completed file should return 200 (idempotent) or 400 (error).

### Rationale:
- All 8 audit checks pass or have minor issues
- No Critical or High severity blockers
- Story is well-scoped after split
- Reuse plan is solid except schema import ambiguity
- Test plan is comprehensive with good error coverage
- Discovery findings are enhancements, not blockers

### Recommendation:
**Proceed with implementation** after PM clarifies schema reuse pattern. The inconsistency is minor but could lead to unnecessary refactoring if wrong approach is chosen.

---

## Worker Token Summary

- Input: ~33,000 tokens (story file + stories.index + qa.agent + AWS schemas + config files + DB schema + rate-limit package + Vercel handler examples)
- Output: ~2,100 tokens (ANALYSIS.md)
