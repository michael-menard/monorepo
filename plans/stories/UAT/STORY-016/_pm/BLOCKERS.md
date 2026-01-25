# BLOCKERS: STORY-016 - MOC File Upload Management

## Status: NO BLOCKERS

All preconditions are met for STORY-016 implementation.

---

## Resolved Decisions

### 1. Download File Endpoint

**Question:** Index lists `download-file` but AWS implementation shows files are accessed via presigned URLs in get/list responses, not a dedicated download endpoint.

**Decision:** Download endpoint is **OUT OF SCOPE**. Files are accessible via presigned URLs returned in other responses. No dedicated download endpoint exists in AWS implementation.

---

### 2. Vercel Body Size Limit (4.5MB)

**Question:** How to handle multipart file uploads when Vercel has 4.5MB body limit but AWS allows 50MB?

**Decision:**
- Direct multipart uploads via `POST /api/mocs/:id/files` limited to **4MB per file**
- Files >4MB MUST use presigned URL pattern (edit-presign -> S3 direct -> edit-finalize)
- This is documented in AC and error messages guide users to correct pattern

---

### 3. Parts List Parser Location

**Question:** Where should parts list parsing logic live?

**Decision:** Extract to `@repo/moc-instructions-core` as `parsePartsList()` function. This maintains ports & adapters pattern and enables unit testing.

---

## Dependencies Confirmed

| Dependency | Status |
|------------|--------|
| STORY-015 (Initialize/Finalize) | `generated` - patterns available |
| `@repo/vercel-multipart` | Ready - package exists |
| `@repo/file-validator` | Ready - magic bytes validation |
| `@repo/rate-limit` | Ready - Postgres store |
| `@repo/moc-instructions-core` | Ready - will be extended |

---

## No Implementation Blockers

Story can proceed to implementation.
