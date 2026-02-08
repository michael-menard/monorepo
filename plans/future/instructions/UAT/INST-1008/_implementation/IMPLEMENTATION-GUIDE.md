# INST-1008 Implementation Guide

**Quick Reference for Mutation Implementation**

---

## Phase 1: Create Schema File

**Path**: `packages/core/api-client/src/schemas/instructions.ts` (NEW FILE)

**Content structure**:

```typescript
/**
 * Instructions API Schemas
 * Zod schemas for MOC CRUD mutations and file operations
 * Story INST-1008: Wire RTK Query Mutations for MOC Instructions API
 */

import { z } from 'zod'
import {
  CreateMocInputSchema,
  UpdateMocInputSchema,
  MocInstructionsSchema,
  MocFileSchema,
} from '../../../backend/lego-api/domains/instructions/types'

// Re-export from backend (already have Zod schemas)
export {
  CreateMocInputSchema,
  UpdateMocInputSchema,
  MocInstructionsSchema,
  MocFileSchema,
  type CreateMocInput,
  type UpdateMocInput,
  type MocInstructions,
  type MocFile,
}

// Response schemas (if wrapping responses)
export const CreateMocResponseSchema = MocInstructionsSchema
export const UpdateMocResponseSchema = MocInstructionsSchema
export const DeleteMocResponseSchema = z.void()
export const UploadFileResponseSchema = MocFileSchema
export const DeleteFileResponseSchema = z.void()
export const UploadThumbnailResponseSchema = MocInstructionsSchema

export type CreateMocResponse = z.infer<typeof CreateMocResponseSchema>
export type UpdateMocResponse = z.infer<typeof UpdateMocResponseSchema>
export type DeleteMocResponse = z.infer<typeof DeleteMocResponseSchema>
export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>
export type DeleteFileResponse = z.infer<typeof DeleteFileResponseSchema>
export type UploadThumbnailResponse = z.infer<typeof UploadThumbnailResponseSchema>
```

---

## Phase 2: Update RTK Instructions API

**Path**: `packages/core/api-client/src/rtk/instructions-api.ts`

### Step 1: Import New Schemas & Types

```typescript
// Add to existing imports
import {
  CreateMocInputSchema,
  UpdateMocInputSchema,
  MocInstructionsSchema,
  MocFileSchema,
  type CreateMocInput,
  type UpdateMocInput,
  type MocInstructions,
  type MocFile,
} from '../schemas/instructions'
```

### Step 2: Update tagTypes

```typescript
// BEFORE
tagTypes: ['Instruction', 'InstructionList'],

// AFTER
tagTypes: ['Moc', 'MocList', 'MocFile'],
```

### Step 3: Update Existing Queries

**getInstructions query** - Change `providesTags`:

```typescript
providesTags: result => {
  const tags: Array<{ type: 'Moc'; id: string } | { type: 'MocList' }> = [
    { type: 'MocList' as const },
  ]

  if (result?.data.items) {
    result.data.items.forEach(({ id }) => {
      tags.push({ type: 'Moc' as const, id })
    })
  }

  return tags
},
```

**getInstructionById query** - Change `providesTags`:

```typescript
providesTags: (_result, _error, id) => [{ type: 'Moc' as const, id }],
```

**toggleInstructionFavorite mutation** - Change `invalidatesTags`:

```typescript
invalidatesTags: (_result, _error, { id }) => [
  { type: 'Moc', id },
  'MocList',
],
```

### Step 4: Add 8 New Mutations

Add these to the `endpoints` builder object:

#### Mutation 1: Create MOC

```typescript
/**
 * POST /api/v2/mocs - Create new MOC
 *
 * Implements optimistic update:
 * - Generate temp ID immediately
 * - Add to cache before API response
 * - On success: replace temp item with real item
 * - On error: rollback cache
 */
createMoc: builder.mutation<MocInstructions, CreateMocInput>({
  query: body => ({
    url: SERVERLESS_ENDPOINTS.MOC.CREATE || '/api/v2/mocs',
    method: 'POST',
    body,
  }),
  transformResponse: (response: unknown) => MocInstructionsSchema.parse(response),
  invalidatesTags: [{ type: 'MocList' }],
  async onQueryStarted(arg, { dispatch, queryFulfilled }) {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()

    // Create optimistic item
    const optimisticMoc: MocInstructions = {
      id: tempId,
      userId: 'temp-user',
      title: arg.title,
      description: arg.description || null,
      type: arg.type || 'moc',
      author: arg.author || null,
      partsCount: arg.partsCount || null,
      minifigCount: arg.minifigCount || null,
      theme: arg.theme || null,
      themeId: null,
      subtheme: arg.subtheme || null,
      uploadedDate: null,
      brand: arg.brand || null,
      setNumber: arg.setNumber || null,
      releaseYear: arg.releaseYear || null,
      retired: null,
      designer: null,
      dimensions: null,
      instructionsMetadata: null,
      features: null,
      descriptionHtml: null,
      shortDescription: null,
      difficulty: arg.difficulty || null,
      buildTimeHours: arg.buildTimeHours || null,
      ageRecommendation: arg.ageRecommendation || null,
      status: arg.status || 'draft',
      visibility: arg.visibility || 'private',
      isFeatured: false,
      isVerified: false,
      tags: arg.tags || null,
      thumbnailUrl: null,
      totalPieceCount: null,
      publishedAt: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      slug: null,
      mocId: null,
    }

    // Update cache optimistically
    const patchResult = dispatch(
      instructionsApi.util.updateQueryData('getInstructions', {}, draft => {
        draft.data.items.unshift(optimisticMoc)
        if (draft.pagination) {
          draft.pagination.total += 1
        }
      }),
    )

    try {
      const { data: realMoc } = await queryFulfilled
      // Replace temp item with real item from API
      dispatch(
        instructionsApi.util.updateQueryData('getInstructions', {}, draft => {
          const index = draft.data.items.findIndex(item => item.id === tempId)
          if (index !== -1) {
            draft.data.items[index] = realMoc
          }
        }),
      )
    } catch {
      patchResult.undo()
    }
  },
}),
```

#### Mutation 2: Update MOC

```typescript
/**
 * PATCH /api/v2/mocs/:id - Update MOC metadata
 */
updateMoc: builder.mutation<MocInstructions, { id: string; input: UpdateMocInput }>({
  query: ({ id, input }) => ({
    url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPDATE, { id }),
    method: 'PATCH',
    body: input,
  }),
  transformResponse: (response: unknown) => MocInstructionsSchema.parse(response),
  invalidatesTags: (_result, _error, { id }) => [
    { type: 'Moc', id },
    'MocList',
  ],
}),
```

#### Mutation 3: Delete MOC

```typescript
/**
 * DELETE /api/v2/mocs/:id - Delete MOC permanently
 */
deleteMoc: builder.mutation<void, string>({
  query: id => ({
    url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.DELETE, { id }),
    method: 'DELETE',
  }),
  invalidatesTags: (_result, _error, id) => [
    { type: 'Moc', id },
    'MocList',
  ],
}),
```

#### Mutation 4: Upload Instruction File

```typescript
/**
 * POST /api/v2/mocs/:mocId/files/instruction - Upload instruction PDF
 */
uploadInstructionFile: builder.mutation<
  MocFile,
  { mocId: string; file: File }
>({
  query: ({ mocId, file }) => {
    const formData = new FormData()
    formData.append('file', file)
    return {
      url: buildEndpoint('/api/v2/mocs/{id}/files/instruction', { id: mocId }),
      method: 'POST',
      body: formData,
    }
  },
  transformResponse: (response: unknown) => MocFileSchema.parse(response),
  invalidatesTags: (_result, _error, { mocId }) => [
    { type: 'Moc', id: mocId },
    'MocFile',
  ],
}),
```

#### Mutation 5: Upload Parts List File

```typescript
/**
 * POST /api/v2/mocs/:mocId/files/parts-list - Upload parts list file
 */
uploadPartsListFile: builder.mutation<
  MocFile,
  { mocId: string; file: File }
>({
  query: ({ mocId, file }) => {
    const formData = new FormData()
    formData.append('file', file)
    return {
      url: buildEndpoint('/api/v2/mocs/{id}/files/parts-list', { id: mocId }),
      method: 'POST',
      body: formData,
    }
  },
  transformResponse: (response: unknown) => MocFileSchema.parse(response),
  invalidatesTags: (_result, _error, { mocId }) => [
    { type: 'Moc', id: mocId },
    'MocFile',
  ],
}),
```

#### Mutation 6: Upload Thumbnail

```typescript
/**
 * POST /api/v2/mocs/:mocId/thumbnail - Upload thumbnail image
 */
uploadThumbnail: builder.mutation<
  MocInstructions,
  { mocId: string; file: File }
>({
  query: ({ mocId, file }) => {
    const formData = new FormData()
    formData.append('file', file)
    return {
      url: buildEndpoint('/api/v2/mocs/{id}/thumbnail', { id: mocId }),
      method: 'POST',
      body: formData,
    }
  },
  transformResponse: (response: unknown) => MocInstructionsSchema.parse(response),
  invalidatesTags: (_result, _error, { mocId }) => [
    { type: 'Moc', id: mocId },
  ],
}),
```

#### Mutation 7: Delete File

```typescript
/**
 * DELETE /api/v2/mocs/:mocId/files/:fileId - Delete a file
 */
deleteFile: builder.mutation<
  void,
  { mocId: string; fileId: string }
>({
  query: ({ mocId, fileId }) => ({
    url: buildEndpoint('/api/v2/mocs/{mocId}/files/{fileId}', { mocId, fileId }),
    method: 'DELETE',
  }),
  invalidatesTags: (_result, _error, { mocId }) => [
    { type: 'Moc', id: mocId },
    'MocFile',
  ],
}),
```

### Step 5: Update Exports

```typescript
// AFTER the instructionsApi definition, update the hook exports:

export const {
  useGetInstructionsQuery,
  useLazyGetInstructionsQuery,
  useGetInstructionByIdQuery,
  useLazyGetInstructionByIdQuery,
  useToggleInstructionFavoriteMutation,
  // NEW MUTATIONS
  useCreateMocMutation,
  useUpdateMocMutation,
  useDeleteMocMutation,
  useUploadInstructionFileMutation,
  useUploadPartsListFileMutation,
  useUploadThumbnailMutation,
  useDeleteFileMutation,
} = instructionsApi
```

---

## Phase 3: Update Schema Index

**Path**: `packages/core/api-client/src/schemas/index.ts`

Add after existing imports:

```typescript
// Instruction schemas
export {
  CreateMocInputSchema,
  UpdateMocInputSchema,
  MocInstructionsSchema,
  MocFileSchema,
  type CreateMocInput,
  type UpdateMocInput,
  type MocInstructions,
  type MocFile,
} from './instructions'
```

---

## Phase 4: Add Endpoint Constants (Optional)

If needed, update `packages/core/api-client/src/config/endpoints.ts`:

```typescript
MOC: {
  SEARCH: '/api/v2/mocs/search',
  GET_INSTRUCTION: '/api/v2/mocs/{id}',
  CREATE: '/api/v2/mocs',           // ADD THIS
  UPDATE: '/api/v2/mocs/{id}',
  DELETE: '/api/v2/mocs/{id}',
  // ... rest
},
```

---

## Testing Checklist

Create: `packages/core/api-client/src/rtk/__tests__/instructions-api.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { instructionsApi } from '../instructions-api'

describe('Instructions API Mutations', () => {
  // Test mutation definitions exist
  it('should have createMoc mutation', () => {
    expect(instructionsApi.endpoints.createMoc).toBeDefined()
  })

  it('should have updateMoc mutation', () => {
    expect(instructionsApi.endpoints.updateMoc).toBeDefined()
  })

  // Test tag types
  it('should have correct tagTypes', () => {
    expect(instructionsApi.reducerPath).toBe('instructionsApi')
  })

  // Test hook exports
  it('should export mutation hooks', () => {
    expect(typeof useCreateMocMutation).toBe('function')
    expect(typeof useUpdateMocMutation).toBe('function')
  })
})
```

---

## Files Summary

| File | Action | Size |
|------|--------|------|
| `packages/core/api-client/src/schemas/instructions.ts` | CREATE | ~50 lines |
| `packages/core/api-client/src/rtk/instructions-api.ts` | MODIFY | +300 lines |
| `packages/core/api-client/src/schemas/index.ts` | MODIFY | +10 lines |
| `packages/core/api-client/src/config/endpoints.ts` | MODIFY (optional) | +1 line |
| `packages/core/api-client/src/rtk/__tests__/instructions-api.test.ts` | CREATE | ~50 lines |

---

## Validation Checklist

- [ ] All imports use `@repo/logger`, no console
- [ ] All Zod schemas use `z.infer<>` pattern
- [ ] No TypeScript interfaces (Zod only)
- [ ] All mutations use `transformResponse` with schema validation
- [ ] All mutations handle errors with try/catch or invalidatesTags
- [ ] Logging includes requestId, userId context
- [ ] Hook exports are named exports
- [ ] No barrel files created
- [ ] Tests cover 45%+ of new code
- [ ] Prettier formatting passes
- [ ] No TypeScript errors

---

**Complexity**: Low
**Estimated Time**: 4-6 hours
**Difficulty**: Straightforward pattern reuse from wishlist-gallery-api.ts
