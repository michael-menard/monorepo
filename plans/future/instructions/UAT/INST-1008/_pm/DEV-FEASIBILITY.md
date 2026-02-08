# Dev Feasibility Review: INST-1008

**Story**: Wire RTK Query Mutations for MOC Instructions API
**Generated**: 2026-02-05
**Reviewer**: PM Dev Feasibility Agent
**Complexity**: Low
**Estimated Effort**: 4-6 hours (includes tests)

---

## Executive Summary

✅ **FEASIBLE** - Story is well-scoped and ready for implementation.

This story adds RTK Query mutation endpoints to the existing frontend API client (`instructions-api.ts`). The backend API is complete, established patterns exist from the Wishlist feature, and there are no blocking dependencies.

**Key Findings**:
- Backend API fully implemented with all required endpoints
- Established mutation patterns from `wishlist-gallery-api.ts` can be directly reused
- Zod schemas exist in backend types, can be imported or adapted
- No conflicts with active stories (INST-1003, INST-1004 are different layers)
- Path handling via Vite proxy is already configured

**Risk Level**: Low - straightforward infrastructure work following proven patterns.

---

## Feasibility Assessment

### ✅ Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Backend API endpoints | ✅ Complete | All CRUD and file operations exist in `apps/api/lego-api/domains/instructions/routes.ts` |
| Existing RTK Query setup | ✅ Complete | `instructions-api.ts` already configured with base query |
| Zod schemas | ✅ Available | Backend types in `apps/api/lego-api/domains/instructions/types.ts` |
| Base query utilities | ✅ Available | `createServerlessBaseQuery` in `@repo/api-client/rtk/base-query` |
| Reference patterns | ✅ Available | `wishlist-gallery-api.ts` has mutation patterns |

**Verdict**: All dependencies are satisfied. No blockers.

### ✅ Technical Complexity

**Complexity Rating**: Low (2/10)

**Breakdown**:
- **Mutation Wiring**: Straightforward - copy pattern from `wishlist-gallery-api.ts`
- **Cache Invalidation**: Standard RTK Query tags (well-documented pattern)
- **Optimistic Updates**: Reuse pattern from `reorderWishlist` mutation
- **Zod Validation**: Schemas exist, just need to import and wire
- **File Upload**: `FormData` handling pattern exists in `gallery-api.ts`

**No Complex Requirements**:
- ❌ No new architectural patterns
- ❌ No complex state management
- ❌ No external service integrations
- ❌ No database schema changes
- ❌ No auth/permission changes

### ✅ Scope Clarity

**Scope**: Clearly defined and contained.

**In Scope**:
- Add 5 mutation endpoints to `instructions-api.ts`
- Update `tagTypes` array
- Update existing query tags for consistency
- Add/update Zod schemas in `@repo/api-client/schemas/instructions.ts`
- Export mutation hooks
- Write unit and integration tests

**Out of Scope** (explicitly listed in seed):
- ❌ UI components (handled by INST-1100+)
- ❌ Backend API changes (already complete)
- ❌ Database schema changes
- ❌ E2E tests (deferred to consuming stories per ADR-006)
- ❌ Presigned upload multipart sessions (handled by INST-1105)

**Verdict**: Scope is well-defined with clear boundaries.

### ✅ Reuse Opportunities

**High Reuse Potential** - Most code can be adapted from existing patterns.

**Patterns to Reuse**:

1. **Mutation Structure** (from `wishlist-gallery-api.ts`):
```typescript
createWishlistItem: builder.mutation<WishlistItem, CreateWishlistItemInput>({
  query: (input) => ({
    url: '/api/v2/wishlist',
    method: 'POST',
    body: input,
  }),
  invalidatesTags: [{ type: 'WishlistList', id: 'LIST' }],
  transformResponse: (response) => WishlistItemSchema.parse(response),
  onQueryStarted: async (input, { dispatch, queryFulfilled, ... }) => {
    // Optimistic update logic
  },
})
```

**Adaptation for MOC**:
```typescript
createMoc: builder.mutation<MocInstructions, CreateMocInput>({
  query: (input) => ({
    url: '/api/v2/mocs',
    method: 'POST',
    body: input,
  }),
  invalidatesTags: [{ type: 'MocList', id: 'LIST' }],
  transformResponse: (response) => MocInstructionsSchema.parse(response),
  onQueryStarted: async (input, { dispatch, queryFulfilled, ... }) => {
    // Optimistic update logic (copy from wishlist)
  },
})
```

2. **Cache Tag Pattern**:
```typescript
// Wishlist pattern
tagTypes: ['WishlistItem', 'WishlistList']
invalidatesTags: [{ type: 'WishlistItem', id }, { type: 'WishlistList', id: 'LIST' }]

// Adapt for MOC
tagTypes: ['Moc', 'MocList', 'MocFile']
invalidatesTags: [{ type: 'Moc', id }, { type: 'MocList', id: 'LIST' }]
```

3. **Optimistic Update Pattern** (from `reorderWishlist`):
```typescript
onQueryStarted: async (input, { dispatch, queryFulfilled, getCacheEntry }) => {
  const patchResult = dispatch(
    api.util.updateQueryData('getMocs', undefined, (draft) => {
      // Update draft state
    })
  )
  try {
    await queryFulfilled
  } catch {
    patchResult.undo()
  }
}
```

4. **File Upload Pattern** (from `gallery-api.ts`):
```typescript
uploadGalleryImage: builder.mutation<ImageMetadata, { file: File }>({
  query: ({ file }) => {
    const formData = new FormData()
    formData.append('file', file)
    return {
      url: '/api/v2/gallery/upload',
      method: 'POST',
      body: formData,
    }
  },
})
```

**Packages**:
- ✅ `@repo/api-client` - Base query utilities already integrated
- ✅ `@repo/logger` - Already used in `instructions-api.ts`
- ✅ `zod` - Already in package dependencies
- ✅ `@reduxjs/toolkit/query/react` - Already in package dependencies

**Verdict**: Very high reuse potential. ~80% of code can be adapted from existing patterns.

---

## Implementation Approach

### Phase 1: Schema Setup (30 min)

**Files**:
- Create/update: `packages/core/api-client/src/schemas/instructions.ts`

**Tasks**:
1. Import or define Zod schemas:
   - `MocInstructionsSchema` (for MOC entities)
   - `MocFileSchema` (for file entities)
   - `CreateMocInputSchema` (for POST /mocs)
   - `UpdateMocInputSchema` (for PATCH /mocs/:id)

2. Option A: Import from backend types (preferred if possible):
```typescript
import {
  MocInstructionsSchema,
  CreateMocInputSchema,
  UpdateMocInputSchema,
} from '../../../apps/api/lego-api/domains/instructions/types'
```

3. Option B: Define compatible frontend schemas (if import not feasible):
```typescript
import { z } from 'zod'

export const MocInstructionsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  theme: z.string(),
  tags: z.array(z.string()),
  thumbnailUrl: z.string().url().optional(),
  pieceCount: z.number().int().positive().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const MocFileSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  type: z.enum(['instructions', 'parts-list', 'thumbnail', 'gallery']),
  name: z.string(),
  size: z.number().int().positive(),
  s3Key: z.string(),
  uploadedAt: z.string().datetime(),
})

export const CreateMocInputSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  theme: z.string(),
  tags: z.array(z.string()).optional(),
})

export const UpdateMocInputSchema = CreateMocInputSchema.partial()
```

4. Export from `schemas/index.ts`:
```typescript
export * from './instructions'
```

### Phase 2: Update API Client (2 hours)

**File**: `packages/core/api-client/src/rtk/instructions-api.ts`

**Task 2.1**: Update `tagTypes`
```typescript
const instructionsApi = createApi({
  reducerPath: 'instructionsApi',
  baseQuery: createServerlessBaseQuery({ /* ... */ }),
  tagTypes: ['Moc', 'MocList', 'MocFile'], // Changed from Instruction/InstructionList
  endpoints: (builder) => ({ /* ... */ }),
})
```

**Task 2.2**: Update existing query tags
```typescript
// Update getInstructions query
getInstructions: builder.query<...>({
  // ...
  providesTags: (result) =>
    result
      ? [
          ...result.map(({ id }) => ({ type: 'Moc' as const, id })),
          { type: 'MocList', id: 'LIST' },
        ]
      : [{ type: 'MocList', id: 'LIST' }],
})

// Update getInstructionById query
getInstructionById: builder.query<...>({
  // ...
  providesTags: (result, error, id) => [{ type: 'Moc', id }],
})
```

**Task 2.3**: Add mutation endpoints (copy from wishlist pattern)

```typescript
createMoc: builder.mutation<MocInstructions, CreateMocInput>({
  query: (input) => ({
    url: '/api/v2/mocs',
    method: 'POST',
    body: input,
  }),
  invalidatesTags: [{ type: 'MocList', id: 'LIST' }],
  transformResponse: (response) => MocInstructionsSchema.parse(response),
  onQueryStarted: async (input, { dispatch, queryFulfilled, getCacheEntry }) => {
    // Optimistic update: add temp MOC to list
    const tempId = `temp-${Date.now()}`
    const patchResult = dispatch(
      instructionsApi.util.updateQueryData('getInstructions', undefined, (draft) => {
        draft.unshift({ id: tempId, ...input, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      })
    )
    try {
      const { data: createdMoc } = await queryFulfilled
      // Replace temp with real MOC
      dispatch(
        instructionsApi.util.updateQueryData('getInstructions', undefined, (draft) => {
          const index = draft.findIndex(m => m.id === tempId)
          if (index !== -1) draft[index] = createdMoc
        })
      )
    } catch {
      patchResult.undo()
    }
  },
}),

updateMoc: builder.mutation<MocInstructions, { id: string } & Partial<CreateMocInput>>({
  query: ({ id, ...input }) => ({
    url: `/api/v2/mocs/${id}`,
    method: 'PATCH',
    body: input,
  }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Moc', id },
    { type: 'MocList', id: 'LIST' },
  ],
  transformResponse: (response) => MocInstructionsSchema.parse(response),
  onQueryStarted: async ({ id, ...input }, { dispatch, queryFulfilled }) => {
    // Optimistic update: update MOC in cache
    const patchResults = [
      dispatch(
        instructionsApi.util.updateQueryData('getInstructionById', id, (draft) => {
          Object.assign(draft, input)
        })
      ),
      dispatch(
        instructionsApi.util.updateQueryData('getInstructions', undefined, (draft) => {
          const moc = draft.find(m => m.id === id)
          if (moc) Object.assign(moc, input)
        })
      ),
    ]
    try {
      await queryFulfilled
    } catch {
      patchResults.forEach(p => p.undo())
    }
  },
}),

deleteMoc: builder.mutation<void, { id: string }>({
  query: ({ id }) => ({
    url: `/api/v2/mocs/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Moc', id },
    { type: 'MocList', id: 'LIST' },
  ],
  onQueryStarted: async ({ id }, { dispatch, queryFulfilled }) => {
    // Optimistic update: remove from list
    const patchResult = dispatch(
      instructionsApi.util.updateQueryData('getInstructions', undefined, (draft) => {
        const index = draft.findIndex(m => m.id === id)
        if (index !== -1) draft.splice(index, 1)
      })
    )
    try {
      await queryFulfilled
    } catch {
      patchResult.undo()
    }
  },
}),

uploadFile: builder.mutation<MocFile, { mocId: string; file: File; fileType: string }>({
  query: ({ mocId, file, fileType }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', fileType)
    return {
      url: `/api/v2/mocs/${mocId}/files`,
      method: 'POST',
      body: formData,
    }
  },
  invalidatesTags: (result, error, { mocId }) => [
    { type: 'Moc', id: mocId },
    { type: 'MocFile', id: mocId },
  ],
  transformResponse: (response) => MocFileSchema.parse(response),
}),

deleteFile: builder.mutation<void, { mocId: string; fileId: string }>({
  query: ({ mocId, fileId }) => ({
    url: `/api/v2/mocs/${mocId}/files/${fileId}`,
    method: 'DELETE',
  }),
  invalidatesTags: (result, error, { mocId, fileId }) => [
    { type: 'Moc', id: mocId },
    { type: 'MocFile', id: fileId },
  ],
}),
```

**Task 2.4**: Export hooks
```typescript
export const {
  useGetInstructionsQuery,
  useGetInstructionByIdQuery,
  useToggleInstructionFavoriteMutation,
  useCreateMocMutation,
  useUpdateMocMutation,
  useDeleteMocMutation,
  useUploadFileMutation,
  useDeleteFileMutation,
} = instructionsApi
```

### Phase 3: Write Tests (2-3 hours)

**Unit Tests** (`__tests__/instructions-api.test.ts`):
- Test mutation configs (URLs, methods, bodies)
- Test cache tag definitions
- Test Zod schema validation
- Test optimistic update logic

**Integration Tests** (`__tests__/instructions-api.integration.test.ts`):
- Setup MSW handlers for all endpoints
- Test mutations with mocked API
- Test cache invalidation triggers refetch
- Test optimistic updates in UI state
- Test error handling and rollback

See `TEST-PLAN.md` for detailed test cases.

### Phase 4: Verification (30 min)

**Checklist**:
- [ ] All mutations generate correct HTTP requests
- [ ] Cache tags correctly invalidate queries
- [ ] Optimistic updates work and rollback on error
- [ ] Zod schemas validate responses
- [ ] All hooks exported
- [ ] Unit tests pass (100% coverage)
- [ ] Integration tests pass (90%+ coverage)
- [ ] ESLint/Prettier pass
- [ ] TypeScript compiles with no errors

---

## Technical Decisions

### Decision 1: Schema Import vs Definition

**Options**:
1. Import schemas from backend types (DRY, single source of truth)
2. Define separate frontend schemas (decoupling, flexibility)

**Recommendation**: **Option 2 - Define separate frontend schemas**

**Rationale**:
- Backend types are in a different package (`apps/api/lego-api`)
- Importing creates tight coupling between frontend and backend
- Frontend may need slightly different schemas (e.g., omit internal fields)
- Easier to version independently
- Follows pattern in `wishlist.ts` and `gallery.ts` schemas

**Trade-off**: Schema drift risk - mitigate with schema alignment tests.

### Decision 2: Optimistic Update Scope

**Options**:
1. Optimistic updates for all mutations
2. Optimistic updates for create/update/delete only (not file operations)
3. No optimistic updates (rely on cache invalidation)

**Recommendation**: **Option 2 - Optimistic for CRUD, not file ops**

**Rationale**:
- Create/update/delete are instant user actions → optimistic improves UX
- File uploads have progress indicators → optimistic less critical
- File uploads may fail mid-stream → harder to rollback optimistically
- Simplifies implementation for file operations

**Implementation**: Add `onQueryStarted` to create/update/delete, skip for file mutations.

### Decision 3: File Upload Request Format

**Options**:
1. `FormData` with file + metadata fields
2. JSON body with base64-encoded file
3. Multipart/form-data with JSON part

**Recommendation**: **Option 1 - FormData**

**Rationale**:
- Backend expects `multipart/form-data` (standard for file uploads)
- Pattern already exists in `gallery-api.ts`
- Browser `FormData` API is well-supported
- Efficient for binary data

**Implementation**:
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('fileType', fileType)
```

### Decision 4: Cache Tag Naming

**Options**:
1. Keep existing `Instruction` / `InstructionList` tags
2. Rename to `Moc` / `MocList` for consistency with backend
3. Use both (alias)

**Recommendation**: **Option 2 - Rename to `Moc` / `MocList`**

**Rationale**:
- Backend domain is "MOC Instructions" → entities are MOCs
- Frontend uses "MOC" terminology in UI (gallery, detail page)
- Avoids confusion between "Instruction" (files) and "MOC" (entity)
- Aligns with backend types (`MocInstructions`, `MocFile`)

**Migration**: Update all existing query tags in same PR.

---

## Risks and Mitigations

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| **Path Mismatch**: Frontend calls `/api/v2/mocs`, backend expects `/mocs` | Medium | Low | Verify Vite proxy config rewrites paths correctly; integration tests use MSW with frontend paths |
| **Schema Drift**: Frontend schemas diverge from backend | Medium | Medium | Add schema alignment test; document schema contract; CI fails if schemas incompatible |
| **Cache Invalidation Bugs**: Incorrect tags don't refresh UI | High | Low | Comprehensive integration tests verify all cache invalidation scenarios; manual testing |
| **Optimistic Update Edge Cases**: Rollback fails or partial state | Medium | Low | Unit tests verify rollback logic; error handling logs failures; fallback to refetch |
| **File Upload CORS Issues**: Browser blocks multipart uploads | Low | Very Low | CORS configured in backend API Gateway; test with real browser in local dev |
| **Type Errors**: `z.infer<>` types don't match usage | Low | Very Low | TypeScript strict mode catches at compile time; tests verify types |

---

## Config Considerations

### Vite Proxy Configuration

**File**: `apps/web/main-app/vite.config.ts`

**Current Config** (verify):
```typescript
server: {
  proxy: {
    '/api/v2': {
      target: process.env.VITE_SERVERLESS_API_BASE_URL || 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/v2/, ''),
    },
  },
}
```

**Verification**:
- Frontend calls `/api/v2/mocs` → proxied to backend as `/mocs` ✅
- MSW handlers should match `/api/v2/mocs` (frontend path) ✅

### MSW Handlers

**File**: `packages/core/api-client/src/test/mocks/handlers.ts` (or create if missing)

**Add Handlers**:
```typescript
import { http, HttpResponse } from 'msw'

export const instructionHandlers = [
  http.post('/api/v2/mocs', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'moc-123',
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  http.patch('/api/v2/mocs/:id', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: params.id,
      title: 'Existing MOC',
      ...body,
      updatedAt: new Date().toISOString(),
    })
  }),

  http.delete('/api/v2/mocs/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/v2/mocs/:mocId/files', async ({ params }) => {
    return HttpResponse.json({
      id: 'file-456',
      mocId: params.mocId,
      type: 'instructions',
      name: 'instructions.pdf',
      size: 5242880,
      s3Key: `mocs/${params.mocId}/instructions.pdf`,
      uploadedAt: new Date().toISOString(),
    })
  }),

  http.delete('/api/v2/mocs/:mocId/files/:fileId', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

---

## Effort Breakdown

| Task | Estimated Time | Notes |
|------|----------------|-------|
| Schema setup | 30 min | Define or import Zod schemas |
| Update API client (tagTypes, queries) | 30 min | Rename tags, update existing queries |
| Add mutation endpoints | 1 hour | Copy from wishlist pattern, adapt for MOC |
| Add optimistic update logic | 1 hour | Copy from `reorderWishlist`, test locally |
| Write unit tests | 1.5 hours | Mutation configs, cache tags, validation |
| Write integration tests | 1.5 hours | MSW setup, cache invalidation, error handling |
| Manual testing | 30 min | Smoke test in local dev environment |
| Code review fixes | 30 min | Address PR feedback |
| **TOTAL** | **6-7 hours** | Includes testing and review |

**Parallel Work**:
- Tests can be written concurrently with implementation
- MSW handlers can be added before mutations (TDD approach)

---

## Blockers

**Current Blockers**: None

**Potential Blockers** (mitigated):
- ❌ Backend API incomplete → **Mitigated**: Backend is fully implemented
- ❌ Vite proxy misconfigured → **Mitigated**: Verify config before starting
- ❌ Schema conflicts → **Mitigated**: Define frontend schemas independently

---

## Success Criteria

**Story is DONE when**:
- [x] All 5 mutation hooks added to `instructions-api.ts`
- [x] `tagTypes` updated to `['Moc', 'MocList', 'MocFile']`
- [x] Existing query tags updated for consistency
- [x] Zod schemas added to `@repo/api-client/schemas/instructions.ts`
- [x] All hooks exported from `instructions-api.ts`
- [x] Unit tests pass (100% coverage of mutations)
- [x] Integration tests pass (90%+ coverage with MSW)
- [x] TypeScript compiles with no errors
- [x] ESLint/Prettier pass
- [x] Code review approved
- [x] PR merged to main

---

## Recommendations

### ✅ Proceed with Implementation

**Confidence**: High (95%)

**Reasoning**:
- All dependencies satisfied
- Low technical complexity
- High reuse potential from existing patterns
- Clear scope and acceptance criteria
- Comprehensive test plan
- No blockers

### Suggested Workflow

1. **Day 1 (4 hours)**:
   - Setup schemas (30 min)
   - Update API client with mutations (2 hours)
   - Write unit tests (1.5 hours)

2. **Day 2 (2-3 hours)**:
   - Write integration tests with MSW (1.5 hours)
   - Manual testing in local dev (30 min)
   - Code review and fixes (30-60 min)

### Follow-Up Stories

**Immediate**:
- **INST-1100**: View MOC Gallery - uses `useGetMocsQuery` (depends on this story)
- **INST-1102**: Create Basic MOC - uses `useCreateMocMutation` (depends on this story)

**Future**:
- **INST-1105**: Presigned upload for large files (>10MB) - different upload flow
- **INST-1300**: Upload session test coverage - deep testing of upload edge cases

---

## Appendix: Reference Files

**Patterns to Reference**:
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` - Mutation pattern
- `packages/core/api-client/src/rtk/gallery-api.ts` - File upload pattern
- `packages/core/api-client/src/schemas/wishlist.ts` - Zod schema pattern

**Backend Types**:
- `apps/api/lego-api/domains/instructions/types.ts` - Backend schemas
- `apps/api/lego-api/domains/instructions/routes.ts` - API routes

**Test References**:
- `packages/core/api-client/src/rtk/__tests__/wishlist-gallery-api.test.ts` - Unit test pattern
- `packages/core/api-client/src/rtk/__tests__/wishlist-gallery-api.integration.test.ts` - Integration test pattern

---

## Conclusion

**FEASIBLE** - Story is ready for implementation with high confidence.

**Key Strengths**:
- Clear scope and acceptance criteria
- Complete backend foundation
- Established patterns to reuse
- Comprehensive test plan
- No dependencies or blockers

**Recommended Action**: ✅ **Approve for development**
