# Story wish-1004: Database Schema & Zod Types

## Status

Draft

## Story

**As a** developer,
**I want** the wishlist database schema and shared Zod types defined,
**so that** I have a foundation for all wishlist CRUD operations.

## Acceptance Criteria

1. Drizzle schema for `wishlist_items` table created
2. All fields from PRD data model implemented
3. Proper indexes for userId, sortOrder queries
4. Zod schemas created in shared types package
5. TypeScript types inferred from Zod schemas
6. Database migration runs successfully

## Tasks / Subtasks

- [ ] **Task 1: Create Drizzle Schema** (AC: 1, 2, 3)
  - [ ] Create `apps/api/database/schema/wishlist.ts`
  - [ ] Define `wishlistItems` table with all PRD fields
  - [ ] Add foreign key to users table
  - [ ] Add indexes: `userId`, `userId + sortOrder`
  - [ ] Export from schema index

- [ ] **Task 2: Create Zod Schemas** (AC: 4, 5)
  - [ ] Create `packages/core/api-client/src/schemas/wishlist.ts`
  - [ ] Define `WishlistItemSchema` with all fields
  - [ ] Define `CreateWishlistItemSchema` for POST body
  - [ ] Define `UpdateWishlistItemSchema` for PATCH body
  - [ ] Define `WishlistListResponseSchema` for GET response
  - [ ] Export types via `z.infer<>`

- [ ] **Task 3: Run Migration** (AC: 6)
  - [ ] Generate migration with `pnpm db:generate`
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
  priority: integer('priority').default(0), // 1-5 scale
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

export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().default('USD'),
  pieceCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().optional(),
})

export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>

export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial()

export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

export const WishlistListResponseSchema = z.object({
  items: z.array(WishlistItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
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
- [ ] Zod schemas validate correct data
- [ ] Zod schemas reject invalid data
- [ ] Types are correctly inferred

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
