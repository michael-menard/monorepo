# STORY-013: MOC Instructions - Edit (No Files)
## Implementation Plan

---

# Scope Surface

- **backend/API**: YES - New Vercel serverless handler for PATCH /api/mocs/:id
- **frontend/UI**: NO - No UI changes; existing RTK Query mutation unchanged
- **infra/config**: YES - vercel.json rewrite rule addition
- **notes**: This is a backend-only story migrating the AWS Lambda edit endpoint to Vercel. OpenSearch re-indexing is deferred per STORY-011 decision. Keep handler inline per STORY-011/012 pattern.

---

# Acceptance Criteria Checklist

- [ ] AC-1: 401 UNAUTHORIZED without valid authentication; AUTH_BYPASS uses DEV_USER_SUB
- [ ] AC-2: 404 NOT_FOUND for non-existent/invalid UUID MOC; 403 FORBIDDEN for other user's MOC
- [ ] AC-3: 400 VALIDATION_ERROR for empty body, invalid title/description/tags/slug, unknown fields, malformed JSON
- [ ] AC-4: 409 CONFLICT with `suggestedSlug` for slug conflicts; same slug as current MOC does NOT conflict
- [ ] AC-5: 200 OK with updated MOC data; partial updates work; nullable fields can be set to null; always updates `updatedAt`
- [ ] AC-6: Error responses use `{ error: { code, message } }` structure; success uses `{ success: true, data: { ... } }`
- [ ] AC-7: `__http__/mocs.http` updated with all PATCH request examples

---

# Files To Touch (Expected)

| File | Action | Description |
|------|--------|-------------|
| `apps/api/platforms/vercel/api/mocs/[id]/edit.ts` | CREATE | New Vercel handler for PATCH /api/mocs/:id |
| `apps/api/platforms/vercel/vercel.json` | MODIFY | Add rewrite rule for `/api/mocs/:id/edit` |
| `__http__/mocs.http` | MODIFY | Add PATCH request examples for all test cases |

**Total: 1 new file, 2 modified files**

---

# Reuse Targets

| Package/Module | Usage |
|---------------|-------|
| `@repo/logger` | Logging in handler |
| `@repo/upload-types` | `findAvailableSlug` function for slug conflict resolution |
| `pg` + `drizzle-orm/node-postgres` | Database access (same pattern as existing handlers) |
| `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | Handler structure template (auth bypass, DB singleton, error responses) |
| `apps/api/platforms/aws/endpoints/moc-instructions/edit/handler.ts` | Validation schemas, business logic reference |

---

# Architecture Notes (Ports & Adapters)

## Handler Structure (Adapter Layer)
The Vercel handler at `api/mocs/[id]/edit.ts` is an adapter that:
1. Validates HTTP method (PATCH only)
2. Extracts auth via AUTH_BYPASS pattern
3. Parses and validates request body using Zod
4. Performs ownership verification
5. Handles slug conflict detection with suggestion
6. Updates database and returns response

## Database Schema (already exists)
The `moc_instructions` table schema is already defined inline in existing handlers. Copy the same pattern.

## No Core Package
Per STORY-011/012 pattern, keep all logic inline in the handler. Do NOT extract to `moc-instructions-core` package.

## Boundaries to Protect
- OpenSearch integration: SKIP entirely (deferred per STORY-011)
- Status updates: NOT part of this endpoint (separate operation)
- File operations: NOT part of this endpoint

---

# Step-by-Step Plan (Small Steps)

## Step 1: Create edit.ts handler file with boilerplate
**Objective**: Scaffold the handler file with imports, schema definitions, DB singleton, and auth pattern
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: File exists, TypeScript compilation passes on the new file

## Step 2: Implement request validation with Zod
**Objective**: Define `PatchMocRequestSchema` with all validation rules from AC-3:
- title: optional, min 1, max 100
- description: optional, nullable, max 2000
- tags: optional, nullable, array max 10, each tag max 30
- theme: optional, nullable, max 50
- slug: optional, regex `/^[a-z0-9-]+$/`, max 100
- `.strict()` to reject unknown fields
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: Run `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit.ts --fix`

## Step 3: Implement authentication and authorization checks
**Objective**:
- Return 401 if no auth (AUTH_BYPASS not set or DEV_USER_SUB missing)
- Validate MOC ID is valid UUID (return 404 for invalid format)
- Query MOC exists (return 404 if not found)
- Verify ownership (return 403 if not owner)
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: Run `pnpm check-types --filter api-vercel`

## Step 4: Implement empty body and JSON parsing validation
**Objective**:
- Return 400 "Invalid JSON" for malformed JSON
- Return 400 VALIDATION_ERROR for empty body or body with no updatable fields
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: TypeScript compilation passes

## Step 5: Implement slug conflict detection with suggestion
**Objective**:
- If slug is being updated, check for conflicts within owner's MOCs (excluding current MOC)
- If conflict exists, query all user's slugs and use `findAvailableSlug` to generate suggestion
- Return 409 CONFLICT with `suggestedSlug` field
- Updating slug to same value as current MOC should NOT conflict
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: Run `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit.ts`

## Step 6: Implement database update logic
**Objective**:
- Build update object with only provided fields
- Always set `updatedAt` to current timestamp
- Execute update with `.returning()` to get updated record
- Handle potential update failure
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: TypeScript compilation passes

## Step 7: Implement response formatting
**Objective**:
- Format successful response with `{ success: true, data: { ... } }`
- Include: id, title, description, slug, tags, theme, status, updatedAt
- Format error responses with `{ error: { code, message } }` structure
**Files**: `apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
**Verification**: Run `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit.ts --fix`

## Step 8: Add vercel.json rewrite rule
**Objective**: Add rewrite for `/api/mocs/:id/edit` -> `/api/mocs/[id]/edit.ts`
- Must be placed BEFORE the existing `/api/mocs/:id` rule (route order matters)
**Files**: `apps/api/platforms/vercel/vercel.json`
**Verification**: JSON is valid (`node -e "require('./apps/api/platforms/vercel/vercel.json')"`)

## Step 9: Add HTTP contract requests for happy path
**Objective**: Add PATCH requests to `__http__/mocs.http`:
- `patchMocTitle` - Update title only (200)
- `patchMocMultipleFields` - Update title, description, tags (200)
- `patchMocSlug` - Update slug (200)
- `patchMocNullDescription` - Set description to null (200)
- `patchMocNullTags` - Set tags to null (200)
**Files**: `__http__/mocs.http`
**Verification**: File syntax is correct

## Step 10: Add HTTP contract requests for error cases
**Objective**: Add PATCH requests for error scenarios:
- `patchMoc401` - Without auth (401)
- `patchMoc403` - Other user's MOC (403)
- `patchMoc404` - Non-existent MOC (404)
- `patchMocEmptyBody` - Empty body (400)
- `patchMocSlugConflict` - Conflicting slug (409)
- `patchMocInvalidSlug` - Invalid slug format (400)
- `patchMocTitleTooLong` - Title > 100 chars (400)
**Files**: `__http__/mocs.http`
**Verification**: File syntax is correct

## Step 11: Run scoped verification
**Objective**: Verify implementation passes all checks
**Files**: All files touched
**Verification**:
- `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit.ts`
- `pnpm check-types --filter "@repo/api-vercel..."`
- Verify vercel.json is valid JSON

## Step 12: Manual HTTP contract testing
**Objective**: Execute HTTP requests against local Vercel dev server
**Files**: `__http__/mocs.http`
**Verification**: All requests return expected status codes and response bodies

---

# Test Plan

## Automated Commands

| Command | Scope | Purpose |
|---------|-------|---------|
| `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit.ts` | New handler | Lint check |
| `pnpm check-types --filter "@repo/api-vercel..."` | Vercel API | Type check |
| `node -e "require('./apps/api/platforms/vercel/vercel.json')"` | Config | JSON validation |

## Manual HTTP Testing (Required)

Start local dev server:
```bash
cd apps/api/platforms/vercel && pnpm vercel dev --listen 3001
```

Execute requests from `__http__/mocs.http`:
| Request | Expected Status | Key Assertions |
|---------|-----------------|----------------|
| patchMocTitle | 200 | `success: true`, title updated |
| patchMocMultipleFields | 200 | All fields updated |
| patchMocSlug | 200 | Slug updated |
| patchMocNullDescription | 200 | `description: null` |
| patchMoc401 | 401 | `error.code: "UNAUTHORIZED"` |
| patchMoc403 | 403 | `error.code: "FORBIDDEN"` |
| patchMoc404 | 404 | `error.code: "NOT_FOUND"` |
| patchMocEmptyBody | 400 | `error.code: "VALIDATION_ERROR"` |
| patchMocSlugConflict | 409 | `suggestedSlug` present |
| patchMocInvalidSlug | 400 | `error.code: "VALIDATION_ERROR"` |

## Playwright
**NOT APPLICABLE** - No UI changes in this story.

---

# Stop Conditions / Blockers

**None identified.**

All dependencies are available:
- `@repo/upload-types` with `findAvailableSlug` exists
- Existing Vercel handler patterns established in STORY-011/012
- AWS Lambda reference implementation exists
- Seed data for testing (MOCs with deterministic IDs) exists
- vercel.json structure is understood

---

# Notes from Lessons Learned

1. **Run scoped lint early** (STORY-010): Execute `pnpm eslint <new-files> --fix` after each step to catch Prettier issues
2. **Handler patterns reusable** (STORY-010): Copy auth bypass, DB singleton pattern from existing handlers
3. **Route order matters** (STORY-007): Place specific route (`/api/mocs/:id/edit`) BEFORE parameterized route (`/api/mocs/:id`)
4. **No core package extraction** (STORY-011/012): Keep handler inline
5. **HTTP contract completeness** (STORY-008): Plan for 12+ HTTP requests covering all AC scenarios
6. **Pre-existing monorepo failures** (STORY-010): Use scoped verification, don't investigate unrelated failures
