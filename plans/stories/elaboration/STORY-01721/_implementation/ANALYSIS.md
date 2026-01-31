# Elaboration Analysis - STORY-01721

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry exactly. Gap remediations with no new endpoints or features. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are fully consistent. Documentation focus is clear. |
| 3 | Reuse-First | PASS | — | Extends existing packages (@repo/rate-limit, @repo/logger, STORY-01711 handlers). No new packages. |
| 4 | Ports & Adapters | PASS | — | Extends existing port implementations without modifying interfaces. Adapter pattern maintained. |
| 5 | Local Testability | PASS | — | HTTP test file specified (`__http__/story-01721-gap-remediations.http`) with concrete test cases. |
| 6 | Decision Completeness | CONDITIONAL | Medium | Some implementation details need clarification (see Issues Found). |
| 7 | Risk Disclosure | PASS | — | All major risks disclosed: idempotency breaking change, part size validation, bypass security, transaction performance. |
| 8 | Story Sizing | PASS | — | 8 ACs, all low-risk documentation/edge cases. No new endpoints. Single package set modified. Well-scoped. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | File count tracking implementation unclear | Medium | AC-16 says "add virtual column or compute on-the-fly" but doesn't specify which approach to use. Need to clarify: virtual column would require migration (conflicts with "no schema changes"), so must be computed on-the-fly with COUNT query. |
| 2 | Part size validation missing | High | AC-11 adds `MULTIPART_PART_SIZE_MB` env var but doesn't specify validation. Values < 5MB will fail S3 multipart API (documented in Risks). Need explicit validation: reject values < 5 or > 100. |
| 3 | HTTP contract file name mismatch | Low | Story specifies `__http__/story-01721-gap-remediations.http` but existing pattern uses `__http__/story-01711-session-crud.http`. Should align naming convention. |
| 4 | Complete endpoint idempotency behavior change not versioned | Medium | AC-13 changes complete endpoint to return 200 (instead of 400) on duplicate completion. This is a breaking API change. Need to document as API version change or add feature flag. |
| 5 | Session expiration log context incomplete | Low | AC-10 specifies logging "sessionId, elapsed time, files registered" but doesn't specify where this logging occurs (which endpoint triggers it). Clarify: log on register/complete when session is detected as expired. |
| 6 | Transaction isolation level not specified | Medium | AC-12 requires "database transaction isolation" but doesn't specify level (READ COMMITTED vs SERIALIZABLE). For concurrent registration, need explicit isolation level to prevent race conditions. |
| 7 | Rate limit bypass startup warning location unclear | Low | AC-17 requires "warning log on server startup" but Vercel functions are stateless - no single startup point. Need to log warning on first request when bypass detected. |

## Split Recommendation

**Status:** No split required.

Story has 8 ACs, all are low-risk documentation/validation additions with no new endpoints. Touches only 3 existing handler files. Well within safe story boundaries.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Reasoning:**
- Story is well-scoped and addresses legitimate gaps identified during STORY-01712 elaboration
- Most ACs are clear and testable
- Architecture correctly extends existing handlers without new infrastructure
- Issues #1, #2, #4, #6 require clarification before implementation to avoid mid-development decisions
- All issues are Medium or Low severity - no blockers

**Conditions for PASS:**
1. Clarify file count tracking approach (computed on-the-fly, no migration)
2. Add explicit part size validation (5-100 MB range)
3. Document idempotency behavior change as API evolution (not breaking change if clients already ignore 400 on duplicate complete)
4. Specify transaction isolation level for concurrent registration (suggest SERIALIZABLE for simplicity)
5. Clarify rate limit bypass warning location (first request, not startup)

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No test coverage for concurrent complete endpoint calls | Medium | Low | AC-13 implements idempotency but doesn't test concurrent completion of same file. Add HTTP test case with parallel requests. |
| 2 | Part size override validation missing upper bound justification | Low | Low | AC-11 mentions "practical limit" of 100MB but doesn't justify. Document: AWS CLI uses 8MB default, 100MB is ~12x safety margin for local testing. |
| 3 | Session expiration edge case: expired during file registration | Medium | Low | AC-14 handles expiration during complete, but what if session expires between file registration and S3 upload? Client gets valid presigned URL but session is expired when they call complete. Document expected behavior. |
| 4 | MIME validation advisory nature not enforced | Low | Medium | AC-15 documents that MIME validation is advisory, but nothing prevents mismatch. Consider logging warning when actual S3 content-type differs from declared (requires S3 HeadObject call). |
| 5 | Rate limit bypass could be enabled in staging by accident | High | Low | AC-17 requires documentation that bypass should NEVER be enabled in production, but no runtime enforcement. Add check: if `NODE_ENV=production` and `RATE_LIMIT_BYPASS=true`, throw error and refuse to start. |
| 6 | Idempotent completion logging may not capture retry storms | Medium | Low | AC-13 logs idempotent completions with warning level but doesn't track frequency. If client has bug causing retry storm, logs will be noisy. Consider rate-limiting idempotency warnings (e.g., once per minute per fileId). |
| 7 | Concurrent registration test assumes deterministic ordering | Low | Low | AC-12 requires test for concurrent registration but doesn't specify how to verify transaction isolation worked. Need to verify: both requests succeed OR one succeeds and one gets 409 (not both succeed with duplicate keys). |
| 8 | File count limit off-by-one risk not documented | Medium | Low | AC-16 enforces file count limit but doesn't clarify: is check `count >= max` or `count > max`? If max=2 and 1 registered, should 2nd registration succeed? Document: check happens BEFORE insert, so `count + 1 > max` fails. |
| 9 | Session cleanup timing documentation location unclear | Low | Low | AC-10 requires documenting cleanup timing in code comments, but doesn't specify which file. Recommend: add comment in `upload_sessions` table schema definition and in create session handler. |
| 10 | No test data for rate limit bypass scenario | Low | Low | AC-17 adds bypass functionality but HTTP test file doesn't include test case with `RATE_LIMIT_BYPASS=true` in environment. Add note in HTTP file: "Set RATE_LIMIT_BYPASS=true to test RL-HP-001". |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add session expiration countdown to create response | Low | Low | Current response includes `expiresAt` timestamp. Add `expiresInSeconds` for easier client-side countdown without timezone math. |
| 2 | Expose part size in session metadata | Low | Low | `partSizeBytes` is returned in create response but not queryable later. If client loses session data, they can't reconstruct part boundaries. Consider adding GET session endpoint (future story). |
| 3 | Add dry-run mode for file count validation | Low | Medium | AC-16 enforces file count limit at registration time. Client can't pre-validate their file list without actually registering. Add optional `?dryRun=true` query param to register endpoint. |
| 4 | Structured error codes for all validation failures | Medium | Medium | Story uses custom error codes (`fileCountExceeded`, `sessionExpired`) but not consistently. Standardize: all 400/409/410 responses should include machine-readable `errorCode` field. |
| 5 | Add session metadata passthrough | Low | Low | STORY-01711 doesn't support custom session metadata (e.g., `mocTitle`, `purpose`). Gap remediation story could add optional `metadata` field to create session request for client tracking. |
| 6 | Part size auto-calculation based on file sizes | Medium | High | Current part size is fixed 5MB. For large PDFs (50MB), this means 10 parts. Could optimize: if all files < 10MB, use single-part upload (no multipart overhead). Deferred to future optimization story. |
| 7 | Add session activity timestamp | Low | Medium | Sessions expire after fixed TTL regardless of activity. Could extend session TTL on each file registration (AC-23 in STORY-01723 addresses this). |
| 8 | Expose allowed MIME types in config endpoint | Low | Low | Clients must hardcode allowed MIME types or face 415 errors. Consider adding GET /api/config/upload endpoint that returns `allowedMimeTypes` from `@repo/upload-config`. |
| 9 | Add request ID to all error responses | Medium | Low | For debugging expired sessions (AC-14), clients need to provide request context. Add `requestId` (from Vercel headers) to all error responses for support tracking. |
| 10 | Add session tags for cost allocation | Low | Medium | For multi-tenant deployments, session creation could accept optional `tags` (e.g., `{ team: "lego-creators", project: "castle" }`) for S3 cost allocation. Out of scope for this story. |

---

## Worker Token Summary

- Input: ~58K tokens (story file, stories.index.md, STORY-0171.md, parent story context, agent instructions, QA agent context, existing implementation files, upload config schema, HTTP test file)
- Output: ~2.5K tokens (ANALYSIS.md)

