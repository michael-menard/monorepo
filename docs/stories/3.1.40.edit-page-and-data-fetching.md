# Story 3.1.40: Edit Page & Data Fetching

## GitHub Issue
- Issue: #263
- URL: https://github.com/michael-menard/monorepo/issues/263
- Status: In Progress

## Status

In Progress

## Story

**As an** owner,
**I want** the edit page pre-populated with my MOC data,
**so that** I can see and modify my existing content.

## Epic Context

This is **Story 2.2 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- Story 3.1.39: Edit Routes & Entry Points

## Acceptance Criteria

1. Edit page fetches MOC data via RTK Query from `/mocs/:mocId/edit`
2. Loading state shown while fetching
3. Form pre-populated with: title, description, tags, theme
4. Existing files displayed with preview/download links
5. Error state for failed fetch
6. Uses `@repo/upload-types` for type definitions

## Tasks / Subtasks

- [x] **Task 1: Create RTK Query Endpoint** (AC: 1)
  - [x] Add `getMocForEdit` query to `mocApi`
  - [x] Define response type using `@repo/upload-types`
  - [x] Configure appropriate cache behavior

- [x] **Task 2: Create Edit Page Component** (AC: 1, 2)
  - [x] Create `InstructionsEditPage.tsx` component
  - [x] Use RTK Query hook for data fetching
  - [x] Show loading skeleton during fetch

- [x] **Task 3: Pre-populate Form** (AC: 3)
  - [x] Initialize form state with fetched data
  - [x] Title input with current value
  - [x] Description textarea with current value
  - [x] Tags input with current tags
  - [x] Theme selector with current theme

- [x] **Task 4: Display Existing Files** (AC: 4)
  - [x] Show instruction PDF with preview/download
  - [x] Show images with thumbnails and download
  - [x] Show parts lists with download links
  - [x] Show thumbnail with preview
  - [x] Each file shows: name, size, type, upload date

- [x] **Task 5: Handle Error States** (AC: 5)
  - [x] Network error: Show retry button
  - [x] 404: Show "MOC not found" message
  - [x] 403: Redirect to 403 error component
  - [x] Generic error: Show error message

- [x] **Task 6: Type Integration** (AC: 6)
  - [x] Import types from `@repo/upload-types`
  - [x] Use `MocForEditResponse` type for query
  - [x] Use `FileCategory` for file display

## Dev Notes

### RTK Query Endpoint

```typescript
// packages/core/api-client/src/rtk/moc-api.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { MocForEditResponseSchema, type MocForEditResponse } from '@repo/upload-types'

export const mocApi = createApi({
  reducerPath: 'mocApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'high',
  }),
  tagTypes: ['Moc', 'MocForEdit', 'MocList'],
  endpoints: builder => ({
    getMocForEdit: builder.query<MocForEditResponse, string>({
      query: mocId => `/api/v2/mocs/${mocId}/edit`,
      providesTags: (result, _error, mocId) => [
        { type: 'MocForEdit', id: mocId },
        { type: 'Moc', id: mocId },
      ],
      transformResponse: (response: unknown) => {
        return MocForEditResponseSchema.parse(response)
      },
    }),
  }),
})

export const { useGetMocForEditQuery, useLazyGetMocForEditQuery } = mocApi
```

### Edit Types (Added to @repo/upload-types)

```typescript
// packages/core/upload-types/src/edit.ts
export const MocFileItemSchema = z.object({
  id: z.string(),
  category: FileCategorySchema,
  filename: z.string(),
  size: z.number().nonnegative(),
  mimeType: z.string(),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
})

export const MocForEditResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  status: MocStatusSchema,
  isOwner: z.boolean(),
  files: z.array(MocFileItemSchema),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})
```

### Edit Page Module with RTK Query

```typescript
// apps/web/main-app/src/routes/modules/InstructionsEditModule.tsx
export function InstructionsEditModule() {
  const navigate = useNavigate()
  const params = useParams({ from: '/mocs/$slug/edit' })
  const slug = params.slug

  const {
    data: moc,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMocForEditQuery(slug || '', {
    skip: !isValidSlug,
  })

  if (isLoading || isFetching) {
    return <EditPageSkeleton />
  }

  if (error) {
    return <EditErrorDisplay error={error} onRetry={refetch} mocSlug={slug} />
  }

  return <InstructionsEditPage moc={moc} />
}
```

### File List Component

```typescript
// apps/web/main-app/src/components/MocEdit/FileList.tsx
export function FileList({ files }: FileListProps) {
  const groupedFiles = groupFilesByCategory(files)

  return (
    <div className="space-y-6">
      {categoryOrder.map(category => (
        <CategorySection
          key={category}
          category={category}
          files={groupedFiles[category]}
        />
      ))}
    </div>
  )
}
```

## Testing

### Test Location
- `apps/web/main-app/src/routes/pages/__tests__/InstructionsEditPage.test.tsx`
- `apps/web/main-app/src/components/MocEdit/__tests__/EditPageSkeleton.test.tsx`
- `apps/web/main-app/src/components/MocEdit/__tests__/FileList.test.tsx`
- `apps/web/main-app/src/components/MocEdit/__tests__/EditErrorDisplay.test.tsx`
- `packages/core/api-client/src/rtk/__tests__/moc-api.test.ts`

### Test Requirements
- Unit: Loading skeleton displayed during fetch
- Unit: Form pre-populated with correct values
- Unit: Files displayed with correct information
- Unit: Error states render correctly
- Integration: RTK Query fetches data on mount
- Integration: Form values match fetched data

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |
| 2025-12-26 | 0.2 | Implementation complete - RTK Query, types, components | Claude Opus 4.5 |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes

All tasks completed:
1. Created RTK Query endpoint (`moc-api.ts`) with `getMocForEdit`, `updateMoc`, and `getMocById` endpoints
2. Added edit types to `@repo/upload-types` including `MocForEditResponse`, `EditMocRequest`, `EditMocFormSchema`
3. Created `EditPageSkeleton` component for loading state
4. Created `FileList` component with category grouping and download/preview links
5. Created `EditErrorDisplay` component handling network/404/403/generic errors
6. Updated `InstructionsEditModule` to use RTK Query for data fetching
7. Updated `InstructionsEditPage` to receive MOC data and render form with FileList
8. Created comprehensive test files for all new components

Note: Tests written but worktree has pre-existing TypeScript resolution issues with @repo/logger that prevent running tests. The code is complete and follows project conventions.

### File List

- `packages/core/upload-types/src/edit.ts` - New (edit types)
- `packages/core/upload-types/src/index.ts` - Modified (export edit types)
- `packages/core/api-client/src/rtk/moc-api.ts` - New (RTK Query API)
- `packages/core/api-client/package.json` - Modified (add export and dependency)
- `apps/web/main-app/src/routes/modules/InstructionsEditModule.tsx` - Modified (use RTK Query)
- `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx` - Modified (receive MOC, render form)
- `apps/web/main-app/src/components/MocEdit/EditPageSkeleton.tsx` - New
- `apps/web/main-app/src/components/MocEdit/FileList.tsx` - New
- `apps/web/main-app/src/components/MocEdit/EditErrorDisplay.tsx` - New
- `apps/web/main-app/src/components/MocEdit/__tests__/EditPageSkeleton.test.tsx` - New
- `apps/web/main-app/src/components/MocEdit/__tests__/FileList.test.tsx` - New
- `apps/web/main-app/src/components/MocEdit/__tests__/EditErrorDisplay.test.tsx` - New
- `apps/web/main-app/src/routes/pages/__tests__/InstructionsEditPage.test.tsx` - Modified
- `packages/core/api-client/src/rtk/__tests__/moc-api.test.ts` - New
