# Story sets-1001: Zod Schemas & Shared Types

## Status

Draft

## Story

**As a** developer,
**I want** Zod schemas defined for Sets data validation,
**So that** API and UI can share type-safe validation logic.

## Acceptance Criteria

1. [ ] SetSchema defined with all fields from PRD data model
2. [ ] CreateSetSchema for POST request validation
3. [ ] UpdateSetSchema for PATCH request validation (partial)
4. [ ] SetListQuerySchema for query parameter validation
5. [ ] All schemas exported from shared types package
6. [ ] TypeScript types inferred from schemas

## Tasks

- [ ] **Task 1: Create base SetSchema**
  - [ ] Define all fields matching database schema
  - [ ] Add proper constraints (min/max, patterns)
  - [ ] Export inferred type

- [ ] **Task 2: Create request schemas**
  - [ ] CreateSetSchema (required fields for creation)
  - [ ] UpdateSetSchema (all optional for partial updates)
  - [ ] Validate purchase fields together

- [ ] **Task 3: Create query schemas**
  - [ ] SetListQuerySchema for list endpoint params
  - [ ] Include pagination, sorting, filtering

- [ ] **Task 4: Create response schemas**
  - [ ] SetResponseSchema (single set with images)
  - [ ] SetListResponseSchema (paginated list)

## Dev Notes

### Base Set Schema

```typescript
// packages/core/api-client/src/schemas/sets.ts
import { z } from 'zod'

export const SetImageSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  position: z.number().int().nonnegative(),
})

export const SetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  // Basic info
  title: z.string().min(1).max(200),
  setNumber: z.string().max(20).nullable(),
  store: z.string().max(100).nullable(),
  sourceUrl: z.string().url().nullable(),
  pieceCount: z.number().int().positive().nullable(),
  releaseDate: z.string().datetime().nullable(),
  theme: z.string().max(50).nullable(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  notes: z.string().max(2000).nullable(),

  // Set status
  isBuilt: z.boolean().default(false),
  quantity: z.number().int().min(1).default(1),

  // Purchase details
  purchasePrice: z.number().positive().nullable(),
  tax: z.number().nonnegative().nullable(),
  shipping: z.number().nonnegative().nullable(),
  purchaseDate: z.string().datetime().nullable(),

  // Images
  images: z.array(SetImageSchema).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Set = z.infer<typeof SetSchema>
export type SetImage = z.infer<typeof SetImageSchema>
```

### Request Schemas

```typescript
export const CreateSetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  setNumber: z.string().max(20).optional(),
  store: z.string().max(100).optional(),
  sourceUrl: z.string().url().optional(),
  pieceCount: z.number().int().positive().optional(),
  releaseDate: z.string().datetime().optional(),
  theme: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  notes: z.string().max(2000).optional(),
  isBuilt: z.boolean().default(false),
  quantity: z.number().int().min(1).default(1),
  purchasePrice: z.number().positive().optional(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  purchaseDate: z.string().datetime().optional(),
})

export const UpdateSetSchema = CreateSetSchema.partial()

export type CreateSetInput = z.infer<typeof CreateSetSchema>
export type UpdateSetInput = z.infer<typeof UpdateSetSchema>
```

### Query Schemas

```typescript
export const SetListQuerySchema = z.object({
  search: z.string().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isBuilt: z.boolean().optional(),
  sortField: z.enum(['title', 'setNumber', 'pieceCount', 'purchaseDate', 'purchasePrice', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type SetListQuery = z.infer<typeof SetListQuerySchema>
```

### Response Schemas

```typescript
export const SetListResponseSchema = z.object({
  items: z.array(SetSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  filters: z.object({
    availableThemes: z.array(z.string()),
    availableTags: z.array(z.string()),
  }),
})

export type SetListResponse = z.infer<typeof SetListResponseSchema>
```

## Testing

- [ ] Unit test: SetSchema validates correct data
- [ ] Unit test: SetSchema rejects invalid data (bad types, missing required)
- [ ] Unit test: CreateSetSchema requires title
- [ ] Unit test: UpdateSetSchema allows partial updates
- [ ] Unit test: SetListQuerySchema has sensible defaults
- [ ] Unit test: Quantity minimum is 1

## Dependencies

- None (foundational)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Data Model section)
