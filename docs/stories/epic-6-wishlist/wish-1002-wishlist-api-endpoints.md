# Story wish-1002: Wishlist API Endpoints

## Status

Draft

## Story

**As a** developer,
**I want** API endpoints for wishlist items,
**so that** users can manage their purchase wishlist.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides database schema and Zod validation)

## Acceptance Criteria

1. ⬜ GET /api/wishlist - list items with pagination
2. ⬜ GET /api/wishlist/:id - single item detail
3. ⬜ POST /api/wishlist - add new item
4. ⬜ PATCH /api/wishlist/:id - update item
5. ⬜ DELETE /api/wishlist/:id - remove item
6. ⬜ POST /api/wishlist/:id/purchased - mark as purchased (stub if Sets API unavailable)
7. ⬜ Filter by store (LEGO, Barweer, etc.) supported
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
  - [ ] `store` - LEGO | Barweer | Other
  - [ ] `tags` - tag filter
  - [ ] `priority` - priority filter (0-5)
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
// Use Zod schemas from @repo/api-client/schemas/wishlist (defined in wish-1004)
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
    byStore: Record<string, number>  // { LEGO: 5, Barweer: 3, ... }
  }
  filters: {
    availableTags: string[]
    availableStores: string[]
  }
}

// WishlistItem matches schema from wish-1004
interface WishlistItem {
  id: string
  userId: string
  title: string
  store: string  // LEGO, Barweer, Cata, Other
  setNumber?: string
  sourceUrl?: string
  imageUrl?: string
  price?: number
  currency: string
  pieceCount?: number
  releaseDate?: string
  tags: string[]
  priority: number  // 0-5 scale (0=unset, 5=must have)
  notes?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// POST /api/wishlist
interface CreateWishlistItemRequest {
  title: string
  store: string
  setNumber?: string
  sourceUrl?: string
  imageUrl?: string
  price?: number
  currency?: string
  pieceCount?: number
  releaseDate?: string
  tags?: string[]
  priority?: number  // defaults to 0
  notes?: string
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
// packages/core/api-client/src/rtk/wishlist-api.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from './base-query'
import {
  WishlistListResponseSchema,
  WishlistItemSchema,
  CreateWishlistItemSchema
} from '../schemas/wishlist'

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Wishlist'],
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistListResponse, GetWishlistParams>({
      query: (params) => ({
        url: '/wishlist',
        params: {
          q: params.search,
          store: params.store,
          tags: params.tags?.join(','),
          priority: params.priority,
          sort: params.sort,
          order: params.order,
          page: params.page,
          limit: params.limit,
        },
      }),
      transformResponse: (response) => WishlistListResponseSchema.parse(response),
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
      transformResponse: (response) => WishlistItemSchema.parse(response),
      providesTags: (result, error, id) => [{ type: 'Wishlist', id }],
    }),

    addToWishlist: builder.mutation<WishlistItem, CreateWishlistItemRequest>({
      query: (data) => ({
        url: '/wishlist',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response) => WishlistItemSchema.parse(response),
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),

    updateWishlistItem: builder.mutation<WishlistItem, { id: string; data: Partial<WishlistItem> }>({
      query: ({ id, data }) => ({
        url: `/wishlist/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response) => WishlistItemSchema.parse(response),
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

    markAsPurchased: builder.mutation<{ newItemId: string; store: string }, { id: string; data: MarkPurchasedRequest }>({
      query: ({ id, data }) => ({
        url: `/wishlist/${id}/purchased`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Wishlist', id: 'LIST' },
        // Also invalidate Sets or Instructions depending on destination
      ],
    }),

    uploadWishlistImage: builder.mutation<{ imageUrl: string }, { itemId: string; formData: FormData }>({
      query: ({ itemId, formData }) => ({
        url: `/wishlist/${itemId}/image`,
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
// apps/api/endpoints/wishlist/purchased/handler.ts
// Note: This is a stub implementation. The actual "Got It" flow moves items
// to Sets or Instructions galleries, which may not be implemented yet.
// See wish-1009 for the full "Got It" modal flow.

export const handler = async (event: APIGatewayProxyEvent) => {
  const { id } = event.pathParameters!
  const body = MarkPurchasedRequestSchema.parse(JSON.parse(event.body!))
  const userId = getUserIdFromEvent(event)

  // Get wishlist item (owned by user)
  const wishlistItem = await db
    .select()
    .from(wishlistItems)
    .where(and(
      eq(wishlistItems.id, id),
      eq(wishlistItems.userId, userId)
    ))
    .get()

  if (!wishlistItem) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
  }

  // For MVP: Simply delete from wishlist
  // Future: Create corresponding record in Sets or Instructions gallery
  // based on user selection in the "Got It" modal (see wish-1009)

  await db.delete(wishlistItems).where(eq(wishlistItems.id, id))

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Item marked as purchased and removed from wishlist',
      store: wishlistItem.store,
    }),
  }
}
```

## Testing

- [ ] API test: GET /wishlist returns paginated list
- [ ] API test: store filter works (LEGO, Barweer, etc.)
- [ ] API test: POST creates new item with correct schema
- [ ] API test: PATCH updates item
- [ ] API test: DELETE removes item
- [ ] API test: mark purchased removes from wishlist
- [ ] Unit test: RTK Query hooks work correctly
- [ ] Unit test: Zod schema validation in transformResponse

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
