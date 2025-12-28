# Story sets-1002: List Sets Endpoint

## Status

Draft

## Story

**As a** user,
**I want** to retrieve my set collection via API,
**So that** the gallery can display my owned sets.

## Acceptance Criteria

1. [ ] GET /api/sets returns paginated list of user's sets
2. [ ] Only returns sets owned by authenticated user
3. [ ] Supports search by title and setNumber
4. [ ] Supports filtering by theme, tags, isBuilt
5. [ ] Supports sorting by title, pieceCount, purchaseDate, purchasePrice, createdAt
6. [ ] Returns pagination metadata (page, limit, total, totalPages)
7. [ ] Returns available filters (themes, tags) for filter UI
8. [ ] RTK Query hook created and exported

## Tasks

- [ ] **Task 1: Create list endpoint handler**
  - [ ] Create endpoint at apps/api/endpoints/sets/list/
  - [ ] Parse and validate query params with SetListQuerySchema
  - [ ] Build Drizzle query with filters

- [ ] **Task 2: Implement filtering**
  - [ ] Search: ILIKE on title and setNumber
  - [ ] Theme filter: exact match
  - [ ] Tags filter: array contains
  - [ ] isBuilt filter: boolean match

- [ ] **Task 3: Implement sorting and pagination**
  - [ ] Dynamic ORDER BY based on sortField/sortDirection
  - [ ] LIMIT/OFFSET pagination
  - [ ] Count query for total

- [ ] **Task 4: Return filter options**
  - [ ] Query distinct themes for user's sets
  - [ ] Query distinct tags for user's sets

- [ ] **Task 5: RTK Query integration**
  - [ ] Add getSets query to setsApi
  - [ ] Configure cache tags
  - [ ] Export useGetSetsQuery hook

## Dev Notes

### Endpoint Handler

```typescript
// apps/api/endpoints/sets/list/handler.ts
import { SetListQuerySchema, SetListResponseSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const query = SetListQuerySchema.parse(parseQueryParams(event))

  const { items, total } = await listSets(userId, query)
  const filters = await getAvailableFilters(userId)

  const response = SetListResponseSchema.parse({
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    filters,
  })

  return success(response)
}
```

### Database Query

```typescript
async function listSets(userId: string, query: SetListQuery) {
  const conditions = [eq(sets.userId, userId)]

  if (query.search) {
    conditions.push(
      or(
        ilike(sets.title, `%${query.search}%`),
        ilike(sets.setNumber, `%${query.search}%`)
      )
    )
  }

  if (query.theme) {
    conditions.push(eq(sets.theme, query.theme))
  }

  if (query.isBuilt !== undefined) {
    conditions.push(eq(sets.isBuilt, query.isBuilt))
  }

  if (query.tags?.length) {
    conditions.push(arrayContains(sets.tags, query.tags))
  }

  const orderColumn = sets[query.sortField]
  const orderDirection = query.sortDirection === 'asc' ? asc : desc

  const [items, countResult] = await Promise.all([
    db.select()
      .from(sets)
      .leftJoin(setImages, eq(sets.id, setImages.setId))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    db.select({ count: count() })
      .from(sets)
      .where(and(...conditions)),
  ])

  return { items: aggregateImages(items), total: countResult[0].count }
}
```

### RTK Query Hook

```typescript
// packages/core/api-client/src/rtk/sets-api.ts
getSets: builder.query<SetListResponse, SetListQuery>({
  query: (params) => ({
    url: '/sets',
    params,
  }),
  providesTags: (result) =>
    result
      ? [
          ...result.items.map(({ id }) => ({ type: 'Set' as const, id })),
          { type: 'Set', id: 'LIST' },
        ]
      : [{ type: 'Set', id: 'LIST' }],
}),
```

## Testing

- [ ] API test: returns only authenticated user's sets
- [ ] API test: unauthenticated request returns 401
- [ ] API test: search filters by title
- [ ] API test: search filters by setNumber
- [ ] API test: theme filter works
- [ ] API test: isBuilt filter works
- [ ] API test: tags filter works
- [ ] API test: sorting works for all fields
- [ ] API test: pagination returns correct page/total
- [ ] API test: empty collection returns empty array
- [ ] Unit test: RTK Query hook works correctly

## Dependencies

- sets-1000: Database Schema
- sets-1001: Zod Schemas

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Read)
