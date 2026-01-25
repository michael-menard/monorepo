# DEV-FEASIBILITY: STORY-016 - MOC File Upload Management

## Summary

**Feasibility: IMPLEMENTABLE** with medium complexity

The story involves migrating 5 AWS Lambda handlers to Vercel serverless functions. All core dependencies exist or can be extended from STORY-015 patterns.

---

## Change Surface Analysis

### New Vercel Handlers (5)

| Handler | Route | Complexity | Notes |
|---------|-------|------------|-------|
| `upload-file.ts` | `POST /api/mocs/[id]/files` | **HIGH** | Multipart parsing, S3 upload, batch DB insert |
| `delete-file.ts` | `DELETE /api/mocs/[id]/files/[fileId]` | **LOW** | Simple soft-delete |
| `upload-parts-list.ts` | `POST /api/mocs/[id]/upload-parts-list` | **MEDIUM** | Multipart + CSV/XML parsing |
| `edit-presign.ts` | `POST /api/mocs/[id]/edit/presign` | **MEDIUM** | Presigned URL generation + rate limiting |
| `edit-finalize.ts` | `POST /api/mocs/[id]/edit/finalize` | **HIGH** | S3 validation, atomic transaction, file moves |

### Core Package Extensions

| Package | Function | Complexity |
|---------|----------|------------|
| `@repo/moc-instructions-core` | `uploadMocFile()` | **MEDIUM** - Extract from AWS service |
| `@repo/moc-instructions-core` | `uploadMocFilesParallel()` | **MEDIUM** - Parallel S3 uploads |
| `@repo/moc-instructions-core` | `deleteMocFile()` | **LOW** - Soft delete logic |
| `@repo/moc-instructions-core` | `uploadPartsList()` | **MEDIUM** - Parse CSV/XML + DB update |
| `@repo/moc-instructions-core` | `editPresign()` | **MEDIUM** - Reuse STORY-015 patterns |
| `@repo/moc-instructions-core` | `editFinalize()` | **HIGH** - Atomic transaction + S3 moves |

---

## Dependency Analysis

### Existing Packages to Reuse

| Package | Usage | Status |
|---------|-------|--------|
| `@repo/logger` | Structured logging | Ready |
| `@repo/rate-limit` | Rate limiting with Postgres store | Ready |
| `@repo/file-validator` | Magic bytes + file validation | Ready |
| `@repo/vercel-multipart` | Multipart parsing for Vercel | Ready |
| `@repo/moc-instructions-core` | Initialize/Finalize patterns from STORY-015 | Ready |

### New Dependencies Required

| Package | Reason |
|---------|--------|
| `busboy` | Already in use via `@repo/vercel-multipart` |

### Parts List Parsing

The AWS handler imports from `@/endpoints/moc-instructions/_shared/parts-list-parser`. This logic needs to be:
1. **Option A:** Extracted to `@repo/moc-instructions-core` (RECOMMENDED)
2. **Option B:** Inlined in the Vercel handler (NOT RECOMMENDED - duplication)

**PM Decision:** Extract parts list parsing to `@repo/moc-instructions-core`.

---

## Risk Assessment

### HIGH RISK Items

| Risk | Mitigation |
|------|------------|
| **Multipart body limits on Vercel** | Vercel has 4.5MB body limit for serverless functions. Files >4.5MB MUST use presigned URL pattern (client uploads directly to S3). STORY-015 established this pattern. upload-file endpoint should validate size or reject. |
| **Edit finalize transaction complexity** | Atomic transaction spans DB updates + S3 moves. Test rollback scenarios. Follow STORY-015 finalize pattern. |
| **S3 file move on finalize** | Files move from `/edit/` to permanent path. If copy+delete fails, orphans remain. Rely on cleanup job (STORY-018). |

### MEDIUM RISK Items

| Risk | Mitigation |
|------|------------|
| **Rate limiting shared across edit/upload** | Both endpoints share `moc-upload` rate limit key. Verify STORY-015 implementation is correct. |
| **Magic bytes validation** | Edit finalize downloads first 8KB from S3 to validate. Network latency may affect response times. |
| **Parts list parsing edge cases** | CSV/XML parsing has many edge cases. Ensure comprehensive error handling. |

### LOW RISK Items

| Risk | Mitigation |
|------|------------|
| **Soft delete consistency** | Delete endpoint sets `deletedAt`, not hard delete. Consistent with existing pattern. |
| **Auth patterns** | AUTH_BYPASS for local dev established in STORY-015. |

---

## Vercel Body Size Constraint

**Critical Constraint:** Vercel serverless functions have a **4.5MB request body limit**.

The AWS `upload-file` handler accepts multipart uploads up to 50MB. This will NOT work on Vercel.

**PM Decision for STORY-016:**
- `POST /api/mocs/:id/files` - **DEPRECATED for direct uploads**
- All file uploads MUST use the presigned URL pattern (edit-presign -> client S3 upload -> edit-finalize)
- The upload-file endpoint can remain for small files (<4MB) but documentation should discourage direct multipart uploads

**Alternative:** Keep upload-file for backward compatibility but limit to 4MB per file with clear error message.

---

## Hidden Dependencies Identified

1. **Parts list parser** - `parsePartsListFile()` from AWS codebase needs migration
2. **Filename sanitizer** - `sanitizeFilenameForS3()` already in `core/utils/`
3. **Upload config** - `getUploadConfig()` returns limits from environment
4. **MOC service cache invalidation** - `invalidateMocDetailCache()` - verify if needed for Vercel

---

## Missing AC (Recommendations)

Based on AWS implementation review, recommend adding:

1. **AC: Partial success for multi-file upload** - When some files succeed and others fail, return 200 with both `uploaded[]` and `failed[]` arrays
2. **AC: Edit presign category limits** - Maximum files per category enforced (from config)
3. **AC: Edit finalize S3 cleanup on transaction failure** - Best-effort cleanup of edit/ files if DB transaction fails

---

## Implementation Approach Recommendation

### Phase 1: Core Package Functions
1. Add `deleteMocFile()` to `@repo/moc-instructions-core` (simple)
2. Add `uploadPartsList()` with parts parser extraction (medium)
3. Add `editPresign()` and `editFinalize()` (reuse STORY-015 patterns)

### Phase 2: Vercel Handlers
1. `delete-file.ts` (simple, low risk)
2. `upload-parts-list.ts` (medium, uses multipart + parser)
3. `edit-presign.ts` (medium, follows STORY-015)
4. `edit-finalize.ts` (complex, transaction + S3)
5. `upload-file.ts` (complex, size-limited or deprecated)

### Phase 3: HTTP Tests
Add all requests to `__http__/mocs.http` under STORY-016 section.

---

## Blockers

**None identified.** All dependencies are available or can be derived from existing code.

The Vercel body size constraint is a technical limitation that requires a design decision (already made above), not a blocker.
