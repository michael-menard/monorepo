# Story sets-1005: Update Set Endpoint

## Status

Draft

## Story

**As a** user,
**I want** to update my set's information,
**So that** I can correct or add details over time.

## Acceptance Criteria

1. [ ] PATCH /api/sets/:id updates set fields
2. [ ] Supports partial updates (only provided fields)
3. [ ] Validates with UpdateSetSchema
4. [ ] Returns 404 if set not found
5. [ ] Returns 403 if set belongs to different user
6. [ ] Updates updatedAt timestamp
7. [ ] RTK Query mutation hook created and exported

## Tasks

- [ ] **Task 1: Create PATCH endpoint handler**
  - [ ] Create endpoint at apps/api/endpoints/sets/update/
  - [ ] Extract setId from path params
  - [ ] Validate body with UpdateSetSchema
  - [ ] Verify ownership before update

- [ ] **Task 2: Implement partial update**
  - [ ] Only update fields present in request
  - [ ] Always update updatedAt
  - [ ] Return updated set

- [ ] **Task 3: RTK Query integration**
  - [ ] Add updateSet mutation to setsApi
  - [ ] Invalidate specific set and LIST cache
  - [ ] Export useUpdateSetMutation hook

## Dev Notes

### Endpoint Handler

```typescript
// apps/api/endpoints/sets/update/handler.ts
import { UpdateSetSchema, SetSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id
  const body = JSON.parse(event.body || '{}')

  if (!setId) {
    return badRequest('Set ID required')
  }

  const existingSet = await getSetById(setId)

  if (!existingSet) {
    return notFound('Set not found')
  }

  if (existingSet.userId !== userId) {
    return forbidden('Not authorized to update this set')
  }

  const input = UpdateSetSchema.parse(body)

  const updated = await db
    .update(sets)
    .set({
      ...input,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sets.id, setId))
    .returning()

  const setWithImages = await getSetById(setId)
  return success(SetSchema.parse(setWithImages))
}
```

### RTK Query Hook

```typescript
updateSet: builder.mutation<Set, { id: string; data: UpdateSetInput }>({
  query: ({ id, data }) => ({
    url: `/sets/${id}`,
    method: 'PATCH',
    body: data,
  }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Set', id },
    { type: 'Set', id: 'LIST' },
  ],
}),
```

### Partial Update Notes

- Empty object `{}` is valid (just updates timestamp)
- Null values explicitly clear optional fields
- Undefined values are ignored (not updated)

## Testing

- [ ] API test: updates single field
- [ ] API test: updates multiple fields
- [ ] API test: partial update preserves other fields
- [ ] API test: null clears optional field
- [ ] API test: updates updatedAt timestamp
- [ ] API test: returns 404 for non-existent ID
- [ ] API test: returns 403 for unauthorized user
- [ ] API test: validates input (rejects invalid values)
- [ ] API test: unauthenticated request returns 401
- [ ] Unit test: RTK Query mutation invalidates caches

## Dependencies

- sets-1000: Database Schema
- sets-1001: Zod Schemas
- sets-1003: Get Set Endpoint (for fetching updated set)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Update)
