# Story 3.3.3: Wishlist API Endpoints

## Status

Draft

## Story

**As a** developer,
**I want** API endpoints for wishlist items,
**so that** users can manage their purchase wishlist.

## Acceptance Criteria

1. ⬜ GET /api/wishlist - list items with pagination
2. ⬜ GET /api/wishlist/:id - single item detail
3. ⬜ POST /api/wishlist - add new item
4. ⬜ PATCH /api/wishlist/:id - update item
5. ⬜ DELETE /api/wishlist/:id - remove item
6. ⬜ POST /api/wishlist/:id/purchased - mark as purchased
7. ⬜ Filter by type (set/instruction) supported
8. ⬜ RTK Query hooks generated

## Tasks / Subtasks

- [ ] **Task 1: CRUD Endpoints**
  - [ ] GET /api/wishlist - list with filters
  - [ ] GET /api/wishlist/:id - single item
  - [ ] POST /api/wishlist - create item
  - [ ] PATCH /api/wishlist/:id - update item
  - [ ] DELETE /api/wishlist/:id - delete item

- [ ] **Task 2: Query Parameters**
  - [ ] `q` - search query
  - [ ] `type` - set | instruction
  - [ ] `theme` - theme filter
  - [ ] `tags` - tag filter
  - [ ] `priority` - priority filter
  - [ ] `sort` / `order` - sorting
  - [ ] `page` / `limit` - pagination

- [ ] **Task 3: Purchase Flow**
  - [ ] POST /api/wishlist/:id/purchased
  - [ ] Create corresponding Set or Instruction record
  - [ ] Remove from wishlist or archive

- [ ] **Task 4: RTK Query Integration**
  - [ ] Create wishlistApi slice
  - [ ] Define all query/mutation hooks
  - [ ] Configure cache invalidation

## Dev Notes

### API Response Shapes

```typescript
// GET /api/wishlist
interface WishlistListResponse {
  items: WishlistItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  counts: {
    total: number
    sets: number
    instructions: number
  }
  filters: {
    availableTags: string[]
    availableThemes: string[]
  }
}

interface WishlistItem {
  id: string
  type: 'set' | 'instruction'
  name: string
  thumbnail: string
  images: Array<{
    id: string
    src: string
    thumbnail: string
  }>
  pieceCount?: number
  theme?: string
  tags: string[]
  price?: number
  currency?: string
  setNumber?: string
  source?: string
  sourceUrl?: string
  notes?: string
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

// POST /api/wishlist
interface CreateWishlistItemRequest {
  type: 'set' | 'instruction'
  name: string
  pieceCount?: number
  theme?: string
  tags?: string[]
  price?: number
  currency?: string
  setNumber?: string
  source?: string
  sourceUrl?: string
  notes?: string
  priority?: 'low' | 'medium' | 'high'
}

// POST /api/wishlist/:id/purchased
interface MarkPurchasedRequest {
  purchaseDate?: string
  purchasePrice?: number
  purchaseCurrency?: string
  notes?: string
}
```

### RTK Query Slice

```typescript
// services/wishlistApi.ts
export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Wishlist'],
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistListResponse, GetWishlistParams>({
      query: (params) => ({
        url: '/wishlist',
        params: {
          q: params.search,
          type: params.type,
          theme: params.theme,
          tags: params.tags?.join(','),
          priority: params.priority,
          sort: params.sort,
          order: params.order,
          page: params.page,
          limit: params.limit,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Wishlist' as const, id })),
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [{ type: 'Wishlist', id: 'LIST' }],
    }),

    getWishlistItem: builder.query<WishlistItem, string>({
      query: (id) => `/wishlist/${id}`,
      providesTags: (result, error, id) => [{ type: 'Wishlist', id }],
    }),

    addToWishlist: builder.mutation<WishlistItem, CreateWishlistItemRequest>({
      query: (data) => ({
        url: '/wishlist',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),

    updateWishlistItem: builder.mutation<WishlistItem, { id: string; data: Partial<WishlistItem> }>({
      query: ({ id, data }) => ({
        url: `/wishlist/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Wishlist', id },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    removeFromWishlist: builder.mutation<void, string>({
      query: (id) => ({
        url: `/wishlist/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),

    markAsPurchased: builder.mutation<{ newItemId: string; type: string }, { id: string; data: MarkPurchasedRequest }>({
      query: ({ id, data }) => ({
        url: `/wishlist/${id}/purchased`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Wishlist', id: 'LIST' },
        // Also invalidate Sets or Instructions depending on type
      ],
    }),

    uploadWishlistImage: builder.mutation<{ imageId: string; url: string }, { itemId: string; formData: FormData }>({
      query: ({ itemId, formData }) => ({
        url: `/wishlist/${itemId}/images`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (result, error, { itemId }) => [{ type: 'Wishlist', id: itemId }],
    }),
  }),
})

export const {
  useGetWishlistQuery,
  useGetWishlistItemQuery,
  useAddToWishlistMutation,
  useUpdateWishlistItemMutation,
  useRemoveFromWishlistMutation,
  useMarkAsPurchasedMutation,
  useUploadWishlistImageMutation,
} = wishlistApi
```

### Backend Handler (Mark as Purchased)

```typescript
// apps/api/src/handlers/wishlist/markPurchased.ts
export const handler = async (event: APIGatewayProxyEvent) => {
  const { id } = event.pathParameters!
  const body = JSON.parse(event.body!)

  // Get wishlist item
  const wishlistItem = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.id, id))
    .get()

  if (!wishlistItem) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
  }

  // Create the actual item based on type
  let newItemId: string

  if (wishlistItem.type === 'set') {
    const [newSet] = await db
      .insert(sets)
      .values({
        name: wishlistItem.name,
        setNumber: wishlistItem.setNumber,
        pieceCount: wishlistItem.pieceCount,
        theme: wishlistItem.theme,
        tags: wishlistItem.tags,
        purchaseDate: body.purchaseDate ?? new Date().toISOString(),
        purchasePrice: body.purchasePrice ?? wishlistItem.price,
        // Copy images from wishlist
      })
      .returning()
    newItemId = newSet.id
  } else {
    const [newInstruction] = await db
      .insert(instructions)
      .values({
        name: wishlistItem.name,
        pieceCount: wishlistItem.pieceCount,
        theme: wishlistItem.theme,
        tags: wishlistItem.tags,
        // Copy images from wishlist
      })
      .returning()
    newItemId = newInstruction.id
  }

  // Delete from wishlist
  await db.delete(wishlistItems).where(eq(wishlistItems.id, id))

  return {
    statusCode: 200,
    body: JSON.stringify({
      newItemId,
      type: wishlistItem.type,
    }),
  }
}
```

## Testing

- [ ] API test: GET /wishlist returns paginated list
- [ ] API test: type filter works
- [ ] API test: POST creates new item
- [ ] API test: PATCH updates item
- [ ] API test: DELETE removes item
- [ ] API test: mark purchased creates new record and removes from wishlist
- [ ] Unit test: RTK Query hooks work correctly

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
