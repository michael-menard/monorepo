---
status: uat
---

# STORY-013: MOC Instructions - Edit (No Files)

## 1. Title

Migrate MOC Instructions edit endpoint (PATCH) from AWS Lambda to Vercel serverless function.

---

## 2. Context

The Vercel migration is progressing through the API surface. STORY-011 established MOC Instructions read operations and STORY-012 established gallery linking. This story migrates the metadata edit endpoint, enabling users to update MOC title, description, tags, theme, and slug.

The AWS Lambda handler at `apps/api/platforms/aws/endpoints/moc-instructions/edit/handler.ts` implements:
- Partial metadata updates (any combination of title, description, tags, theme, slug)
- Slug uniqueness validation within owner scope (409 with suggestion on conflict)
- Owner-only access (401/403/404)
- Strict schema validation (unknown fields rejected)
- Always updates `updatedAt` timestamp

The AWS handler also performs OpenSearch re-indexing after successful updates, but this is fail-open behavior. Per STORY-011 decision, OpenSearch integration is deferred for Vercel MVP.

---

## 3. Goal

Enable editing MOC metadata via Vercel serverless function with identical API behavior to the existing AWS Lambda implementation (minus OpenSearch re-indexing which is deferred).

---

## 4. Non-Goals

- **OpenSearch re-indexing**: Deferred per STORY-011. Reconciliation job will catch up when OpenSearch is added.
- **Status updates**: Editing `status` field is not part of this endpoint (publish/archive are separate operations).
- **File uploads**: No file operations in this story.
- **Core package extraction**: Keep handler inline per STORY-011/012 pattern.
- **UI changes**: No frontend modifications. Existing RTK Query mutation continues to work unchanged.

---

## 5. Scope

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| PATCH | `/api/mocs/:id` | Edit MOC | Partial metadata update |

### Packages/Apps Affected

| Location | Change Type |
|----------|-------------|
| `apps/api/platforms/vercel/api/mocs/[id]/edit.ts` | NEW - Vercel handler |
| `apps/api/platforms/vercel/vercel.json` | MODIFY - add route rewrite |
| `__http__/mocs.http` | MODIFY - add PATCH requests |

---

## 6. Acceptance Criteria

### AC-1: Authentication Required

- [ ] `PATCH /api/mocs/:id` returns 401 UNAUTHORIZED without valid authentication
- [ ] With `AUTH_BYPASS=true`, uses `DEV_USER_SUB` environment variable as user ID
- [ ] Invalid/expired JWT tokens return 401 (when AUTH_BYPASS is false)

### AC-2: Ownership Validation

- [ ] Returns 404 NOT_FOUND for non-existent MOC ID (same as invalid UUID format)
- [ ] Returns 403 FORBIDDEN when attempting to edit another user's MOC
- [ ] Returns 404 for invalid UUID format (not 400, to prevent existence leak)

### AC-3: Request Validation

- [ ] Returns 400 VALIDATION_ERROR when request body is empty or has no updatable fields
- [ ] Returns 400 VALIDATION_ERROR when title exceeds 100 characters
- [ ] Returns 400 VALIDATION_ERROR when title is empty string
- [ ] Returns 400 VALIDATION_ERROR when description exceeds 2000 characters
- [ ] Returns 400 VALIDATION_ERROR when more than 10 tags are provided
- [ ] Returns 400 VALIDATION_ERROR when any tag exceeds 30 characters
- [ ] Returns 400 VALIDATION_ERROR when slug contains invalid characters (only lowercase, numbers, hyphens allowed)
- [ ] Returns 400 VALIDATION_ERROR when slug exceeds 100 characters
- [ ] Returns 400 VALIDATION_ERROR when unknown fields are present in request body (strict schema)
- [ ] Returns 400 "Invalid JSON" when request body is malformed JSON

### AC-4: Slug Conflict Handling

- [ ] Returns 409 CONFLICT when requested slug is already used by another of the user's MOCs
- [ ] 409 response includes `suggestedSlug` field with next available slug (e.g., `slug-2`, `slug-3`)
- [ ] Uses `findAvailableSlug` from `@repo/upload-types` for slug suggestion generation
- [ ] Updating slug to the same value as current MOC does NOT cause conflict

### AC-5: Successful Updates

- [ ] Returns 200 OK with updated MOC data on success
- [ ] Supports partial updates (only provided fields are updated)
- [ ] Supports setting nullable fields (description, tags, theme) to `null`
- [ ] Always updates `updatedAt` timestamp on successful update
- [ ] Response includes: `id`, `title`, `description`, `slug`, `tags`, `theme`, `status`, `updatedAt`

### AC-6: Error Response Format

- [ ] All error responses use standard codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`
- [ ] Error responses include `{ error: { code, message } }` structure
- [ ] Success responses include `{ success: true, data: { ... } }` structure

### AC-7: HTTP Contract Verification

- [ ] `__http__/mocs.http` updated with all PATCH request examples
- [ ] All happy path and error case requests documented and executable

---

## 7. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in handler |
| `@repo/upload-types` | `findAvailableSlug` function for slug conflict resolution |
| `pg` + `drizzle-orm/node-postgres` | Database access |

### Patterns to Reuse

| Pattern Source | Usage |
|---------------|-------|
| `apps/api/platforms/vercel/api/mocs/[id].ts` | Handler structure, auth bypass, DB singleton |
| `apps/api/platforms/aws/endpoints/moc-instructions/edit/handler.ts` | Validation schemas, business logic |

### Prohibited Patterns

- Do NOT extract to `moc-instructions-core` package (keep inline per STORY-011 pattern)
- Do NOT implement OpenSearch re-indexing (deferred)
- Do NOT implement JWT validation (use AUTH_BYPASS for dev; JWT validation is a separate infra concern)

---

## 8. Architecture Notes (Ports & Adapters)

```
+-------------------------------------------------------------+
|                    Vercel Handler (Adapter)                  |
|  apps/api/platforms/vercel/api/mocs/[id]/edit.ts             |
|                                                              |
|  - Validate method is PATCH                                  |
|  - Extract auth (AUTH_BYPASS)                                |
|  - Parse and validate request body (Zod)                     |
|  - Verify MOC exists and ownership                           |
|  - Check slug uniqueness (if slug changed)                   |
|  - Update database                                           |
|  - Return JSON response                                      |
+------------------------------+-------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Database (Infrastructure)                 |
|  packages/backend/db                                         |
|                                                              |
|  - moc_instructions table                                    |
|  - userId column for ownership                               |
|  - slug column with no unique constraint (app-level check)   |
+-------------------------------------------------------------+
```

---

## 9. Required Vercel / Infra Notes

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | YES |
| `AUTH_BYPASS` | Enable dev auth bypass (dev only) | DEV ONLY |
| `DEV_USER_SUB` | Mock user ID for bypass | DEV ONLY |

### Vercel Configuration

Add to `apps/api/platforms/vercel/vercel.json` rewrites array:

```json
{ "source": "/api/mocs/:id/edit", "destination": "/api/mocs/[id]/edit" }
```

**Alternative**: Handle PATCH method in existing `[id].ts` file. Either approach is acceptable.

---

## 10. HTTP Contract Plan

### Required `.http` Requests

| Request Name | Method | Description | Expected |
|--------------|--------|-------------|----------|
| `patchMocTitle` | PATCH | Update title only | 200 |
| `patchMocMultipleFields` | PATCH | Update title, description, tags | 200 |
| `patchMocSlug` | PATCH | Update slug | 200 |
| `patchMocNullDescription` | PATCH | Set description to null | 200 |
| `patchMocNullTags` | PATCH | Set tags to null | 200 |
| `patchMoc401` | PATCH | Without auth (mock) | 401 |
| `patchMoc403` | PATCH | Other user's MOC | 403 |
| `patchMoc404` | PATCH | Non-existent MOC | 404 |
| `patchMocEmptyBody` | PATCH | Empty body | 400 |
| `patchMocSlugConflict` | PATCH | Conflicting slug | 409 |
| `patchMocInvalidSlug` | PATCH | Invalid slug format | 400 |
| `patchMocTitleTooLong` | PATCH | Title > 100 chars | 400 |

### Evidence Requirements

QA Verify MUST capture:
1. Response status code for all test cases
2. Response body JSON for happy path tests
3. Verify `updatedAt` timestamp changes on successful update
4. Verify `suggestedSlug` is present in 409 conflict response
5. Verify error codes match expected

---

## 11. Seed Requirements

### Existing Seed Data (No Changes Required)

The existing MOC seed data (from STORY-011) is sufficient:

| MOC ID | Title | Owner | Slug | Purpose |
|--------|-------|-------|------|---------|
| `dddddddd-dddd-dddd-dddd-dddddddd0001` | King's Castle | dev-user | `kings-castle` | Happy path edit |
| `dddddddd-dddd-dddd-dddd-dddddddd0002` | Space Station | dev-user | `space-station` | Draft MOC edit |
| `dddddddd-dddd-dddd-dddd-dddddddd0004` | Technic Supercar | other-user | `technic-supercar` | 403 test |

**Slug conflict test data**: Use `kings-castle` as conflicting slug when editing `dddddddd-dddd-dddd-dddd-dddddddd0002`.

### Seed Requirements

- **Deterministic**: Uses fixed UUIDs (existing)
- **Idempotent**: ON CONFLICT DO UPDATE pattern (existing)
- **Location**: `apps/api/core/database/seeds/mocs.ts` (existing)
- **Command**: `pnpm seed` includes MOC seed (existing)

---

## 12. Test Plan (Happy Path / Error Cases / Edge Cases)

*Synthesized from `_pm/TEST-PLAN.md`*

### Happy Path Tests

| ID | Test | Expected | Evidence |
|----|------|----------|----------|
| HP-1 | PATCH /api/mocs/:id with valid title update | 200 OK, returns updated MOC | `.http` response |
| HP-2 | PATCH /api/mocs/:id with description update | 200 OK, description updated | `.http` response |
| HP-3 | PATCH /api/mocs/:id with tags update | 200 OK, tags array updated | `.http` response |
| HP-4 | PATCH /api/mocs/:id with theme update | 200 OK, theme updated | `.http` response |
| HP-5 | PATCH /api/mocs/:id with slug update | 200 OK, slug updated | `.http` response |
| HP-6 | PATCH /api/mocs/:id with multiple fields | 200 OK, all fields updated | `.http` response |
| HP-7 | PATCH /api/mocs/:id setting description to null | 200 OK, description is null | `.http` response |
| HP-8 | Response includes updated `updatedAt` timestamp | 200 OK, timestamp changed | `.http` response |

### Error Cases

| ID | Test | Expected |
|----|------|----------|
| ERR-1 | PATCH without authentication | 401 UNAUTHORIZED |
| ERR-2 | PATCH non-existent MOC ID | 404 NOT_FOUND |
| ERR-3 | PATCH MOC owned by another user | 403 FORBIDDEN |
| ERR-4 | PATCH with empty request body | 400 VALIDATION_ERROR |
| ERR-5 | PATCH with title > 100 chars | 400 VALIDATION_ERROR |
| ERR-6 | PATCH with description > 2000 chars | 400 VALIDATION_ERROR |
| ERR-7 | PATCH with > 10 tags | 400 VALIDATION_ERROR |
| ERR-8 | PATCH with invalid slug format | 400 VALIDATION_ERROR |
| ERR-9 | PATCH with conflicting slug | 409 CONFLICT with suggestedSlug |
| ERR-10 | PATCH with unknown fields | 400 VALIDATION_ERROR |
| ERR-11 | PATCH with invalid UUID format | 404 NOT_FOUND |
| ERR-12 | PATCH with invalid JSON body | 400 "Invalid JSON" |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | PATCH with same slug as current MOC | 200 OK (no conflict) |
| EDGE-2 | PATCH setting tags to null | 200 OK, tags is null |
| EDGE-3 | PATCH setting theme to null | 200 OK, theme is null |
| EDGE-4 | PATCH with empty string title | 400 VALIDATION_ERROR |
| EDGE-5 | PATCH draft MOC as owner | 200 OK |
| EDGE-6 | PATCH archived MOC as owner | 200 OK |
| EDGE-7 | Slug conflict with multiple existing slugs | 409 with correct suggestedSlug |

---

## 13. Open Questions

*None - all blocking decisions resolved.*

**Decision Log:**
- OpenSearch re-indexing: **DEFERRED** - Skip for Vercel MVP per STORY-011
- Handler structure: **INLINE** - Keep inline per STORY-011/012 pattern
- Route structure: **NESTED FILE** - Create `[id]/edit.ts` (or handle in `[id].ts`)

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-20 | PM | Generated story from index | `plans/stories/STORY-013/STORY-013.md` |
| 2026-01-20 | PM | Created test plan | `plans/stories/STORY-013/_pm/TEST-PLAN.md` |
| 2026-01-20 | PM | Marked UI/UX as SKIPPED | `plans/stories/STORY-013/_pm/UIUX-NOTES.md` |
| 2026-01-20 | PM | Created feasibility analysis | `plans/stories/STORY-013/_pm/DEV-FEASIBILITY.md` |
| 2026-01-20 | PM | Confirmed no blockers | `plans/stories/STORY-013/_pm/BLOCKERS.md` |
