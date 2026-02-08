# Test Plan: INST-1008

**Story**: Wire RTK Query Mutations for MOC Instructions API
**Generated**: 2026-02-05
**Test Strategy**: Infrastructure testing (Unit + Integration only)

---

## Test Strategy Summary

This is an **infrastructure story** that adds RTK Query mutation endpoints to the frontend API client. Per ADR-006, infrastructure stories do not require E2E tests - those will be covered by consuming stories (INST-1100+) that implement user-facing features.

**Test Levels**:
- ✅ **Unit Tests**: Mutation configurations, cache tag definitions, Zod validation
- ✅ **Integration Tests**: MSW handlers, cache invalidation behavior, optimistic updates
- ❌ **E2E Tests**: N/A (infrastructure layer, no UI)

---

## Unit Tests

**Location**: `packages/core/api-client/src/rtk/__tests__/instructions-api.test.ts`

**Framework**: Vitest + React Testing Library

### Test Suite 1: Mutation Configuration

**Purpose**: Verify mutation endpoints generate correct HTTP requests

**Test Cases**:

1. **TC-U1.1**: `useCreateMocMutation` generates correct request
   - **Given**: Mutation hook initialized
   - **When**: Mutation called with `{ title: "Test MOC", description: "..." }`
   - **Then**:
     - Request method is `POST`
     - Request URL is `/api/v2/mocs`
     - Request body matches `CreateMocInputSchema`

2. **TC-U1.2**: `useUpdateMocMutation` generates correct request
   - **Given**: Mutation hook initialized
   - **When**: Mutation called with `{ id: "moc-123", title: "Updated" }`
   - **Then**:
     - Request method is `PATCH`
     - Request URL is `/api/v2/mocs/moc-123`
     - Request body matches `UpdateMocInputSchema`

3. **TC-U1.3**: `useDeleteMocMutation` generates correct request
   - **Given**: Mutation hook initialized
   - **When**: Mutation called with `{ id: "moc-123" }`
   - **Then**:
     - Request method is `DELETE`
     - Request URL is `/api/v2/mocs/moc-123`
     - No request body

4. **TC-U1.4**: `useUploadFileMutation` generates multipart request
   - **Given**: Mutation hook initialized
   - **When**: Mutation called with `{ mocId: "moc-123", file: File, fileType: "instructions" }`
   - **Then**:
     - Request method is `POST`
     - Request URL is `/api/v2/mocs/moc-123/files`
     - Request body is `FormData` with file and fileType

5. **TC-U1.5**: `useDeleteFileMutation` generates correct request
   - **Given**: Mutation hook initialized
   - **When**: Mutation called with `{ mocId: "moc-123", fileId: "file-456" }`
   - **Then**:
     - Request method is `DELETE`
     - Request URL is `/api/v2/mocs/moc-123/files/file-456`

### Test Suite 2: Cache Tag Configuration

**Purpose**: Verify cache invalidation tags are correctly defined

**Test Cases**:

1. **TC-U2.1**: `createMoc` invalidates `MocList`
   - **Given**: Mutation endpoint definition
   - **When**: `invalidatesTags` inspected
   - **Then**: Includes `[{ type: 'MocList', id: 'LIST' }]`

2. **TC-U2.2**: `updateMoc` invalidates entity and list
   - **Given**: Mutation endpoint definition
   - **When**: `invalidatesTags` inspected
   - **Then**: Includes `[{ type: 'Moc', id }, { type: 'MocList', id: 'LIST' }]`

3. **TC-U2.3**: `deleteMoc` invalidates entity and list
   - **Given**: Mutation endpoint definition
   - **When**: `invalidatesTags` inspected
   - **Then**: Includes `[{ type: 'Moc', id }, { type: 'MocList', id: 'LIST' }]`

4. **TC-U2.4**: `uploadFile` invalidates MOC and file tags
   - **Given**: Mutation endpoint definition
   - **When**: `invalidatesTags` inspected
   - **Then**: Includes `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: mocId }]`

5. **TC-U2.5**: `deleteFile` invalidates MOC and file tags
   - **Given**: Mutation endpoint definition
   - **When**: `invalidatesTags` inspected
   - **Then**: Includes `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: fileId }]`

6. **TC-U2.6**: Existing `getInstructions` query uses `MocList` tag
   - **Given**: Query endpoint updated
   - **When**: `providesTags` inspected
   - **Then**: Returns `[{ type: 'MocList', id: 'LIST' }]` (not `InstructionList`)

7. **TC-U2.7**: Existing `getInstructionById` query uses `Moc` tag
   - **Given**: Query endpoint updated
   - **When**: `providesTags` inspected
   - **Then**: Returns `[{ type: 'Moc', id }]` (not `Instruction`)

### Test Suite 3: Zod Schema Validation

**Purpose**: Verify response data is validated via Zod schemas

**Test Cases**:

1. **TC-U3.1**: `createMoc` validates response with `MocInstructionsSchema`
   - **Given**: Mock API returns MOC data
   - **When**: Response received
   - **Then**: `transformResponse` parses data with `MocInstructionsSchema.parse()`

2. **TC-U3.2**: `updateMoc` validates response with `MocInstructionsSchema`
   - **Given**: Mock API returns updated MOC data
   - **When**: Response received
   - **Then**: `transformResponse` parses data with `MocInstructionsSchema.parse()`

3. **TC-U3.3**: `uploadFile` validates response with `MocFileSchema`
   - **Given**: Mock API returns file metadata
   - **When**: Response received
   - **Then**: `transformResponse` parses data with `MocFileSchema.parse()`

4. **TC-U3.4**: Invalid response throws Zod error
   - **Given**: Mock API returns invalid data (missing required fields)
   - **When**: Response received
   - **Then**: `transformResponse` throws `ZodError`

### Test Suite 4: Optimistic Update Logic

**Purpose**: Verify optimistic updates modify cache before API response

**Test Cases**:

1. **TC-U4.1**: `createMoc` adds temp MOC to list cache
   - **Given**: `onQueryStarted` callback defined
   - **When**: Mutation dispatched
   - **Then**:
     - Cache patched with temp MOC before API call
     - Temp MOC has `{ id: 'temp-...', ...input }`

2. **TC-U4.2**: `updateMoc` updates MOC in cache
   - **Given**: `onQueryStarted` callback defined
   - **When**: Mutation dispatched
   - **Then**:
     - Cache patched with updated fields before API call
     - Original state captured for rollback

3. **TC-U4.3**: `deleteMoc` removes MOC from list cache
   - **Given**: `onQueryStarted` callback defined
   - **When**: Mutation dispatched
   - **Then**:
     - MOC removed from list cache before API call
     - Original state captured for rollback

4. **TC-U4.4**: Failed mutation rolls back optimistic update
   - **Given**: Optimistic update applied
   - **When**: API returns error
   - **Then**: `patchResult.undo()` called to restore original cache state

---

## Integration Tests

**Location**: `packages/core/api-client/src/rtk/__tests__/instructions-api.integration.test.ts`

**Framework**: Vitest + MSW (Mock Service Worker)

**Setup**:
- MSW handlers intercept requests to `/api/v2/mocs/*`
- Handlers return mock responses matching backend schema
- RTK Query store initialized for each test

### Test Suite 5: MSW Handler Integration

**Purpose**: Verify mutations work with mocked backend

**Test Cases**:

1. **TC-I5.1**: `createMoc` calls MSW handler and returns data
   - **Given**: MSW handler for `POST /api/v2/mocs`
   - **When**: `createMoc.mutate({ title: "Test" })` called
   - **Then**:
     - MSW handler receives request
     - Handler returns `{ id: "moc-123", title: "Test", ... }`
     - Mutation resolves with created MOC

2. **TC-I5.2**: `updateMoc` calls MSW handler and updates data
   - **Given**: MSW handler for `PATCH /api/v2/mocs/:id`
   - **When**: `updateMoc.mutate({ id: "moc-123", title: "Updated" })` called
   - **Then**:
     - MSW handler receives request with updated fields
     - Handler returns updated MOC
     - Mutation resolves with updated MOC

3. **TC-I5.3**: `deleteMoc` calls MSW handler and returns 204
   - **Given**: MSW handler for `DELETE /api/v2/mocs/:id`
   - **When**: `deleteMoc.mutate({ id: "moc-123" })` called
   - **Then**:
     - MSW handler receives delete request
     - Handler returns 204 No Content
     - Mutation resolves successfully

4. **TC-I5.4**: `uploadFile` sends FormData to MSW handler
   - **Given**: MSW handler for `POST /api/v2/mocs/:id/files`
   - **When**: `uploadFile.mutate({ mocId: "moc-123", file: mockFile, fileType: "instructions" })` called
   - **Then**:
     - MSW handler receives multipart/form-data
     - Handler returns file metadata
     - Mutation resolves with file record

5. **TC-I5.5**: `deleteFile` calls MSW handler and returns 204
   - **Given**: MSW handler for `DELETE /api/v2/mocs/:id/files/:fileId`
   - **When**: `deleteFile.mutate({ mocId: "moc-123", fileId: "file-456" })` called
   - **Then**:
     - MSW handler receives delete request
     - Handler returns 204 No Content
     - Mutation resolves successfully

### Test Suite 6: Cache Invalidation Behavior

**Purpose**: Verify mutations trigger query refetch via cache tags

**Test Cases**:

1. **TC-I6.1**: `createMoc` invalidates and refetches MOC list
   - **Given**: `getMocs` query cached with 2 MOCs
   - **When**: `createMoc` mutation succeeds
   - **Then**:
     - `MocList` tag invalidated
     - `getMocs` query automatically refetched
     - New cache contains 3 MOCs (original 2 + new one)

2. **TC-I6.2**: `updateMoc` invalidates entity and list caches
   - **Given**: `getMoc` query cached for `moc-123` and `getMocs` list cached
   - **When**: `updateMoc` mutation succeeds for `moc-123`
   - **Then**:
     - `{ type: 'Moc', id: 'moc-123' }` tag invalidated
     - `MocList` tag invalidated
     - Both queries refetched automatically

3. **TC-I6.3**: `deleteMoc` invalidates and removes from cache
   - **Given**: `getMocs` query cached with 3 MOCs including `moc-123`
   - **When**: `deleteMoc` mutation succeeds for `moc-123`
   - **Then**:
     - `MocList` tag invalidated
     - `getMocs` refetched
     - New cache contains 2 MOCs (without `moc-123`)

4. **TC-I6.4**: `uploadFile` invalidates MOC detail cache
   - **Given**: `getMoc` query cached for `moc-123` with 0 files
   - **When**: `uploadFile` mutation succeeds
   - **Then**:
     - `{ type: 'Moc', id: 'moc-123' }` tag invalidated
     - `getMoc` refetched
     - New cache shows 1 file

5. **TC-I6.5**: `deleteFile` invalidates MOC and file caches
   - **Given**: `getMoc` query cached for `moc-123` with 2 files
   - **When**: `deleteFile` mutation succeeds for `file-456`
   - **Then**:
     - `{ type: 'Moc', id: 'moc-123' }` tag invalidated
     - `getMoc` refetched
     - New cache shows 1 file

### Test Suite 7: Optimistic Update UI State

**Purpose**: Verify optimistic updates reflect in UI state immediately

**Test Cases**:

1. **TC-I7.1**: UI shows temp MOC immediately on create
   - **Given**: Component rendering MOC list
   - **When**: `createMoc` mutation dispatched
   - **Then**:
     - UI updates immediately with temp MOC (before API response)
     - Temp MOC has `id: 'temp-...'` and loading state
     - After API response, temp MOC replaced with real MOC

2. **TC-I7.2**: UI shows updated fields immediately on update
   - **Given**: Component rendering MOC detail
   - **When**: `updateMoc` mutation dispatched with `{ title: "New Title" }`
   - **Then**:
     - UI updates immediately with "New Title" (before API response)
     - After API response, title remains "New Title" (confirmed)

3. **TC-I7.3**: UI removes MOC immediately on delete
   - **Given**: Component rendering MOC list with 3 MOCs
   - **When**: `deleteMoc` mutation dispatched
   - **Then**:
     - UI updates immediately to show 2 MOCs (before API response)
     - After API response, list remains with 2 MOCs (confirmed)

4. **TC-I7.4**: Failed mutation restores original UI state
   - **Given**: Optimistic update applied (MOC deleted from UI)
   - **When**: API returns 500 error
   - **Then**:
     - Optimistic update rolled back
     - UI restores original state (MOC reappears in list)
     - Error message displayed to user

### Test Suite 8: Error Handling

**Purpose**: Verify mutations handle API errors gracefully

**Test Cases**:

1. **TC-I8.1**: Network error returns error state
   - **Given**: MSW handler simulates network failure
   - **When**: Mutation dispatched
   - **Then**:
     - Mutation enters `isError` state
     - `error` object contains network error details
     - Optimistic update rolled back

2. **TC-I8.2**: 400 validation error returns field errors
   - **Given**: MSW handler returns `{ field: 'title', message: 'Title too short' }`
   - **When**: Mutation dispatched
   - **Then**:
     - Mutation enters `isError` state
     - `error.data` contains validation errors
     - Optimistic update rolled back

3. **TC-I8.3**: 404 error returns not found state
   - **Given**: MSW handler returns 404 for `updateMoc`
   - **When**: Mutation dispatched
   - **Then**:
     - Mutation enters `isError` state
     - `error.status` is 404
     - Optimistic update rolled back

4. **TC-I8.4**: 500 server error returns error state
   - **Given**: MSW handler returns 500
   - **When**: Mutation dispatched
   - **Then**:
     - Mutation enters `isError` state
     - `error.status` is 500
     - Error logged to `@repo/logger`

---

## E2E Tests

**Status**: ❌ Not applicable (infrastructure story)

**Rationale**: Per ADR-006, infrastructure stories that don't expose user-facing UI are exempt from E2E testing. E2E tests will be added in consuming stories:

- **INST-1100**: View MOC Gallery - E2E test for gallery display
- **INST-1102**: Create Basic MOC - E2E test for create flow (uses `useCreateMocMutation`)
- **INST-1103**: Upload Thumbnail - E2E test for upload flow (uses `useUploadFileMutation`)
- **INST-1108**: Edit MOC Metadata - E2E test for edit flow (uses `useUpdateMocMutation`)
- **INST-1109**: Delete MOC - E2E test for delete flow (uses `useDeleteMocMutation`)
- **INST-1110**: Remove Individual File - E2E test for file delete (uses `useDeleteFileMutation`)

---

## Coverage Goals

| Test Level | Target Coverage | Rationale |
|------------|-----------------|-----------|
| Unit Tests | 100% | All mutation configs, cache tags, and optimistic logic must be verified |
| Integration Tests | 90%+ | All mutations with MSW handlers, cache invalidation, and error paths |
| E2E Tests | N/A | Covered by consuming stories (INST-1100+) |

---

## Test Data Requirements

**Mock MOCs**:
```typescript
const mockMoc = {
  id: 'moc-123',
  title: 'Test Castle MOC',
  description: 'A medieval castle',
  theme: 'Castle',
  tags: ['medieval', 'castle'],
  thumbnailUrl: 'https://s3.../thumbnail.jpg',
  pieceCount: 1500,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
}
```

**Mock Files**:
```typescript
const mockFile = {
  id: 'file-456',
  mocId: 'moc-123',
  type: 'instructions',
  name: 'instructions.pdf',
  size: 5242880, // 5MB
  s3Key: 'mocs/moc-123/instructions.pdf',
  uploadedAt: '2026-01-15T10:30:00Z',
}
```

**Mock API Responses** (MSW handlers):
- `POST /api/v2/mocs` → returns created MOC
- `PATCH /api/v2/mocs/:id` → returns updated MOC
- `DELETE /api/v2/mocs/:id` → returns 204 No Content
- `POST /api/v2/mocs/:id/files` → returns file metadata
- `DELETE /api/v2/mocs/:id/files/:fileId` → returns 204 No Content

---

## Test Execution

**Run Commands**:
```bash
# Unit tests only
pnpm --filter @repo/api-client test instructions-api.test.ts

# Integration tests only
pnpm --filter @repo/api-client test instructions-api.integration.test.ts

# All tests for api-client
pnpm --filter @repo/api-client test

# Watch mode during development
pnpm --filter @repo/api-client test --watch instructions-api
```

**CI Pipeline**:
- Unit tests run on all PRs
- Integration tests run on all PRs
- Coverage report generated and uploaded to SonarQube (if configured)

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Path mismatch (`/api/v2/mocs` vs `/mocs`) | Integration tests use MSW handlers with frontend paths; verify Vite proxy config |
| Schema drift between backend and frontend | Import schemas from backend types or keep aligned; add schema alignment test |
| Cache invalidation bugs | Comprehensive integration tests verify all cache tags and refetch behavior |
| Optimistic update edge cases | Unit tests verify rollback on error; integration tests verify UI state restoration |

---

## Acceptance Criteria Mapping

| AC | Test Suite | Status |
|----|------------|--------|
| AC-1: `useCreateMocMutation` hook | TS1 (U1.1), TS2 (U2.1), TS3 (U3.1), TS4 (U4.1), TS5 (I5.1), TS6 (I6.1) | ✅ |
| AC-2: `useUpdateMocMutation` hook | TS1 (U1.2), TS2 (U2.2), TS3 (U3.2), TS4 (U4.2), TS5 (I5.2), TS6 (I6.2) | ✅ |
| AC-3: `useDeleteMocMutation` hook | TS1 (U1.3), TS2 (U2.3), TS5 (I5.3), TS6 (I6.3) | ✅ |
| AC-4: `useUploadFileMutation` hook | TS1 (U1.4), TS2 (U2.4), TS3 (U3.3), TS5 (I5.4), TS6 (I6.4) | ✅ |
| AC-5: `useDeleteFileMutation` hook | TS1 (U1.5), TS2 (U2.5), TS5 (I5.5), TS6 (I6.5) | ✅ |
| AC-6: Update `tagTypes` to `['Moc', 'MocList', 'MocFile']` | TS2 (all tests) | ✅ |
| AC-7: Update `getInstructions` to use `MocList` tag | TS2 (U2.6) | ✅ |
| AC-8: Update `getInstructionById` to use `Moc` tag | TS2 (U2.7) | ✅ |
| AC-9: Export all new hooks | Covered by all tests (hooks must be exported to use) | ✅ |
| AC-10: Add Zod schemas to `@repo/api-client` | TS3 (all tests) | ✅ |

---

## Definition of Done

- [x] All unit tests written and passing (100% coverage of mutation configs)
- [x] All integration tests written and passing (90%+ coverage with MSW)
- [x] E2E tests N/A (deferred to consuming stories per ADR-006)
- [x] Test data fixtures created and documented
- [x] MSW handlers aligned with backend API contracts
- [x] Test plan reviewed and approved
- [x] CI pipeline includes new tests
- [x] No regressions in existing tests
