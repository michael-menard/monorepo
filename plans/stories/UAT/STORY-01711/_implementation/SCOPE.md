# Scope - STORY-01711: Session & File Management - CRUD Only

## Summary

Migrate 3 multipart upload session management endpoints from AWS Lambda to Vercel serverless functions while maintaining full API compatibility.

## Endpoints to Implement

| Method | Route | Handler File | Purpose |
|--------|-------|--------------|---------|
| POST | `/api/mocs/uploads/sessions` | `sessions/index.ts` | Create upload session |
| POST | `/api/mocs/uploads/sessions/:sessionId/files` | `sessions/[sessionId]/files/index.ts` | Register file within session |
| POST | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` | `sessions/[sessionId]/files/[fileId]/complete.ts` | Complete file upload |

## Files to Create

1. `apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts`
2. `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts`
3. `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts`
4. `__http__/story-01711-session-crud.http` (test file)

## Files to Modify

1. `apps/api/platforms/vercel/vercel.json` (add route rewrites)

## Patterns to Follow

- Singleton DB client pattern (as in `gallery/albums/index.ts`)
- Singleton S3 client pattern (as in `mocs/with-files/initialize.ts`)
- Inline Zod schemas (not importing from AWS schemas)
- `mapErrorToStatus()` helper for error code to HTTP status mapping
- `getAuthUserId()` helper with AUTH_BYPASS support
- `@repo/logger` for logging
- `@repo/rate-limit` for rate limiting

## Database Tables Used (No Schema Changes)

- `upload_sessions` - Session state, TTL, finalization state
- `upload_session_files` - Files with S3 keys and multipart upload IDs
- `upload_session_parts` - Part ETags for multipart completion (read-only in this story)

## Out of Scope

- Binary part upload handling (STORY-0172)
- Session finalization and MOC creation (STORY-0172)
- Advanced features (STORY-01712)
- S3 lifecycle policies (STORY-018)
