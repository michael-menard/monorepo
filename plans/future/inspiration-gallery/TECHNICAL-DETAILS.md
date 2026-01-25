# Inspiration Gallery - Technical Details

Code references and implementation patterns for Epic 5.

---

## Database Schema (Drizzle)

```typescript
// apps/api/database/schema/inspiration.ts
import { pgTable, uuid, text, integer, timestamp, index, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'

// ============================================
// Main Tables
// ============================================

export const inspirations = pgTable('inspirations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  title: text('title'),
  description: text('description'),
  sourceUrl: text('source_url'),
  tags: text('tags').array().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('inspirations_user_id_idx').on(table.userId),
  userSortIdx: index('inspirations_user_sort_idx').on(table.userId, table.sortOrder),
}))

export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  coverImageId: uuid('cover_image_id'),
  tags: text('tags').array().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('albums_user_id_idx').on(table.userId),
  userSortIdx: index('albums_user_sort_idx').on(table.userId, table.sortOrder),
}))

// ============================================
// Junction Tables
// ============================================

// Inspiration <-> Album (many-to-many)
export const inspirationAlbums = pgTable('inspiration_albums', {
  inspirationId: uuid('inspiration_id').notNull().references(() => inspirations.id, { onDelete: 'cascade' }),
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.inspirationId, table.albumId] }),
  albumIdx: index('inspiration_albums_album_idx').on(table.albumId),
}))

// Album <-> Parent Album (DAG hierarchy)
export const albumParents = pgTable('album_parents', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  parentAlbumId: uuid('parent_album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.parentAlbumId] }),
  parentIdx: index('album_parents_parent_idx').on(table.parentAlbumId),
}))

// Inspiration <-> MOC (many-to-many)
export const inspirationMocs = pgTable('inspiration_mocs', {
  inspirationId: uuid('inspiration_id').notNull().references(() => inspirations.id, { onDelete: 'cascade' }),
  mocId: uuid('moc_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.inspirationId, table.mocId] }),
  mocIdx: index('inspiration_mocs_moc_idx').on(table.mocId),
}))

// Album <-> MOC (many-to-many)
export const albumMocs = pgTable('album_mocs', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  mocId: uuid('moc_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.mocId] }),
  mocIdx: index('album_mocs_moc_idx').on(table.mocId),
}))
```

---

## Zod Schemas

```typescript
// packages/core/api-client/src/schemas/inspiration.ts
import { z } from 'zod'

// ============================================
// Inspiration Schemas
// ============================================

export const InspirationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  imageUrl: z.string().url(),
  title: z.string().max(200).nullable(),
  description: z.string().max(2000).nullable(),
  sourceUrl: z.string().url().nullable(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  albumIds: z.array(z.string().uuid()).default([]),
  mocIds: z.array(z.string().uuid()).default([]),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Inspiration = z.infer<typeof InspirationSchema>

export const InspirationSummarySchema = InspirationSchema.pick({
  id: true,
  imageUrl: true,
  title: true,
  tags: true,
  sortOrder: true,
})

export type InspirationSummary = z.infer<typeof InspirationSummarySchema>

export const CreateInspirationRequestSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(10).default([]),
  albumId: z.string().uuid().optional(),
})

export type CreateInspirationRequest = z.infer<typeof CreateInspirationRequestSchema>

export const UpdateInspirationRequestSchema = CreateInspirationRequestSchema
  .omit({ imageUrl: true, albumId: true })
  .partial()

export type UpdateInspirationRequest = z.infer<typeof UpdateInspirationRequestSchema>

export const InspirationQueryParamsSchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(),
  albumId: z.string().uuid().optional(),
  hasAlbum: z.enum(['true', 'false']).optional(),
  sort: z.enum(['sortOrder', 'createdAt', 'title']).default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type InspirationQueryParams = z.infer<typeof InspirationQueryParamsSchema>

export const InspirationListResponseSchema = z.object({
  items: z.array(InspirationSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
})

export type InspirationListResponse = z.infer<typeof InspirationListResponseSchema>

// ============================================
// Album Schemas
// ============================================

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  coverImageId: z.string().uuid().nullable(),
  coverImageUrl: z.string().url().nullable(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  parentAlbumIds: z.array(z.string().uuid()).default([]),
  mocIds: z.array(z.string().uuid()).default([]),
  itemCount: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Album = z.infer<typeof AlbumSchema>

export const AlbumSummarySchema = AlbumSchema.pick({
  id: true,
  title: true,
  coverImageUrl: true,
  itemCount: true,
  sortOrder: true,
})

export type AlbumSummary = z.infer<typeof AlbumSummarySchema>

export const AlbumContentsSchema = z.object({
  album: AlbumSchema,
  inspirations: z.array(InspirationSchema),
  nestedAlbums: z.array(AlbumSummarySchema),
  breadcrumbs: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
  })),
})

export type AlbumContents = z.infer<typeof AlbumContentsSchema>

export const CreateAlbumRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  parentAlbumId: z.string().uuid().optional(),
  inspirationIds: z.array(z.string().uuid()).optional(),
})

export type CreateAlbumRequest = z.infer<typeof CreateAlbumRequestSchema>

export const UpdateAlbumRequestSchema = CreateAlbumRequestSchema
  .omit({ parentAlbumId: true, inspirationIds: true })
  .partial()
  .extend({
    coverImageId: z.string().uuid().nullable().optional(),
  })

export type UpdateAlbumRequest = z.infer<typeof UpdateAlbumRequestSchema>

export const AlbumQueryParamsSchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(),
  parentId: z.string().uuid().optional(),
  isRoot: z.enum(['true', 'false']).optional(),
  sort: z.enum(['sortOrder', 'createdAt', 'title', 'itemCount']).default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type AlbumQueryParams = z.infer<typeof AlbumQueryParamsSchema>

export const AlbumListResponseSchema = z.object({
  items: z.array(AlbumSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
})

export type AlbumListResponse = z.infer<typeof AlbumListResponseSchema>

// ============================================
// Presign Schemas
// ============================================

export const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresAt: z.string().datetime(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>
```

---

## RTK Query Slice

```typescript
// packages/core/api-client/src/rtk/inspiration-api.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from './base-query'
import {
  InspirationListResponseSchema,
  InspirationSchema,
  AlbumListResponseSchema,
  AlbumSchema,
  AlbumContentsSchema,
  PresignResponseSchema,
  InspirationQueryParams,
  AlbumQueryParams,
  Inspiration,
  Album,
  AlbumContents,
  InspirationListResponse,
  AlbumListResponse,
  PresignRequest,
  PresignResponse,
  CreateInspirationRequest,
  UpdateInspirationRequest,
  CreateAlbumRequest,
  UpdateAlbumRequest,
} from '../schemas/inspiration'

export const inspirationApi = createApi({
  reducerPath: 'inspirationApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Inspiration', 'Album'],
  endpoints: (builder) => ({
    // Inspirations
    getInspirations: builder.query<InspirationListResponse, Partial<InspirationQueryParams>>({
      query: (params) => ({ url: '/inspirations', params }),
      transformResponse: (response) => InspirationListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Inspiration' as const, id })),
              { type: 'Inspiration', id: 'LIST' },
            ]
          : [{ type: 'Inspiration', id: 'LIST' }],
    }),

    getInspiration: builder.query<Inspiration, string>({
      query: (id) => `/inspirations/${id}`,
      transformResponse: (response) => InspirationSchema.parse(response),
      providesTags: (result, error, id) => [{ type: 'Inspiration', id }],
    }),

    createInspiration: builder.mutation<Inspiration, CreateInspirationRequest>({
      query: (body) => ({ url: '/inspirations', method: 'POST', body }),
      transformResponse: (response) => InspirationSchema.parse(response),
      invalidatesTags: [{ type: 'Inspiration', id: 'LIST' }],
    }),

    updateInspiration: builder.mutation<Inspiration, { id: string; data: UpdateInspirationRequest }>({
      query: ({ id, data }) => ({ url: `/inspirations/${id}`, method: 'PATCH', body: data }),
      transformResponse: (response) => InspirationSchema.parse(response),
      invalidatesTags: (result, error, { id }) => [{ type: 'Inspiration', id }],
    }),

    deleteInspiration: builder.mutation<void, string>({
      query: (id) => ({ url: `/inspirations/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [
        { type: 'Inspiration', id },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    presignInspirationUpload: builder.mutation<PresignResponse, PresignRequest>({
      query: (body) => ({ url: '/inspirations/presign', method: 'POST', body }),
      transformResponse: (response) => PresignResponseSchema.parse(response),
    }),

    // Albums
    getAlbums: builder.query<AlbumListResponse, Partial<AlbumQueryParams>>({
      query: (params) => ({ url: '/albums', params }),
      transformResponse: (response) => AlbumListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Album' as const, id })),
              { type: 'Album', id: 'LIST' },
            ]
          : [{ type: 'Album', id: 'LIST' }],
    }),

    getAlbum: builder.query<Album, string>({
      query: (id) => `/albums/${id}`,
      transformResponse: (response) => AlbumSchema.parse(response),
      providesTags: (result, error, id) => [{ type: 'Album', id }],
    }),

    getAlbumContents: builder.query<AlbumContents, string>({
      query: (id) => `/albums/${id}/contents`,
      transformResponse: (response) => AlbumContentsSchema.parse(response),
      providesTags: (result, error, id) => [
        { type: 'Album', id },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    createAlbum: builder.mutation<Album, CreateAlbumRequest>({
      query: (body) => ({ url: '/albums', method: 'POST', body }),
      transformResponse: (response) => AlbumSchema.parse(response),
      invalidatesTags: [{ type: 'Album', id: 'LIST' }],
    }),

    updateAlbum: builder.mutation<Album, { id: string; data: UpdateAlbumRequest }>({
      query: ({ id, data }) => ({ url: `/albums/${id}`, method: 'PATCH', body: data }),
      transformResponse: (response) => AlbumSchema.parse(response),
      invalidatesTags: (result, error, { id }) => [{ type: 'Album', id }],
    }),

    deleteAlbum: builder.mutation<void, string>({
      query: (id) => ({ url: `/albums/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [
        { type: 'Album', id },
        { type: 'Album', id: 'LIST' },
      ],
    }),

    // Album membership
    addToAlbum: builder.mutation<void, { albumId: string; itemId: string; itemType: 'inspiration' | 'album' }>({
      query: ({ albumId, itemId, itemType }) => ({
        url: `/albums/${albumId}/items`,
        method: 'POST',
        body: { itemId, itemType },
      }),
      invalidatesTags: (result, error, { albumId }) => [
        { type: 'Album', id: albumId },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    removeFromAlbum: builder.mutation<void, { albumId: string; itemId: string }>({
      query: ({ albumId, itemId }) => ({
        url: `/albums/${albumId}/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { albumId }) => [
        { type: 'Album', id: albumId },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    // MOC linking
    linkInspirationToMoc: builder.mutation<void, { inspirationId: string; mocId: string }>({
      query: ({ inspirationId, mocId }) => ({
        url: `/inspirations/${inspirationId}/mocs`,
        method: 'POST',
        body: { mocId },
      }),
      invalidatesTags: (result, error, { inspirationId }) => [{ type: 'Inspiration', id: inspirationId }],
    }),

    unlinkInspirationFromMoc: builder.mutation<void, { inspirationId: string; mocId: string }>({
      query: ({ inspirationId, mocId }) => ({
        url: `/inspirations/${inspirationId}/mocs/${mocId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { inspirationId }) => [{ type: 'Inspiration', id: inspirationId }],
    }),

    linkAlbumToMoc: builder.mutation<void, { albumId: string; mocId: string }>({
      query: ({ albumId, mocId }) => ({
        url: `/albums/${albumId}/mocs`,
        method: 'POST',
        body: { mocId },
      }),
      invalidatesTags: (result, error, { albumId }) => [{ type: 'Album', id: albumId }],
    }),

    unlinkAlbumFromMoc: builder.mutation<void, { albumId: string; mocId: string }>({
      query: ({ albumId, mocId }) => ({
        url: `/albums/${albumId}/mocs/${mocId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { albumId }) => [{ type: 'Album', id: albumId }],
    }),
  }),
})

export const {
  useGetInspirationsQuery,
  useGetInspirationQuery,
  useCreateInspirationMutation,
  useUpdateInspirationMutation,
  useDeleteInspirationMutation,
  usePresignInspirationUploadMutation,
  useGetAlbumsQuery,
  useGetAlbumQuery,
  useGetAlbumContentsQuery,
  useCreateAlbumMutation,
  useUpdateAlbumMutation,
  useDeleteAlbumMutation,
  useAddToAlbumMutation,
  useRemoveFromAlbumMutation,
  useLinkInspirationToMocMutation,
  useUnlinkInspirationFromMocMutation,
  useLinkAlbumToMocMutation,
  useUnlinkAlbumFromMocMutation,
} = inspirationApi
```

---

## S3 Configuration

### Serverless Resources

```yaml
# serverless.yml (resources section)
Resources:
  InspirationsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: ${self:custom.inspirationsBucket}
      CorsConfiguration:
        CorsRules:
          - AllowedOrigins:
              - https://app.example.com
              - http://localhost:3000
            AllowedMethods:
              - PUT
              - GET
            AllowedHeaders:
              - Content-Type
              - x-amz-*
            MaxAge: 3600
      LifecycleConfiguration:
        Rules:
          - Id: DeleteIncompleteUploads
            Status: Enabled
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 1

custom:
  inspirationsBucket: ${self:service}-inspirations-${self:provider.stage}
```

### Environment Variables

```yaml
environment:
  INSPIRATIONS_BUCKET: ${self:custom.inspirationsBucket}
  INSPIRATIONS_BUCKET_URL: https://${self:custom.inspirationsBucket}.s3.amazonaws.com
```

---

## Upload Hook

```typescript
// apps/web/main-app/src/hooks/useInspirationUpload.ts
import { usePresignInspirationUploadMutation } from '@repo/api-client/rtk/inspiration-api'

interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export function useInspirationUpload() {
  const [presign] = usePresignInspirationUploadMutation()

  const upload = async (
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> => {
    // 1. Get presigned URL
    const { uploadUrl, s3Key } = await presign({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }).unwrap()

    // 2. Upload to S3
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          })
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(file)
    })

    // 3. Return S3 key
    return s3Key
  }

  return { upload }
}
```

---

## DAG Cycle Detection

For nested albums, prevent cycles in the album hierarchy:

```typescript
// apps/api/utils/dag-validation.ts
import { db } from '@/database'
import { albumParents } from '@/database/schema'
import { eq } from 'drizzle-orm'

/**
 * Check if adding a parent would create a cycle in the album DAG.
 * Returns true if the relationship would create a cycle.
 */
export async function wouldCreateCycle(
  albumId: string,
  proposedParentId: string
): Promise<boolean> {
  // If they're the same, it's a self-reference (cycle)
  if (albumId === proposedParentId) return true

  // BFS to find if albumId is an ancestor of proposedParentId
  const visited = new Set<string>()
  const queue = [proposedParentId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    // If we reach albumId while traversing parents, adding this
    // relationship would create a cycle
    if (current === albumId) return true

    // Get parents of current album
    const parents = await db
      .select({ parentId: albumParents.parentAlbumId })
      .from(albumParents)
      .where(eq(albumParents.albumId, current))

    for (const { parentId } of parents) {
      if (!visited.has(parentId)) {
        queue.push(parentId)
      }
    }
  }

  return false
}
```

---

## Component Structure

```
apps/web/main-app/src/routes/inspiration/
├── index.tsx                         # Gallery page
├── $id.tsx                           # Detail page
├── album/
│   └── $id.tsx                       # Album view
└── -components/
    ├── InspirationCard/
    │   ├── index.tsx
    │   └── __tests__/
    │       └── InspirationCard.test.tsx
    ├── InspirationUploadModal/
    │   ├── index.tsx
    │   └── __tests__/
    │       └── InspirationUploadModal.test.tsx
    ├── InspirationEditModal/
    │   └── index.tsx
    ├── AlbumCard/
    │   └── index.tsx
    ├── AlbumCreateModal/
    │   └── index.tsx
    ├── AlbumEditModal/
    │   └── index.tsx
    ├── AddToAlbumModal/
    │   └── index.tsx
    ├── MocPickerModal/
    │   └── index.tsx
    ├── BulkActionsToolbar/
    │   └── index.tsx
    └── GalleryFilters/
        └── index.tsx
```

---

## Testing Patterns

### API Handler Tests

```typescript
// apps/api/endpoints/inspirations/__tests__/list.test.ts
import { handler } from '../list/handler'
import { db } from '@/database'
import { inspirations } from '@/database/schema'

describe('GET /api/inspirations', () => {
  it('returns paginated list for authenticated user', async () => {
    // Setup test data
    await db.insert(inspirations).values([
      { userId: 'user-1', imageUrl: 'https://example.com/1.jpg' },
      { userId: 'user-1', imageUrl: 'https://example.com/2.jpg' },
    ])

    const response = await handler({
      requestContext: { authorizer: { userId: 'user-1' } },
      queryStringParameters: { page: '1', limit: '10' },
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.items).toHaveLength(2)
    expect(body.pagination.total).toBe(2)
  })

  it('filters by search query', async () => {
    // Test search functionality
  })

  it('filters by tags', async () => {
    // Test tag filtering
  })
})
```

### Component Tests

```typescript
// apps/web/main-app/src/routes/inspiration/-components/InspirationCard/__tests__/InspirationCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InspirationCard } from '../index'

const mockInspiration = {
  id: '1',
  imageUrl: 'https://example.com/image.jpg',
  title: 'Test Inspiration',
  tags: ['castle', 'medieval', 'fantasy'],
  sortOrder: 0,
}

describe('InspirationCard', () => {
  it('renders image and title', () => {
    render(<InspirationCard inspiration={mockInspiration} />)

    expect(screen.getByRole('img')).toHaveAttribute('src', mockInspiration.imageUrl)
    expect(screen.getByText('Test Inspiration')).toBeInTheDocument()
  })

  it('shows "Untitled" for missing title', () => {
    render(<InspirationCard inspiration={{ ...mockInspiration, title: null }} />)

    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('shows max 3 tags with overflow indicator', () => {
    render(<InspirationCard inspiration={mockInspiration} />)

    expect(screen.getByText('castle')).toBeInTheDocument()
    expect(screen.getByText('medieval')).toBeInTheDocument()
    expect(screen.getByText('fantasy')).toBeInTheDocument()
  })

  it('navigates on click', async () => {
    const user = userEvent.setup()
    render(<InspirationCard inspiration={mockInspiration} />)

    await user.click(screen.getByRole('article'))
    // Verify navigation was triggered
  })
})
```

---

## Accessibility Checklist

- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Buttons have accessible names
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus indicators visible on all interactive elements
- [ ] Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- [ ] Screen reader announces dynamic content changes (ARIA live regions)
- [ ] Modal focus trapping implemented
- [ ] Skip links for main content
- [ ] Reduced motion support (`prefers-reduced-motion`)
