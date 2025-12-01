# Story 3.2.3: Inspiration Gallery API Endpoints

## Status

Draft

## Story

**As a** developer,
**I want** API endpoints for inspiration images and collections,
**so that** the gallery can perform CRUD operations.

## Acceptance Criteria

1. ⬜ GET /api/inspiration - list images with pagination
2. ⬜ GET /api/inspiration/:id - single image detail
3. ⬜ POST /api/inspiration - upload new image
4. ⬜ PATCH /api/inspiration/:id - update image metadata
5. ⬜ DELETE /api/inspiration/:id - delete image
6. ⬜ GET /api/collections - list collections
7. ⬜ POST /api/collections - create collection
8. ⬜ Filter by collection supported
9. ⬜ Link to MOC operation supported

## Tasks / Subtasks

- [ ] **Task 1: Image Endpoints**
  - [ ] GET /api/inspiration - list with filters
  - [ ] GET /api/inspiration/:id - single image
  - [ ] POST /api/inspiration - create/upload
  - [ ] PATCH /api/inspiration/:id - update
  - [ ] DELETE /api/inspiration/:id - delete

- [ ] **Task 2: Collection Endpoints**
  - [ ] GET /api/collections - list user's collections
  - [ ] POST /api/collections - create collection
  - [ ] PATCH /api/collections/:id - rename collection
  - [ ] DELETE /api/collections/:id - delete collection

- [ ] **Task 3: Linking Operations**
  - [ ] POST /api/inspiration/:id/link - link to MOC
  - [ ] DELETE /api/inspiration/:id/link - unlink from MOC

- [ ] **Task 4: RTK Query Integration**
  - [ ] Create inspirationApi slice
  - [ ] Create collectionsApi slice
  - [ ] Configure mutations with cache invalidation

## Dev Notes

### API Response Shapes

```typescript
// GET /api/inspiration
interface InspirationListResponse {
  items: InspirationImage[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    availableTags: string[]
    availableCollections: Collection[]
  }
}

interface InspirationImage {
  id: string
  src: string
  thumbnail: string
  caption?: string
  collectionId?: string
  collectionName?: string
  linkedMocId?: string
  linkedMocName?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// GET /api/collections
interface CollectionsResponse {
  items: Collection[]
}

interface Collection {
  id: string
  name: string
  imageCount: number
  thumbnail?: string
  createdAt: string
}
```

### RTK Query Slice

```typescript
// services/inspirationApi.ts
export const inspirationApi = createApi({
  reducerPath: 'inspirationApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Inspiration', 'Collection'],
  endpoints: (builder) => ({
    // Images
    getInspirationImages: builder.query<InspirationListResponse, GetInspirationParams>({
      query: (params) => ({
        url: '/inspiration',
        params: {
          q: params.search,
          collection: params.collectionId,
          tags: params.tags?.join(','),
          sort: params.sort,
          order: params.order,
          page: params.page,
          limit: params.limit,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Inspiration' as const, id })),
              { type: 'Inspiration', id: 'LIST' },
            ]
          : [{ type: 'Inspiration', id: 'LIST' }],
    }),

    uploadInspirationImage: builder.mutation<InspirationImage, FormData>({
      query: (formData) => ({
        url: '/inspiration',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Inspiration', id: 'LIST' }],
    }),

    updateInspirationImage: builder.mutation<InspirationImage, { id: string; data: UpdateInspirationData }>({
      query: ({ id, data }) => ({
        url: `/inspiration/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Inspiration', id },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    deleteInspirationImage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/inspiration/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Inspiration', id: 'LIST' }],
    }),

    linkToMoc: builder.mutation<void, { imageId: string; mocId: string }>({
      query: ({ imageId, mocId }) => ({
        url: `/inspiration/${imageId}/link`,
        method: 'POST',
        body: { mocId },
      }),
      invalidatesTags: (result, error, { imageId }) => [
        { type: 'Inspiration', id: imageId },
      ],
    }),

    // Collections
    getCollections: builder.query<CollectionsResponse, void>({
      query: () => '/collections',
      providesTags: [{ type: 'Collection', id: 'LIST' }],
    }),

    createCollection: builder.mutation<Collection, { name: string }>({
      query: (data) => ({
        url: '/collections',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Collection', id: 'LIST' }],
    }),

    deleteCollection: builder.mutation<void, string>({
      query: (id) => ({
        url: `/collections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Collection', id: 'LIST' }, { type: 'Inspiration', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetInspirationImagesQuery,
  useUploadInspirationImageMutation,
  useUpdateInspirationImageMutation,
  useDeleteInspirationImageMutation,
  useLinkToMocMutation,
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
} = inspirationApi
```

### Update Data Types

```typescript
interface UpdateInspirationData {
  caption?: string
  collectionId?: string | null  // null to remove from collection
  tags?: string[]
}
```

## Testing

- [ ] API test: GET /inspiration returns paginated list
- [ ] API test: POST /inspiration creates new image
- [ ] API test: PATCH /inspiration/:id updates metadata
- [ ] API test: DELETE /inspiration/:id removes image
- [ ] API test: collection filter works
- [ ] API test: link/unlink to MOC works
- [ ] API test: collection CRUD works

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
