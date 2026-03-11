# TEST-PLAN: STORY-016 - MOC File Upload Management

## Overview

This test plan covers 6 endpoints for MOC file management:
1. `POST /api/mocs/:id/files` - Upload file(s) to MOC
2. `DELETE /api/mocs/:id/files/:fileId` - Delete file from MOC
3. `POST /api/mocs/:id/upload-parts-list` - Upload and parse parts list
4. `POST /api/mocs/:id/edit/presign` - Generate presigned URLs for edit mode
5. `POST /api/mocs/:id/edit/finalize` - Finalize edit with file changes

**Note:** `download-file` endpoint mentioned in index is NOT present in AWS handlers. Only the 5 above exist. PM decides: download is OUT OF SCOPE for this story (files are accessed via presigned URLs in get/list responses).

---

## Happy Path Tests

| ID | Endpoint | Test | Expected | HTTP Reference |
|----|----------|------|----------|----------------|
| HP-1 | upload-file | Single file upload with multipart | 201, file record with S3 URL | `#uploadSingleFile` |
| HP-2 | upload-file | Multi-file upload (2-10 files) | 200, uploaded[] array with all files | `#uploadMultipleFiles` |
| HP-3 | upload-file | Upload with per-file fileType mapping | 200, correct types assigned | `#uploadWithFileTypes` |
| HP-4 | delete-file | Delete existing file | 200, success message | `#deleteFile` |
| HP-5 | upload-parts-list | Upload CSV parts list | 201, parsed pieces count | `#uploadPartsListCsv` |
| HP-6 | upload-parts-list | Upload XML parts list | 201, parsed pieces count | `#uploadPartsListXml` |
| HP-7 | edit-presign | Request presigned URLs for edit | 200, files[] with uploadUrl | `#editPresignSingle` |
| HP-8 | edit-presign | Request multiple file presigns | 200, all URLs generated | `#editPresignMultiple` |
| HP-9 | edit-finalize | Finalize with metadata + files | 200, updated MOC data | `#editFinalizeSuccess` |
| HP-10 | edit-finalize | Finalize metadata only (no files) | 200, metadata updated | `#editFinalizeMetadataOnly` |
| HP-11 | edit-finalize | Finalize with file removals | 200, files soft-deleted | `#editFinalizeWithRemovals` |

---

## Error Cases

| ID | Endpoint | Test | Expected | HTTP Reference |
|----|----------|------|----------|----------------|
| ERR-1 | upload-file | No auth | 401 UNAUTHORIZED | `#uploadFileNoAuth` |
| ERR-2 | upload-file | Not MOC owner | 403 FORBIDDEN | `#uploadFileForbidden` |
| ERR-3 | upload-file | MOC not found | 404 NOT_FOUND | `#uploadFileNotFound` |
| ERR-4 | upload-file | No files in multipart | 400 BAD_REQUEST | `#uploadFileNoFiles` |
| ERR-5 | upload-file | >10 files | 400 BAD_REQUEST | `#uploadFileTooMany` |
| ERR-6 | upload-file | Missing fileType field | 400 BAD_REQUEST | `#uploadFileMissingType` |
| ERR-7 | upload-file | Invalid content type | 400 BAD_REQUEST | `#uploadFileInvalidContentType` |
| ERR-8 | delete-file | No auth | 401 UNAUTHORIZED | `#deleteFileNoAuth` |
| ERR-9 | delete-file | Not MOC owner | 403 FORBIDDEN | `#deleteFileForbidden` |
| ERR-10 | delete-file | MOC not found | 404 NOT_FOUND | `#deleteFileMocNotFound` |
| ERR-11 | delete-file | File not found | 404 NOT_FOUND | `#deleteFileNotFound` |
| ERR-12 | delete-file | File from wrong MOC | 404 NOT_FOUND | `#deleteFileWrongMoc` |
| ERR-13 | upload-parts-list | No auth | 401 UNAUTHORIZED | `#uploadPartsListNoAuth` |
| ERR-14 | upload-parts-list | Not MOC owner | 403 FORBIDDEN | `#uploadPartsListForbidden` |
| ERR-15 | upload-parts-list | MOC not found | 404 NOT_FOUND | `#uploadPartsListNotFound` |
| ERR-16 | upload-parts-list | Parse error (invalid CSV) | 400/422 VALIDATION_ERROR | `#uploadPartsListInvalid` |
| ERR-17 | upload-parts-list | No file provided | 400 BAD_REQUEST | `#uploadPartsListNoFile` |
| ERR-18 | edit-presign | No auth | 401 UNAUTHORIZED | `#editPresignNoAuth` |
| ERR-19 | edit-presign | Not MOC owner | 403 FORBIDDEN | `#editPresignForbidden` |
| ERR-20 | edit-presign | MOC not found | 404 NOT_FOUND | `#editPresignNotFound` |
| ERR-21 | edit-presign | Empty files array | 400 VALIDATION_ERROR | `#editPresignNoFiles` |
| ERR-22 | edit-presign | >20 files | 400 VALIDATION_ERROR | `#editPresignTooMany` |
| ERR-23 | edit-presign | Invalid MIME type | 415 INVALID_MIME_TYPE | `#editPresignInvalidMime` |
| ERR-24 | edit-presign | File too large | 413 FILE_TOO_LARGE | `#editPresignFileTooLarge` |
| ERR-25 | edit-presign | Rate limited | 429 RATE_LIMIT_EXCEEDED | `#editPresignRateLimited` |
| ERR-26 | edit-finalize | No auth | 401 UNAUTHORIZED | `#editFinalizeNoAuth` |
| ERR-27 | edit-finalize | Not MOC owner | 403 FORBIDDEN | `#editFinalizeForbidden` |
| ERR-28 | edit-finalize | MOC not found | 404 NOT_FOUND | `#editFinalizeNotFound` |
| ERR-29 | edit-finalize | Concurrent edit (stale updatedAt) | 409 CONCURRENT_EDIT | `#editFinalizeConcurrent` |
| ERR-30 | edit-finalize | File not in S3 | 400 VALIDATION_ERROR | `#editFinalizeFileMissing` |
| ERR-31 | edit-finalize | Magic bytes mismatch | 400 VALIDATION_ERROR | `#editFinalizeMagicBytesFail` |
| ERR-32 | edit-finalize | Rate limited | 429 RATE_LIMIT_EXCEEDED | `#editFinalizeRateLimited` |
| ERR-33 | edit-finalize | removedFileIds from wrong MOC | 403 FORBIDDEN | `#editFinalizeWrongMocFiles` |

---

## Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | Upload file with unicode filename | 201, filename sanitized in S3 key |
| EDGE-2 | Upload file with path traversal in filename | 201, safe S3 key (no ../) |
| EDGE-3 | Multi-file upload with partial failures | 200, uploaded[] + failed[] arrays |
| EDGE-4 | Delete already-deleted file (soft-delete) | 404 NOT_FOUND |
| EDGE-5 | Edit presign then finalize with no actual uploads | 200, no new files added |
| EDGE-6 | Edit finalize moves files from edit/ to permanent path | Files accessible at permanent URL |
| EDGE-7 | Parts list with various CSV column headers | 201, auto-detected columns |
| EDGE-8 | Parts list edge: empty file | 400 VALIDATION_ERROR |
| EDGE-9 | Parts list edge: 0 parts count | 201, totalPieceCount=0 |
| EDGE-10 | Edit finalize with stale lock rescue | 200, lock rescued after TTL |
| EDGE-11 | Multiple edit presign calls before finalize | Latest presign URLs valid |
| EDGE-12 | Edit finalize cleanup on transaction failure | S3 edit files cleaned up |

---

## Evidence Requirements

### Unit Tests
- `pnpm test packages/backend/moc-instructions-core` - all pass
- Coverage for new functions: `uploadFile`, `deleteFile`, `uploadPartsList`, `editPresign`, `editFinalize`

### HTTP Executions
- All `#story016*` requests executed in `/__http__/mocs.http`
- Captured responses with status codes and key JSON fields

### Database Verification
- After `uploadFile`: `moc_files` record exists with correct `mocId`, `fileType`, `fileUrl`
- After `deleteFile`: `moc_files` record has `deletedAt` populated (soft delete)
- After `uploadPartsList`: `moc_parts_lists` record exists, `moc_instructions.totalPieceCount` updated
- After `editFinalize`: `moc_instructions.updatedAt` changed, new files in `moc_files`, removed files have `deletedAt`

### S3 Verification
- After `uploadFile`: Object exists at expected S3 key
- After `editFinalize`: Files moved from `edit/` path to permanent path
- Edit cleanup: Orphaned edit files deleted on transaction failure

---

## Test Dependencies

### Seed Data Required
- MOC owned by dev user (for happy path tests)
- MOC owned by other user (for 403 tests)
- MOC with existing files (for delete tests)
- MOC in draft status (for finalize tests)

### Environment
- `AUTH_BYPASS=true` for local testing
- `MOC_BUCKET` or `LEGO_API_BUCKET_NAME` configured
- PostgreSQL with `moc_instructions`, `moc_files`, `moc_parts_lists` tables

---

## Blockers

None identified. All dependencies from STORY-015 (initialize/finalize pattern) are in place.
