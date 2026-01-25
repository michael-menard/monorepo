# TEST-PLAN: STORY-013 - MOC Instructions Edit (No Files)

## Story Scope

Single endpoint: `PATCH /api/mocs/:id` for editing MOC metadata (title, description, tags, theme, slug).

This endpoint already exists in AWS Lambda at `apps/api/platforms/aws/endpoints/moc-instructions/edit/handler.ts` and must be migrated to Vercel with identical behavior.

---

## Happy Path Tests

| ID | Test | Expected Outcome | Evidence |
|----|------|------------------|----------|
| HP-1 | PATCH /api/mocs/:id with valid title update | 200 OK, returns updated MOC with new title and isOwner: true | `.http` response |
| HP-2 | PATCH /api/mocs/:id with description update | 200 OK, description updated in response | `.http` response |
| HP-3 | PATCH /api/mocs/:id with tags update | 200 OK, tags array updated | `.http` response |
| HP-4 | PATCH /api/mocs/:id with theme update | 200 OK, theme updated | `.http` response |
| HP-5 | PATCH /api/mocs/:id with slug update | 200 OK, slug updated | `.http` response |
| HP-6 | PATCH /api/mocs/:id with multiple fields | 200 OK, all provided fields updated | `.http` response |
| HP-7 | PATCH /api/mocs/:id setting description to null | 200 OK, description is null | `.http` response |
| HP-8 | Response includes updatedAt timestamp change | 200 OK, updatedAt is different from original | `.http` response |

---

## Error Cases

| ID | Test | Expected Outcome | Evidence |
|----|------|------------------|----------|
| ERR-1 | PATCH without authentication | 401 UNAUTHORIZED | `.http` response |
| ERR-2 | PATCH non-existent MOC ID | 404 NOT_FOUND | `.http` response |
| ERR-3 | PATCH MOC owned by another user | 403 FORBIDDEN | `.http` response |
| ERR-4 | PATCH with empty request body | 400 VALIDATION_ERROR "No fields to update" | `.http` response |
| ERR-5 | PATCH with title exceeding 100 chars | 400 VALIDATION_ERROR "Title too long" | `.http` response |
| ERR-6 | PATCH with description exceeding 2000 chars | 400 VALIDATION_ERROR "Description too long" | `.http` response |
| ERR-7 | PATCH with more than 10 tags | 400 VALIDATION_ERROR "Maximum 10 tags" | `.http` response |
| ERR-8 | PATCH with invalid slug format (spaces/uppercase) | 400 VALIDATION_ERROR "Slug must contain only lowercase" | `.http` response |
| ERR-9 | PATCH with slug already used by another of user's MOCs | 409 CONFLICT with suggestedSlug | `.http` response |
| ERR-10 | PATCH with unknown fields in body | 400 VALIDATION_ERROR (strict schema) | `.http` response |
| ERR-11 | PATCH with invalid UUID format for MOC ID | 404 NOT_FOUND | `.http` response |
| ERR-12 | PATCH with invalid JSON body | 400 "Invalid JSON" | `.http` response |

---

## Edge Cases

| ID | Test | Expected Outcome | Evidence |
|----|------|------------------|----------|
| EDGE-1 | PATCH with same slug as current MOC (no-op) | 200 OK, no conflict | `.http` response |
| EDGE-2 | PATCH setting tags to null | 200 OK, tags is null | `.http` response |
| EDGE-3 | PATCH setting theme to null | 200 OK, theme is null | `.http` response |
| EDGE-4 | PATCH with empty string title | 400 VALIDATION_ERROR "Title is required" | `.http` response |
| EDGE-5 | PATCH with tag containing special characters | 200 OK (if < 30 chars) | `.http` response |
| EDGE-6 | PATCH draft MOC as owner | 200 OK (any status editable by owner) | `.http` response |
| EDGE-7 | PATCH archived MOC as owner | 200 OK (any status editable by owner) | `.http` response |
| EDGE-8 | Slug conflict with 2 existing slugs | 409 with suggestedSlug = base-3 | `.http` response |
| EDGE-9 | OpenSearch fails but request succeeds | 200 OK (fail-open behavior) | Unit test |

---

## Test Data Requirements

The existing MOC seed must include:

1. **Editable MOC (dev-user owned)**:
   - `dddddddd-dddd-dddd-dddd-dddddddd0001` (King's Castle) - published, owned by dev-user
   - `dddddddd-dddd-dddd-dddd-dddddddd0002` (Space Station) - draft, owned by dev-user

2. **Non-editable MOC (other-user owned)**:
   - `dddddddd-dddd-dddd-dddd-dddddddd0004` (Technic Supercar) - owned by other-user

3. **MOC with slug for conflict testing**:
   - Existing MOC with slug `kings-castle` for slug conflict test

---

## Unit Test Coverage

Existing unit tests at `apps/api/platforms/aws/endpoints/moc-instructions/__tests__/edit.handler.test.ts` cover:

- Authentication (401)
- Authorization (403 for non-owner)
- Validation (empty body, field limits, slug format, unknown fields)
- Slug conflict handling (409 with suggestion)
- Successful updates (single field, multiple fields, nullable fields)
- OpenSearch fail-open behavior
- Response structure

The Vercel handler MUST pass equivalent tests.

---

## HTTP Contract Requirements

Add to `__http__/mocs.http`:

| Request Name | Method | Description |
|--------------|--------|-------------|
| `patchMocTitle` | PATCH | Update title only |
| `patchMocMultipleFields` | PATCH | Update title, description, tags |
| `patchMocSlug` | PATCH | Update slug |
| `patchMocNullDescription` | PATCH | Set description to null |
| `patchMoc401` | PATCH | Without auth (expect 401) |
| `patchMoc403` | PATCH | Other user's MOC (expect 403) |
| `patchMoc404` | PATCH | Non-existent MOC (expect 404) |
| `patchMocEmptyBody` | PATCH | Empty body (expect 400) |
| `patchMocSlugConflict` | PATCH | Conflicting slug (expect 409) |
| `patchMocInvalidSlug` | PATCH | Invalid slug format (expect 400) |

---

## Evidence Requirements

QA Verify MUST capture:

1. Response status code for all test cases
2. Response body JSON for happy path tests
3. Verify `updatedAt` timestamp changes on successful update
4. Verify `suggestedSlug` is present in 409 conflict response
5. Verify error codes match expected: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`
