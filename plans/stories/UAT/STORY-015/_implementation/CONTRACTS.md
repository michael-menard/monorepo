# CONTRACTS.md: STORY-015

**Story:** MOC Instructions - Initialization & Finalization
**Generated:** 2026-01-21
**Agent:** dev-implement-contracts

---

## Swagger Updates

This project does not use Swagger/OpenAPI. The `.http` files serve as the API contract documentation.

- **File(s) updated:** N/A (no Swagger)
- **Summary of changes:** N/A
- **Notes about versioning or breaking changes:** N/A

---

## HTTP Files

### Added/Updated .http File Paths

| File | Action | Story |
|------|--------|-------|
| `/__http__/mocs.http` | Modified | STORY-015 |

### Request Inventory

The following requests were added for STORY-015:

#### Initialize Endpoint - Happy Path

| Request Name | Purpose | Method | Route | Expected Status |
|--------------|---------|--------|-------|-----------------|
| `#initializeMocSingleFile` | Create MOC with single instruction file | POST | `/api/mocs/with-files/initialize` | 201 |
| `#initializeMocMultipleFiles` | Create MOC with multiple files (instruction, parts-list, thumbnail) | POST | `/api/mocs/with-files/initialize` | 201 |
| `#initializeMocFullSchema` | Create MOC with all optional fields populated | POST | `/api/mocs/with-files/initialize` | 201 |
| `#initializeMocTypeSet` | Create Set type (not MOC) with set-specific fields | POST | `/api/mocs/with-files/initialize` | 201 |

#### Initialize Endpoint - Error Cases

| Request Name | Purpose | Method | Route | Expected Status |
|--------------|---------|--------|-------|-----------------|
| `#initializeNoAuth` | Verify 401 when not authenticated | POST | `/api/mocs/with-files/initialize` | 401 |
| `#initializeEmptyBody` | Verify 400 with empty request body | POST | `/api/mocs/with-files/initialize` | 400 |
| `#initializeNoFiles` | Verify 400 when files array is missing | POST | `/api/mocs/with-files/initialize` | 400 |
| `#initializeNoInstruction` | Verify 400 when no instruction file provided | POST | `/api/mocs/with-files/initialize` | 400 |
| `#initializeTooManyInstructions` | Verify 400 when >10 instruction files | POST | `/api/mocs/with-files/initialize` | 400 |
| `#initializeFileTooLarge` | Verify 400 when file exceeds size limit | POST | `/api/mocs/with-files/initialize` | 400 |
| `#initializeInvalidMime` | Verify 400 with unsupported MIME type | POST | `/api/mocs/with-files/initialize` | 400 |
| `#initializeDuplicateTitle` | Verify 409 when title already exists for user | POST | `/api/mocs/with-files/initialize` | 409 |

#### Finalize Endpoint - Happy Path

| Request Name | Purpose | Method | Route | Expected Status |
|--------------|---------|--------|-------|-----------------|
| `#finalizeMocSuccess` | Finalize MOC after successful file upload | POST | `/api/mocs/:mocId/finalize` | 200 |
| `#finalizeMocIdempotent` | Verify idempotent response for already-finalized MOC | POST | `/api/mocs/:mocId/finalize` | 200 |

#### Finalize Endpoint - Error Cases

| Request Name | Purpose | Method | Route | Expected Status |
|--------------|---------|--------|-------|-----------------|
| `#finalizeNotFound` | Verify 404 when MOC doesn't exist | POST | `/api/mocs/:mocId/finalize` | 404 |
| `#finalizeForbidden` | Verify 403 when user doesn't own MOC | POST | `/api/mocs/:mocId/finalize` | 403 |
| `#finalizeEmptyBody` | Verify 400 with empty request body | POST | `/api/mocs/:mocId/finalize` | 400 |
| `#finalizeNoSuccessfulUploads` | Verify 400 when no files marked as success | POST | `/api/mocs/:mocId/finalize` | 400 |
| `#finalizeInvalidMocId` | Verify 404 with invalid UUID format | POST | `/api/mocs/:mocId/finalize` | 404 |

---

## Acceptance Criteria Coverage

### Initialize Endpoint (AC-1 through AC-11)

| AC | Requirement | HTTP Request(s) |
|---|---|---|
| AC-1 | POST `/api/mocs/with-files/initialize` returns 201 with mocId and presigned URLs | `#initializeMocSingleFile`, `#initializeMocMultipleFiles` |
| AC-2 | Presigned URLs expire after configurable TTL | Verified in unit tests; response includes `sessionTtlSeconds` |
| AC-3 | At least one instruction file required (400) | `#initializeNoInstruction` |
| AC-4 | Maximum 10 instruction files (400) | `#initializeTooManyInstructions` |
| AC-5 | File sizes validated against config (400) | `#initializeFileTooLarge` |
| AC-6 | MIME types validated against allowlist (400) | `#initializeInvalidMime` |
| AC-7 | Duplicate title returns 409 CONFLICT | `#initializeDuplicateTitle` |
| AC-8 | Rate limit checked before DB writes (429) | Verified in unit tests |
| AC-9 | Response includes `sessionTtlSeconds` | `#initializeMocSingleFile` response |
| AC-10 | Filenames sanitized for S3 keys | Verified in unit tests |
| AC-11 | Returns 401 if not authenticated | `#initializeNoAuth` |

### Finalize Endpoint (AC-12 through AC-24)

| AC | Requirement | HTTP Request(s) |
|---|---|---|
| AC-12 | POST `/api/mocs/:mocId/finalize` accepts `uploadedFiles` array | `#finalizeMocSuccess` |
| AC-13 | Verifies files exist in S3 (400 if missing) | Verified in unit tests |
| AC-14 | Validates magic bytes (422 INVALID_TYPE) | Verified in unit tests |
| AC-15 | Validates parts list files (422 PARTS_VALIDATION_ERROR) | Verified in unit tests |
| AC-16 | Sets first image as thumbnail | Verified in unit tests |
| AC-17 | Updates status to published, sets `finalizedAt` | `#finalizeMocSuccess` response |
| AC-18 | Returns 403 if user doesn't own MOC | `#finalizeForbidden` |
| AC-19 | Returns 404 if MOC doesn't exist | `#finalizeNotFound` |
| AC-20 | Idempotent: already-finalized returns 200 with `idempotent: true` | `#finalizeMocIdempotent` |
| AC-21 | Two-phase lock prevents concurrent finalization | Verified in unit tests |
| AC-22 | Stale locks rescued | Verified in unit tests |
| AC-23 | Rate limit checked before side effects (429) | Verified in unit tests |
| AC-24 | Returns complete MOC with files array | `#finalizeMocSuccess` response |

---

## Test Execution Order

The `.http` file includes an execution order note. For QA verification:

1. **Initialize tests first** - Run `#initializeMocSingleFile` to capture `mocId` and `fileId` values
2. **Upload files** (optional) - Upload to presigned URLs for full flow testing
3. **Finalize tests** - Use captured `mocId`/`fileId` for `#finalizeMocSuccess` and `#finalizeMocIdempotent`
4. **Error cases** - Run in any order (independent of captured values)

---

## Seed Data Requirements

The following seed data is required for HTTP contract testing:

| Entity | ID | Purpose | Created In |
|--------|---|---------|------------|
| MOC "Test MOC Duplicate Title" | `dddddddd-dddd-dddd-dddd-dddddddd0015` | 409 conflict test | `seeds/mocs.ts` |
| MOC owned by other user | `eeeeeeee-eeee-eeee-eeee-eeeeeeee0001` | 403 forbidden test | `seeds/mocs.ts` |

Run `pnpm seed` to populate test data before executing HTTP requests.

---

## Executed HTTP Evidence

**Note:** Execution evidence will be captured during QA verification phase, not during contract documentation.

Per the agent protocol, this section documents the contract structure. The `qa-verify-story` agent will execute requests and capture evidence in `QA-VERIFY-STORY-015.md`.

### Expected Evidence Format (for QA)

For each executed request:
- Command used (e.g., REST Client extension, curl)
- Timestamp
- Request snippet (minimal)
- Response status + body snippet
- Redaction notes if applicable

---

## Notes

### Discrepancies

None identified. The `.http` file covers all story-specified HTTP requests per the "HTTP Contract Plan" section of STORY-015.md.

### Implementation Variations

1. **Parts validation optional:** The finalize endpoint does not require parts validation to succeed. This aligns with core function design where `validatePartsFile` is optional in deps.

2. **OpenSearch indexing skipped:** Per story Non-goals, OpenSearch indexing is deferred. Finalize updates PostgreSQL only.

3. **Auth bypass for testing:** `#initializeNoAuth` test requires `AUTH_BYPASS=false` to verify 401 response. All other tests assume `AUTH_BYPASS=true` for local development.

### Routes Added

| Route | Handler | Position |
|-------|---------|----------|
| `/api/mocs/with-files/initialize` | `api/mocs/with-files/initialize.ts` | Before `/api/mocs/:id` |
| `/api/mocs/:mocId/finalize` | `api/mocs/[mocId]/finalize.ts` | Before `/api/mocs/:id` |

Route order is critical - specific routes must precede parameterized routes in `vercel.json`.

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | dev-implement-contracts | Contract documentation generated for STORY-015 |
