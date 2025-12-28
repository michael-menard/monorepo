# Story sets-1003: Get Single Set Endpoint

## Status

Draft

## Story

**As a** user,
**I want** to retrieve details of a specific set,
**So that** I can view full information on the detail page.

## Acceptance Criteria

1. [ ] GET /api/sets/:id returns single set with all fields
2. [ ] Includes all associated images
3. [ ] Returns 404 if set not found
4. [ ] Returns 403 if set belongs to different user
5. [ ] RTK Query hook created and exported

## Tasks

- [ ] **Task 1: Create get endpoint handler**
  - [ ] Create endpoint at apps/api/endpoints/sets/get/
  - [ ] Extract setId from path params
  - [ ] Validate ownership

- [ ] **Task 2: Fetch set with images**
  - [ ] Query set by ID
  - [ ] Join images ordered by position
  - [ ] Transform to response schema

- [ ] **Task 3: RTK Query integration**
  - [ ] Add getSetById query to setsApi
  - [ ] Configure cache tags by ID
  - [ ] Export useGetSetByIdQuery hook

## Dev Notes

### Endpoint Handler

```typescript
// apps/api/endpoints/sets/get/handler.ts
import { SetSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id

  if (!setId) {
    return badRequest('Set ID required')
  }

  const set = await getSetById(setId)

  if (!set) {
    return notFound('Set not found')
  }

  if (set.userId !== userId) {
    return forbidden('Not authorized to view this set')
  }

  return success(SetSchema.parse(set))
}
```

### Database Query

```typescript
async function getSetById(setId: string) {
  const result = await db
    .select()
    .from(sets)
    .leftJoin(setImages, eq(sets.id, setImages.setId))
    .where(eq(sets.id, setId))
    .orderBy(asc(setImages.position))

  if (result.length === 0) {
    return null
  }

  return aggregateSetWithImages(result)
}

function aggregateSetWithImages(rows: any[]) {
  const set = rows[0].sets
  const images = rows
    .filter(r => r.set_images?.id)
    .map(r => ({
      id: r.set_images.id,
      imageUrl: r.set_images.imageUrl,
      thumbnailUrl: r.set_images.thumbnailUrl,
      position: r.set_images.position,
    }))

  return { ...set, images }
}
```

### RTK Query Hook

```typescript
getSetById: builder.query<Set, string>({
  query: (id) => `/sets/${id}`,
  providesTags: (result, error, id) => [{ type: 'Set', id }],
}),
```

## Testing

- [ ] API test: returns set for valid ID owned by user
- [ ] API test: returns 404 for non-existent ID
- [ ] API test: returns 403 for set owned by different user
- [ ] API test: includes all images ordered by position
- [ ] API test: unauthenticated request returns 401
- [ ] Unit test: RTK Query hook caches by ID

## Dependencies

- sets-1000: Database Schema
- sets-1001: Zod Schemas

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Read)
