# PROOF-BUGF-032: Frontend Integration for Presigned URL Upload

## Story Summary

**Story:** BUGF-032
**Title:** Frontend Integration for Presigned URL Upload
**Status:** ready-for-qa
**Split From:** BUGF-001 (Part 2 of 2 - Frontend)

## Implementation Summary

Integrated the presigned URL API into frontend upload pages, replacing mock implementations with real API calls using RTK Query.

### Files Created (3)

| File | Lines | Purpose |
|------|-------|---------|
| `packages/core/api-client/src/rtk/uploads-api.ts` | 51 | RTK Query mutation slice with `useGeneratePresignedUrlMutation` |
| `packages/core/api-client/src/schemas/uploads.ts` | 39 | Zod schemas for request/response validation |
| `packages/core/api-client/src/rtk/__tests__/uploads-api.test.ts` | 155 | 16 unit tests for schema validation |

### Files Modified (6)

| File | Lines Changed | Purpose |
|------|--------------|---------|
| `packages/core/api-client/src/config/endpoints.ts` | 3 | Added `UPLOADS.GENERATE_PRESIGNED_URL` endpoint |
| `packages/core/api-client/src/index.ts` | 4 | Export `uploadsApi` and mutation hook |
| `packages/core/api-client/package.json` | 8 | Sub-path exports for RTK API and schemas |
| `apps/web/main-app/src/store/index.ts` | 4 | Register uploadsApi reducer, middleware, auth reset |
| `apps/web/app-instructions-gallery/src/pages/upload-page.tsx` | 65 | Real presigned URL API integration |
| `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx` | 65 | Same integration as upload-page.tsx |

## Acceptance Criteria Verification

### AC3: End-to-End Upload Flow in UI - IMPLEMENTED

**Evidence:**
- `useGeneratePresignedUrlMutation` wired into `handleFileSelect` in both upload pages
- Real API call to `/uploads/presigned-url` replaces mock implementation
- Zod schema validates API response at runtime
- Error handling maps HTTP status codes (401, 400, 413, 500) to user-friendly messages
- API error banner with dismiss functionality
- Loading spinner (Loader2) during presigned URL generation
- File upload buttons disabled during API calls

### AC7: Handle Expired Presigned URL - IMPLEMENTED

**Evidence:**
- Session refresh handler filters expired/failed files from `uploadManager.state.files`
- Calls `generatePresignedUrl` mutation for each expired file using stored metadata
- Collects URL updates and applies via `uploadManager.updateFileUrls()`
- Calls `uploadManager.retryAll()` to restart uploads with new URLs
- Error handling with user-friendly messages on refresh failure

## Build Verification

| Check | Result |
|-------|--------|
| TypeScript compilation | PASS |
| ESLint | PASS |
| Build (api-client) | PASS (8.10s) |
| Unit tests | 16/16 PASS |
| E2E tests | EXEMPT (split to BUGF-051) |

## Code Review

**Verdict:** PASS
- Follows CLAUDE.md standards (Zod-first types, RTK Query patterns, @repo/logger)
- No security issues (JWT auth, no hardcoded secrets, URL validation)
- No blocking issues found

## E2E Gate

**Status:** EXEMPT
**Reason:** E2E tests split to BUGF-051 - requires live backend (BUGF-031) deployment
**Split Story:** BUGF-051 (E2E Tests for Presigned URL Upload Flow)

## Conclusion

BUGF-032 implementation is complete. Both acceptance criteria are fully implemented with proper error handling, loading states, and session refresh functionality. 16 unit tests validate all schema paths. E2E tests deferred to BUGF-051.
