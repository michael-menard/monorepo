# Story sets-1004: Create Set Endpoint

## Status

Draft

## Story

**As a** user,
**I want** to add a new set to my collection via API,
**So that** I can track sets I own.

## Acceptance Criteria

1. [ ] POST /api/sets creates a new set
2. [ ] Validates request body with CreateSetSchema
3. [ ] Associates set with authenticated user
4. [ ] Returns created set with generated ID
5. [ ] Sets default values (isBuilt=false, quantity=1)
6. [ ] RTK Query mutation hook created and exported

## Tasks

- [ ] **Task 1: Create POST endpoint handler**
  - [ ] Create endpoint at apps/api/endpoints/sets/create/
  - [ ] Validate body with CreateSetSchema
  - [ ] Insert into database

- [ ] **Task 2: Handle defaults**
  - [ ] Default isBuilt to false
  - [ ] Default quantity to 1
  - [ ] Default tags to empty array
  - [ ] Set createdAt and updatedAt

- [ ] **Task 3: RTK Query integration**
  - [ ] Add addSet mutation to setsApi
  - [ ] Invalidate LIST cache on success
  - [ ] Export useAddSetMutation hook

## Dev Notes

### Endpoint Handler

```typescript
// apps/api/endpoints/sets/create/handler.ts
import { CreateSetSchema, SetSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const body = JSON.parse(event.body || '{}')

  const input = CreateSetSchema.parse(body)

  const now = new Date().toISOString()
  const set = await db.insert(sets).values({
    ...input,
    userId,
    isBuilt: input.isBuilt ?? false,
    quantity: input.quantity ?? 1,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }).returning()

  return created(SetSchema.parse({ ...set[0], images: [] }))
}
```

### RTK Query Hook

```typescript
addSet: builder.mutation<Set, CreateSetInput>({
  query: (data) => ({
    url: '/sets',
    method: 'POST',
    body: data,
  }),
  invalidatesTags: [{ type: 'Set', id: 'LIST' }],
}),
```

### Validation Notes

- Title is required (min 1 char)
- All other fields optional
- Price fields must be positive if provided
- Quantity must be >= 1 if provided
- Tags array max 10 items, each max 30 chars

## Testing

- [ ] API test: creates set with all fields
- [ ] API test: creates set with only required fields
- [ ] API test: applies default values correctly
- [ ] API test: validates required title field
- [ ] API test: rejects invalid price (negative)
- [ ] API test: rejects invalid quantity (0 or negative)
- [ ] API test: associates with authenticated user
- [ ] API test: unauthenticated request returns 401
- [ ] Unit test: RTK Query mutation invalidates list cache

## Dependencies

- sets-1000: Database Schema
- sets-1001: Zod Schemas

## References

- PRD: docs/prd/epic-7-sets-gallery.md (CRUD Operations - Create)
