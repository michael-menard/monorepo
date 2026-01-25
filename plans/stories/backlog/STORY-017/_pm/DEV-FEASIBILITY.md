# DEV-FEASIBILITY: STORY-017 - Image Uploads Phase 3 (Multipart Sessions)

## Summary

**Feasibility: IMPLEMENTABLE WITH CONSTRAINTS**

This story migrates the AWS Lambda multipart upload session endpoints to Vercel serverless functions. Unlike STORY-015/016 which used presigned URLs (client uploads directly to S3), this story involves **server-side binary data handling** where the Vercel function receives and forwards binary chunks to S3.

**Critical Constraint:** Vercel's body size limit (4.5MB Hobby / 50MB Pro) fundamentally affects the upload-part endpoint since S3's minimum multipart part size is 5MB. This requires careful consideration of the deployment tier.

---

## 1. Feasibility Assessment

### Can This Be Implemented on Vercel?

**Yes, with the following constraints:**

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Vercel body limit (4.5MB Hobby) | **BLOCKER for Hobby tier** - S3 minimum part size is 5MB | Must use Pro tier (50MB limit) OR reduce part size to 4MB (valid for S3) |
| Binary body handling differs | Vercel uses `VercelRequest.body` vs Lambda's base64-encoded body | Adapt request transformer or use `req.pipe()` for streaming |
| Path parameter extraction | Vercel uses `[param]` style vs API Gateway's `{param}` | Use `req.query.paramName` pattern established in STORY-015/016 |
| Cold start latency | S3 client initialization adds latency | Use singleton pattern (already established) |

### Tier Decision Required

**PM Decision Point:** The current AWS implementation uses 5MB part size (S3 default/minimum). On Vercel Hobby tier:
- **Option A (Recommended):** Require Pro tier - keeps 5MB parts, matches AWS behavior
- **Option B:** Reduce part size to 4MB - works on Hobby but increases total part count (~25% more parts per file)
- **Option C:** Hybrid approach - detect tier and adjust part size dynamically

---

## 2. Risk Analysis

### HIGH RISK

| Risk | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| **Binary body handling** | Vercel functions handle binary differently than Lambda. Lambda uses `isBase64Encoded: true` with base64 body; Vercel receives raw Buffer. | HIGH | Create binary body handling utility in `@repo/vercel-adapter` or handle inline. Test with real binary data. |
| **Part size vs body limit mismatch** | 5MB parts won't fit in 4.5MB Hobby tier body limit | HIGH | Require Pro tier OR implement 4MB part size |
| **S3 multipart state coordination** | Each upload part stores `uploadId` + `partNumber` + `etag` in DB. Race conditions possible if parts arrive out of order or duplicated. | MEDIUM-HIGH | Use upsert pattern (already in AWS handler) with unique constraint on `(fileId, partNumber)` |

### MEDIUM RISK

| Risk | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| **Session state across requests** | Sessions, files, and parts span multiple requests over time. Expiration and cleanup logic must work correctly. | MEDIUM | Session TTL already enforced. Rely on existing `expiresAt` checks. |
| **Finalize complexity** | Finalize endpoint does HeadObject + GetObject + magic bytes validation + MOC creation + file record creation atomically | MEDIUM | Reuse patterns from STORY-015 finalize. Extract to core package. |
| **Rate limiting integration** | Must check rate limit before session creation, not per-part | MEDIUM | Use existing `@repo/rate-limit` with `createPostgresRateLimitStore()` |

### LOW RISK

| Risk | Description | Severity | Mitigation |
|------|-------------|----------|------------|
| **Schema already exists** | `upload_sessions`, `upload_session_files`, `upload_session_parts` tables | LOW | No schema changes needed |
| **Zod schemas exist** | All request/response schemas in `_shared/schemas.ts` | LOW | Reuse directly or extract to package |

---

## 3. Change Surface Analysis

### Files to Create (6)

| File | Purpose | Complexity | Notes |
|------|---------|------------|-------|
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts` | Create session | MEDIUM | POST handler for session creation |
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts` | Register file | MEDIUM | POST handler to register file in session |
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts` | Upload part | **HIGH** | PUT handler for binary chunk upload |
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts` | Complete file | LOW | POST handler to complete multipart upload |
| `apps/api/platforms/vercel/api/mocs/uploads/finalize.ts` | Finalize session | **HIGH** | POST handler - creates MOC from session |
| `packages/backend/moc-instructions-core/src/multipart-sessions/*.ts` | Core logic | MEDIUM | Extract multipart session logic (optional) |

### Files to Modify (3)

| File | Change | Risk |
|------|--------|------|
| `apps/api/platforms/vercel/vercel.json` | Add route rewrites for 5 new endpoints | LOW |
| `packages/backend/vercel-adapter/src/request-transformer.ts` | Add binary body handling support | MEDIUM |
| `__http__/mocs.http` | Add STORY-017 test requests | LOW |

### Route Rewrites to Add

```json
{ "source": "/api/mocs/uploads/sessions", "destination": "/api/mocs/uploads/sessions/index.ts" },
{ "source": "/api/mocs/uploads/sessions/:sessionId/files", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/index.ts" },
{ "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts" },
{ "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts" },
{ "source": "/api/mocs/uploads/finalize", "destination": "/api/mocs/uploads/finalize.ts" }
```

---

## 4. Hidden Dependencies

### Critical Dependencies Not Obvious from Endpoint List

| Dependency | Description | Status |
|------------|-------------|--------|
| **Database schema** | `upload_sessions`, `upload_session_files`, `upload_session_parts` tables | AVAILABLE - schema exists |
| **S3 multipart API** | `CreateMultipartUploadCommand`, `UploadPartCommand`, `CompleteMultipartUploadCommand` | AVAILABLE - already used in AWS |
| **@repo/file-validator** | Magic bytes validation for finalize | AVAILABLE |
| **@repo/upload-types** | `slugify()`, `findAvailableSlug()` for MOC creation | AVAILABLE |
| **Rate limit store** | Postgres-backed rate limiter | AVAILABLE - used in STORY-015/016 |

### Binary Data Flow (Key Insight)

The upload-part handler in AWS receives binary data via:
```typescript
const bodyBuffer = event.isBase64Encoded
  ? Buffer.from(event.body, 'base64')
  : Buffer.from(event.body, 'binary')
```

Vercel does NOT use the same encoding. The equivalent in Vercel is:
```typescript
// Option 1: Direct buffer access (if bodyParser disabled)
const chunks: Buffer[] = []
for await (const chunk of req) {
  chunks.push(chunk as Buffer)
}
const bodyBuffer = Buffer.concat(chunks)

// Option 2: Use existing Vercel request body parsing
// (may need config to disable automatic JSON parsing)
```

**PM Note:** This is a key technical detail that must be validated during implementation.

### Finalize Endpoint Complexity

The finalize endpoint performs these operations atomically:
1. Verify session exists and belongs to user
2. Check if already finalized (idempotent short-circuit)
3. Check session not expired
4. Acquire finalize lock (two-phase locking pattern)
5. Get all completed files from session
6. Verify at least one instruction file exists
7. For each file:
   - HeadObject to verify existence in S3
   - Validate file size matches expected
   - GetObject (first 512 bytes) for magic bytes validation
8. Generate unique slug for MOC
9. Create MOC record in `moc_instructions` table
10. Create file records in `moc_files` table
11. Set thumbnail from first image
12. Mark session as finalized
13. Return MOC details

This is the same complexity as STORY-015 finalize, which was successfully implemented.

---

## 5. Missing AC Candidates

Based on analysis, recommend adding these acceptance criteria:

### AC-BINARY: Binary Body Handling
> The upload-part endpoint MUST correctly receive binary data chunks up to `partSizeBytes` (configured at session creation). The handler MUST NOT attempt to parse the body as JSON.

### AC-PART-SIZE: Part Size Configuration
> The create-session endpoint MUST return `partSizeBytes` (default 5MB for Pro tier, 4MB for Hobby tier - PM decision required). All parts except the last MUST be exactly `partSizeBytes` in size.

### AC-BODY-LIMIT: Request Body Limit
> For upload-part endpoint, configure Vercel function to accept body up to `partSizeBytes + overhead` (recommend 6MB for 5MB parts). Add explicit `maxDuration` config for this endpoint.

### AC-IDEMPOTENT-PARTS: Part Upload Idempotency
> Uploading the same part number multiple times for a file MUST overwrite the previous part (upsert behavior). The ETag returned from S3 for the latest upload is stored.

### AC-SESSION-CLEANUP: Session Expiration Handling
> Sessions past `expiresAt` MUST be rejected for all operations. A separate cleanup job (STORY-018 or later) handles S3 orphan cleanup.

### AC-FINALIZE-LOCK: Finalize Lock Pattern
> Finalize MUST use two-phase locking (`finalizingAt` + `finalizedAt`) with configurable TTL for stale lock rescue (default 5 minutes).

### AC-VERCEL-CONFIG: Function Configuration
```json
"api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts": {
  "maxDuration": 30,
  "bodyParser": false
}
```

---

## 6. Specific Mitigations & PM Recommendations

### Mitigation 1: Vercel Body Parser Configuration

**Issue:** Vercel auto-parses JSON bodies by default, which corrupts binary data.

**Recommendation:** Disable body parser for upload-part endpoint:

In `vercel.json`:
```json
"functions": {
  "api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts": {
    "maxDuration": 30
  }
}
```

In handler, add export:
```typescript
export const config = {
  api: {
    bodyParser: false,
  },
}
```

### Mitigation 2: Part Size Decision

**Issue:** 5MB parts don't fit in 4.5MB Hobby tier limit.

**Recommendation:** Add AC requiring Pro tier OR implement 4MB parts with config:

```typescript
// In create-session handler
const DEFAULT_PART_SIZE_BYTES = process.env.VERCEL_ENV === 'production'
  ? 5 * 1024 * 1024  // 5MB for Pro
  : 4 * 1024 * 1024  // 4MB fallback
```

**PM Decision Required:** Document tier requirement in story or implement adaptive sizing.

### Mitigation 3: Core Package Extraction (Optional)

**Issue:** AWS handlers contain significant business logic that would benefit from reuse.

**Recommendation for MVP:** Inline logic in Vercel handlers (matches STORY-015/016 pattern). Extract to `@repo/moc-instructions-core` in follow-up story for full parity.

### Mitigation 4: Test Strategy

**Issue:** Binary uploads are difficult to test with HTTP files alone.

**Recommendation:** Add to TEST-PLAN:
1. Create small test file (<1MB) for Hobby tier testing
2. Split into 4MB chunks
3. Test full flow: create session -> register file -> upload parts -> complete file -> finalize

### Mitigation 5: Vercel Adapter Binary Support

**Issue:** Current `transformRequest()` in `@repo/vercel-adapter` handles JSON bodies but not binary.

**Recommendation:** Either:
- **Option A:** Extend adapter with `transformBinaryRequest()` function
- **Option B:** Handle binary parsing inline in upload-part handler (simpler, matches existing pattern)

Recommend Option B for this story to minimize scope.

---

## 7. Comparison: Presign Flow vs Multipart Session Flow

| Aspect | Presign (STORY-015/016) | Multipart Session (STORY-017) |
|--------|-------------------------|-------------------------------|
| Data path | Client -> S3 directly | Client -> Vercel -> S3 |
| Body size | Not constrained (presigned) | Limited by Vercel tier |
| Complexity | Lower | Higher |
| Progress tracking | Client-side only | Server-side via parts table |
| Resume support | No | Yes (re-upload failed parts) |
| Use case | Simple uploads | Large files, unreliable networks |

**PM Note:** If the primary use case is file uploads under 50MB with reliable connections, the presigned URL pattern from STORY-015/016 may be sufficient. Multipart sessions add complexity but enable:
- Upload progress tracking on server
- Resume after connection failures
- Part-level retry without re-uploading entire file

---

## 8. Blockers

### Potential Blocker: Vercel Tier

**Status: REQUIRES PM DECISION**

If the project is on Vercel Hobby tier:
- 5MB parts will fail (4.5MB body limit)
- 4MB parts work but increase total request count

**Resolution:** Either upgrade to Pro or implement 4MB part sizing.

### No Other Blockers Identified

All dependencies (database schema, S3 SDK, validation packages) are available.

---

## 9. Effort Estimate

| Component | LOC Estimate | Complexity |
|-----------|--------------|------------|
| Create session handler | ~100 | MEDIUM |
| Register file handler | ~100 | MEDIUM |
| Upload part handler | ~150 | **HIGH** (binary handling) |
| Complete file handler | ~80 | LOW |
| Finalize handler | ~250 | **HIGH** (reuse STORY-015 patterns) |
| Route config updates | ~20 | LOW |
| HTTP test additions | ~100 | LOW |
| **Total** | **~800 LOC** | **MEDIUM-HIGH** |

Complexity drivers:
- Binary body handling in upload-part
- Finalize lock pattern (but reusable from STORY-015)
- Multi-step session state coordination

---

## 10. Recommendation

**Implement STORY-017** with these preconditions:

1. **PM Decision:** Confirm Vercel tier (Pro recommended) OR accept 4MB part sizing
2. **AC Addition:** Add binary body handling AC
3. **AC Addition:** Add Vercel function config AC for body parser
4. **Test Strategy:** Include binary upload test plan

The implementation is feasible and follows established patterns from STORY-015/016. The main novel complexity is binary body handling, which is solvable with Vercel's body parser configuration.
