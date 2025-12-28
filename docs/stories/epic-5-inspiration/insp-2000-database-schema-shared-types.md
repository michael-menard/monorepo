# Story insp-2000: Database Schema & Shared Types

## Status

Draft

## Consolidates

- insp-1000.database-schema
- insp-1001.zod-schemas-shared-types

## Story

**As a** developer,
**I want** the database schema and shared Zod types for Inspiration and Album entities,
**so that** I have a foundation for all inspiration gallery CRUD operations.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Data Model section

## Dependencies

None - this is the foundation story

## Acceptance Criteria

### Database Schema

1. `inspirations` table created with all fields from PRD
2. `albums` table created with all fields from PRD
3. `inspiration_albums` junction table for many-to-many relationship
4. `album_parents` junction table for nested album hierarchy (DAG)
5. `inspiration_mocs` junction table for MOC linking
6. `album_mocs` junction table for album-to-MOC linking
7. Proper indexes for userId, sortOrder, and foreign key queries
8. Database migration runs successfully

### Zod Schemas

9. InspirationSchema with all entity fields and validation
10. AlbumSchema with all entity fields and validation
11. API request schemas (Create, Update for both entities)
12. API response schemas (Single, List with pagination)
13. Query params schema for filtering/sorting
14. All schemas exported from shared package
15. TypeScript types inferred from Zod schemas

## Tasks / Subtasks

### Task 1: Create Inspiration Table Schema (AC: 1)

- [ ] Create `apps/api/database/schema/inspiration.ts`
- [ ] Define `inspirations` table with all PRD fields:
  - id (UUID, primary key)
  - userId (UUID, foreign key to users, cascade delete)
  - imageUrl (text, required)
  - title (text, optional)
  - description (text, optional)
  - sourceUrl (text, optional)
  - tags (text array, default [])
  - sortOrder (integer, required, default 0)
  - createdAt (timestamp, required)
  - updatedAt (timestamp, required)
- [ ] Add userId index
- [ ] Add userId + sortOrder composite index

### Task 2: Create Album Table Schema (AC: 2)

- [ ] Define `albums` table with all PRD fields:
  - id (UUID, primary key)
  - userId (UUID, foreign key to users, cascade delete)
  - title (text, required)
  - description (text, optional)
  - coverImageId (UUID, optional, references inspirations)
  - tags (text array, default [])
  - sortOrder (integer, required, default 0)
  - createdAt (timestamp, required)
  - updatedAt (timestamp, required)
- [ ] Add userId index
- [ ] Add userId + sortOrder composite index

### Task 3: Create Junction Tables (AC: 3, 4, 5, 6)

- [ ] Create `inspiration_albums` junction table
  - inspirationId (UUID, FK to inspirations)
  - albumId (UUID, FK to albums)
  - sortOrder (integer, for ordering within album)
  - Composite primary key (inspirationId, albumId)
- [ ] Create `album_parents` junction table
  - albumId (UUID, FK to albums)
  - parentAlbumId (UUID, FK to albums)
  - Composite primary key (albumId, parentAlbumId)
- [ ] Create `inspiration_mocs` junction table
  - inspirationId (UUID, FK to inspirations)
  - mocId (UUID, FK to mocs)
  - Composite primary key
- [ ] Create `album_mocs` junction table
  - albumId (UUID, FK to albums)
  - mocId (UUID, FK to mocs)
  - Composite primary key

### Task 4: Create Indexes (AC: 7)

- [ ] Add index on inspirations.userId
- [ ] Add composite index on inspirations.(userId, sortOrder)
- [ ] Add index on albums.userId
- [ ] Add composite index on albums.(userId, sortOrder)
- [ ] Add indexes on all junction table foreign keys

### Task 5: Run Migrations (AC: 8)

- [ ] Generate migration files with `pnpm db:generate`
- [ ] Review generated SQL
- [ ] Apply migration with `pnpm db:migrate`
- [ ] Verify tables created correctly
- [ ] Test rollback works

### Task 6: Create Inspiration Zod Schemas (AC: 9, 11, 12)

- [ ] Create `packages/core/api-client/src/schemas/inspiration.ts`
- [ ] Define InspirationSchema with all fields and validation:
  - id: uuid
  - userId: uuid
  - imageUrl: url (required)
  - title: string max 200 (nullable)
  - description: string max 2000 (nullable)
  - sourceUrl: url (nullable)
  - tags: array of strings, max 10 items, max 50 chars each
  - albumIds: array of uuids (computed, for response)
  - mocIds: array of uuids (computed, for response)
  - sortOrder: nonnegative integer
  - createdAt: datetime
  - updatedAt: datetime
- [ ] Define InspirationSummarySchema (for list views)
- [ ] Define CreateInspirationRequestSchema
- [ ] Define UpdateInspirationRequestSchema (partial)
- [ ] Define InspirationResponseSchema
- [ ] Define InspirationListResponseSchema

### Task 7: Create Album Zod Schemas (AC: 10, 11, 12)

- [ ] Create album schemas in same file or separate
- [ ] Define AlbumSchema with all fields
- [ ] Define AlbumSummarySchema (for list views)
- [ ] Define AlbumWithContentsSchema (inspirations + nested albums)
- [ ] Define CreateAlbumRequestSchema
- [ ] Define UpdateAlbumRequestSchema
- [ ] Define AlbumResponseSchema
- [ ] Define AlbumListResponseSchema
- [ ] Define AlbumContentsResponseSchema

### Task 8: Create Query Params Schema (AC: 13)

- [ ] Define InspirationQueryParamsSchema:
  - q: search string (optional)
  - tags: comma-separated (optional)
  - albumId: filter by album (optional)
  - hasAlbum: boolean filter (optional)
  - sort: sortOrder | createdAt | title
  - order: asc | desc
  - page: number, min 1, default 1
  - limit: number, min 1, max 100, default 20
- [ ] Define AlbumQueryParamsSchema similarly

### Task 9: Export Schemas (AC: 14, 15)

- [ ] Export all schemas from `schemas/inspiration.ts`
- [ ] Export all types via `z.infer<>`
- [ ] Add to package index exports
- [ ] Verify imports work from FE and BE

## Dev Notes

### Drizzle Schema

```typescript
// apps/api/database/schema/inspiration.ts
import { pgTable, uuid, text, integer, timestamp, index, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'

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
  coverImageId: uuid('cover_image_id'), // References inspirations, but nullable
  tags: text('tags').array().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('albums_user_id_idx').on(table.userId),
  userSortIdx: index('albums_user_sort_idx').on(table.userId, table.sortOrder),
}))

// Junction: Inspiration <-> Album (many-to-many)
export const inspirationAlbums = pgTable('inspiration_albums', {
  inspirationId: uuid('inspiration_id').notNull().references(() => inspirations.id, { onDelete: 'cascade' }),
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.inspirationId, table.albumId] }),
  albumIdx: index('inspiration_albums_album_idx').on(table.albumId),
}))

// Junction: Album <-> Parent Album (DAG hierarchy)
export const albumParents = pgTable('album_parents', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  parentAlbumId: uuid('parent_album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.parentAlbumId] }),
  parentIdx: index('album_parents_parent_idx').on(table.parentAlbumId),
}))

// Junction: Inspiration <-> MOC
export const inspirationMocs = pgTable('inspiration_mocs', {
  inspirationId: uuid('inspiration_id').notNull().references(() => inspirations.id, { onDelete: 'cascade' }),
  mocId: uuid('moc_id').notNull(), // FK to mocs table
}, (table) => ({
  pk: primaryKey({ columns: [table.inspirationId, table.mocId] }),
  mocIdx: index('inspiration_mocs_moc_idx').on(table.mocId),
}))

// Junction: Album <-> MOC
export const albumMocs = pgTable('album_mocs', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  mocId: uuid('moc_id').notNull(), // FK to mocs table
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.mocId] }),
  mocIdx: index('album_mocs_moc_idx').on(table.mocId),
}))
```

### Zod Schemas

```typescript
// packages/core/api-client/src/schemas/inspiration.ts
import { z } from 'zod'

// === Inspiration Schemas ===

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
  albumId: z.string().uuid().optional(), // Add to album on create
})

export type CreateInspirationRequest = z.infer<typeof CreateInspirationRequestSchema>

export const UpdateInspirationRequestSchema = CreateInspirationRequestSchema
  .omit({ imageUrl: true, albumId: true })
  .partial()

export type UpdateInspirationRequest = z.infer<typeof UpdateInspirationRequestSchema>

export const InspirationQueryParamsSchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(), // comma-separated
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

// === Album Schemas ===

export const AlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  coverImageId: z.string().uuid().nullable(),
  coverImageUrl: z.string().url().nullable(), // Computed from coverImageId
  tags: z.array(z.string().max(50)).max(10).default([]),
  parentAlbumIds: z.array(z.string().uuid()).default([]),
  mocIds: z.array(z.string().uuid()).default([]),
  itemCount: z.number().int().nonnegative().default(0), // Computed
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
  inspirationIds: z.array(z.string().uuid()).optional(), // Initial items
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
```

### File Locations

```
apps/api/database/schema/
  inspiration.ts           # New - Drizzle schema
  index.ts                 # Update - export inspiration tables

packages/core/api-client/src/schemas/
  inspiration.ts           # New - Zod schemas
  index.ts                 # Update - export inspiration schemas
```

## Testing

### Schema Tests

- [ ] Migration generates valid SQL
- [ ] Migration applies successfully
- [ ] All tables created with correct column types
- [ ] Foreign key constraints enforced
- [ ] Cascade delete works (user deletion removes inspirations/albums)
- [ ] Indexes created successfully
- [ ] Rollback migration works

### Zod Validation Tests

```typescript
// Valid inspiration
InspirationSchema.parse({
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  imageUrl: 'https://example.com/image.jpg',
  title: 'My Inspiration',
  // ...
})

// Invalid - missing required imageUrl
CreateInspirationRequestSchema.parse({}) // Should throw

// Invalid - too many tags
CreateInspirationRequestSchema.parse({
  imageUrl: 'https://example.com/image.jpg',
  tags: Array(11).fill('tag'), // More than 10
}) // Should throw

// Invalid - tag too long
CreateInspirationRequestSchema.parse({
  imageUrl: 'https://example.com/image.jpg',
  tags: ['a'.repeat(51)], // More than 50 chars
}) // Should throw

// Valid album
CreateAlbumRequestSchema.parse({
  title: 'My Album',
  description: 'A collection of inspirations',
})

// Invalid - empty title
CreateAlbumRequestSchema.parse({
  title: '',
}) // Should throw
```

- [ ] All schemas validate correct data
- [ ] Schemas reject invalid data with appropriate errors
- [ ] Type inference works correctly (`z.infer<>`)
- [ ] Imports resolve from both FE and BE packages

## Definition of Done

- [ ] Drizzle schema matches PRD data model exactly
- [ ] Junction tables support many-to-many relationships
- [ ] Indexes optimize common query patterns
- [ ] Migration runs without errors
- [ ] Zod schemas provide runtime validation
- [ ] TypeScript types auto-inferred from Zod
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1000, insp-1001         | Claude   |
