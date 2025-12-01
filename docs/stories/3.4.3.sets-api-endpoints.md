# Story 3.4.3: Sets Gallery API Endpoints

## Status

Draft

## Story

**As a** developer,
**I want** API endpoints for sets,
**so that** users can manage their set collection.

## Acceptance Criteria

1. ⬜ GET /api/sets - list with pagination
2. ⬜ GET /api/sets/:id - single set detail
3. ⬜ POST /api/sets - add new set
4. ⬜ PATCH /api/sets/:id - update set
5. ⬜ DELETE /api/sets/:id - remove set
6. ⬜ POST /api/sets/:id/mocs - link MOC as alt-build
7. ⬜ DELETE /api/sets/:id/mocs/:mocId - unlink MOC
8. ⬜ Collection summary endpoint
9. ⬜ RTK Query hooks generated

## Tasks / Subtasks

- [ ] **Task 1: CRUD Endpoints**
  - [ ] GET /api/sets - list with filters
  - [ ] GET /api/sets/:id - single set with linked MOCs
  - [ ] POST /api/sets - create set
  - [ ] PATCH /api/sets/:id - update set
  - [ ] DELETE /api/sets/:id - delete set

- [ ] **Task 2: Query Parameters**
  - [ ] `q` - search query (name, set number)
  - [ ] `theme` - theme filter
  - [ ] `tags` - tag filter
  - [ ] `sort` / `order` - sorting
  - [ ] `page` / `limit` - pagination

- [ ] **Task 3: MOC Linking**
  - [ ] POST /api/sets/:id/mocs - link MOC
  - [ ] DELETE /api/sets/:id/mocs/:mocId - unlink MOC
  - [ ] Bidirectional relationship

- [ ] **Task 4: Summary Endpoint**
  - [ ] GET /api/sets/summary - collection stats

- [ ] **Task 5: RTK Query Integration**
  - [ ] Create setsApi slice
  - [ ] Define all query/mutation hooks
  - [ ] Configure cache invalidation

## Dev Notes

### API Response Shapes

```typescript
// GET /api/sets
interface SetsListResponse {
  items: BrickSet[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalSets: number
    totalPieces: number
    totalValue: number
  }
  filters: {
    availableTags: string[]
    availableThemes: string[]
  }
}

interface BrickSet {
  id: string
  name: string
  setNumber: string
  thumbnail: string
  images: Array<{
    id: string
    src: string
    thumbnail: string
  }>
  pieceCount: number
  theme: string
  tags: string[]
  purchaseDate?: string
  purchasePrice?: number
  purchaseCurrency?: string
  notes?: string
  linkedMocs: Array<{
    id: string
    name: string
    thumbnail: string
    pieceCount: number
  }>
  createdAt: string
  updatedAt: string
}

// POST /api/sets
interface CreateSetRequest {
  name: string
  setNumber: string
  pieceCount: number
  theme: string
  tags?: string[]
  purchaseDate?: string
  purchasePrice?: number
  purchaseCurrency?: string
  notes?: string
}

// GET /api/sets/summary
interface SetsSummaryResponse {
  totalSets: number
  totalPieces: number
  totalValue: number
  byTheme: Array<{
    theme: string
    count: number
    pieces: number
    value: number
  }>
  recentlyAdded: BrickSet[]
}
```

### RTK Query Slice

```typescript
// services/setsApi.ts
export const setsApi = createApi({
  reducerPath: 'setsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Set', 'SetSummary'],
  endpoints: (builder) => ({
    getSets: builder.query<SetsListResponse, GetSetsParams>({
      query: (params) => ({
        url: '/sets',
        params: {
          q: params.search,
          theme: params.theme,
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
              ...result.items.map(({ id }) => ({ type: 'Set' as const, id })),
              { type: 'Set', id: 'LIST' },
            ]
          : [{ type: 'Set', id: 'LIST' }],
    }),

    getSetById: builder.query<BrickSet, string>({
      query: (id) => `/sets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Set', id }],
    }),

    getSetsSummary: builder.query<SetsSummaryResponse, void>({
      query: () => '/sets/summary',
      providesTags: [{ type: 'SetSummary' }],
    }),

    addSet: builder.mutation<BrickSet, CreateSetRequest>({
      query: (data) => ({
        url: '/sets',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Set', id: 'LIST' }, { type: 'SetSummary' }],
    }),

    updateSet: builder.mutation<BrickSet, { id: string; data: Partial<BrickSet> }>({
      query: ({ id, data }) => ({
        url: `/sets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Set', id },
        { type: 'Set', id: 'LIST' },
        { type: 'SetSummary' },
      ],
    }),

    deleteSet: builder.mutation<void, string>({
      query: (id) => ({
        url: `/sets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Set', id: 'LIST' }, { type: 'SetSummary' }],
    }),

    linkMocToSet: builder.mutation<void, { setId: string; mocId: string }>({
      query: ({ setId, mocId }) => ({
        url: `/sets/${setId}/mocs`,
        method: 'POST',
        body: { mocId },
      }),
      invalidatesTags: (result, error, { setId }) => [
        { type: 'Set', id: setId },
        // Also invalidate the MOC
      ],
    }),

    unlinkMocFromSet: builder.mutation<void, { setId: string; mocId: string }>({
      query: ({ setId, mocId }) => ({
        url: `/sets/${setId}/mocs/${mocId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { setId }) => [
        { type: 'Set', id: setId },
      ],
    }),

    uploadSetImage: builder.mutation<{ imageId: string; url: string }, { setId: string; formData: FormData }>({
      query: ({ setId, formData }) => ({
        url: `/sets/${setId}/images`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (result, error, { setId }) => [{ type: 'Set', id: setId }],
    }),
  }),
})

export const {
  useGetSetsQuery,
  useGetSetByIdQuery,
  useGetSetsSummaryQuery,
  useAddSetMutation,
  useUpdateSetMutation,
  useDeleteSetMutation,
  useLinkMocToSetMutation,
  useUnlinkMocFromSetMutation,
  useUploadSetImageMutation,
} = setsApi
```

### Database Schema (Drizzle)

```typescript
// Linking table for Set <-> MOC relationship
export const setMocLinks = pgTable('set_moc_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').references(() => sets.id).notNull(),
  mocId: uuid('moc_id').references(() => instructions.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueLink: unique().on(table.setId, table.mocId),
}))
```

## Testing

- [ ] API test: GET /sets returns paginated list
- [ ] API test: search by name and set number works
- [ ] API test: theme filter works
- [ ] API test: POST creates new set
- [ ] API test: PATCH updates set
- [ ] API test: DELETE removes set
- [ ] API test: link/unlink MOC works
- [ ] API test: summary endpoint returns correct stats
- [ ] Unit test: RTK Query hooks work correctly

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
