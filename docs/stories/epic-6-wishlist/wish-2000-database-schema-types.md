# Story wish-2000: Database Schema & Shared Types

## Status

Draft

## Consolidates

- wish-1004: Database Schema & Zod Types

## Story

**As a** developer,
**I want** the wishlist database schema and shared Zod types defined,
**so that** I have a foundation for all wishlist CRUD operations.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md) - Data Model section

## Dependencies

None - this is the foundation story

## Acceptance Criteria

1. Drizzle schema for `wishlist_items` table created
2. All fields from PRD data model implemented
3. Proper indexes for userId, sortOrder queries
4. Zod schemas created in shared types package
5. TypeScript types inferred from Zod schemas
6. Database migration runs successfully
7. All schemas exported from package index

## Tasks / Subtasks

### Task 1: Create Drizzle Schema (AC: 1, 2, 3)

- [ ] Create `apps/api/database/schema/wishlist.ts`
- [ ] Define `wishlistItems` table with all PRD fields:
  - id (UUID, primary key)
  - userId (UUID, foreign key to users)
  - title (text, required)
  - store (text, required - LEGO, Barweer, Cata, etc.)
  - setNumber (text, optional)
  - sourceUrl (text, optional)
  - imageUrl (text, optional - S3 URL)
  - price (decimal, optional)
  - currency (text, default 'USD')
  - pieceCount (integer, optional)
  - releaseDate (timestamp, optional)
  - tags (text array, default [])
  - priority (integer, default 0, range 0-5)
  - notes (text, optional)
  - sortOrder (integer, required, default 0)
  - createdAt (timestamp, required)
  - updatedAt (timestamp, required)
- [ ] Add foreign key to users table with cascade delete
- [ ] Add indexes: `userId`, `userId + sortOrder`
- [ ] Export from schema index

### Task 2: Create Zod Schemas (AC: 4, 5)

- [ ] Create `packages/core/api-client/src/schemas/wishlist.ts`
- [ ] Define `WishlistItemSchema` with all fields and proper validation
- [ ] Define `CreateWishlistItemSchema` for POST body
- [ ] Define `UpdateWishlistItemSchema` for PATCH body (partial)
- [ ] Define `WishlistListResponseSchema` for GET list response
- [ ] Define `WishlistQueryParamsSchema` for query string validation
- [ ] Export types via `z.infer<>`
- [ ] Export from schemas index

### Task 3: Run Migration (AC: 6)

- [ ] Generate migration with `pnpm db:generate`
- [ ] Review generated SQL
- [ ] Apply migration with `pnpm db:migrate`
- [ ] Verify table created in database

## Dev Notes

### Drizzle Schema

```typescript
// apps/api/database/schema/wishlist.ts
import { pgTable, uuid, text, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Core fields
  title: text('title').notNull(),
  store: text('store').notNull(), // LEGO, Barweer, Cata, etc.
  setNumber: text('set_number'),
  sourceUrl: text('source_url'),
  imageUrl: text('image_url'), // S3 URL

  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),

  // Details
  pieceCount: integer('piece_count'),
  releaseDate: timestamp('release_date'),
  tags: text('tags').array().default([]),

  // User organization
  priority: integer('priority').default(0), // 0-5 scale
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('wishlist_user_id_idx').on(table.userId),
  userSortIdx: index('wishlist_user_sort_idx').on(table.userId, table.sortOrder),
}))
```

### Zod Schemas

```typescript
// packages/core/api-client/src/schemas/wishlist.ts
import { z } from 'zod'

// Store options
export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
export type WishlistStore = z.infer<typeof WishlistStoreSchema>

// Currency options
export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
export type Currency = z.infer<typeof CurrencySchema>

// Base item schema (from database)
export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1),
  store: z.string().min(1),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),
  imageUrl: z.string().url().nullable(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().default('USD'),
  pieceCount: z.number().int().nonnegative().nullable(),
  releaseDate: z.string().datetime().nullable(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

// Create schema (POST body)
export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  imageUrl: z.string().url().optional(),
  price: z.number().nonnegative('Price must be positive').optional(),
  currency: z.string().default('USD'),
  pieceCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().optional(),
})

export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>

// Update schema (PATCH body - all fields optional)
export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial()

export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

// Query params for GET list
export const WishlistQueryParamsSchema = z.object({
  q: z.string().optional(),
  store: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),
  sort: z.enum(['createdAt', 'title', 'price', 'pieceCount', 'sortOrder']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type WishlistQueryParams = z.infer<typeof WishlistQueryParamsSchema>

// List response
export const WishlistListResponseSchema = z.object({
  items: z.array(WishlistItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  counts: z.object({
    total: z.number().int(),
    byStore: z.record(z.string(), z.number()),
  }).optional(),
  filters: z.object({
    availableTags: z.array(z.string()),
    availableStores: z.array(z.string()),
  }).optional(),
})

export type WishlistListResponse = z.infer<typeof WishlistListResponseSchema>
```

### File Locations

```
apps/api/database/schema/
  wishlist.ts              # New - Drizzle schema
  index.ts                 # Update - export wishlistItems

packages/core/api-client/src/schemas/
  wishlist.ts              # New - Zod schemas
  index.ts                 # Update - export wishlist schemas
```

## Testing

- [ ] Schema compiles without TypeScript errors
- [ ] Migration generates valid SQL
- [ ] Migration applies successfully
- [ ] `pnpm check-types` passes
- [ ] Zod schemas validate correct data
- [ ] Zod schemas reject invalid data (test edge cases)
- [ ] Types are correctly inferred

### Test Cases for Zod Validation

```typescript
// Valid create
CreateWishlistItemSchema.parse({
  title: 'LEGO Castle',
  store: 'LEGO',
  price: 199.99,
})

// Invalid - missing required
CreateWishlistItemSchema.parse({}) // Should throw

// Invalid - negative price
CreateWishlistItemSchema.parse({
  title: 'Test',
  store: 'LEGO',
  price: -50,
}) // Should throw

// Invalid - priority out of range
CreateWishlistItemSchema.parse({
  title: 'Test',
  store: 'LEGO',
  priority: 10,
}) // Should throw
```

## Definition of Done

- [ ] Drizzle schema matches PRD data model
- [ ] Indexes optimize common query patterns
- [ ] Zod schemas provide runtime validation
- [ ] TypeScript types auto-inferred from Zod
- [ ] Migration runs without errors
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1004, enhanced schemas  | Claude   |
