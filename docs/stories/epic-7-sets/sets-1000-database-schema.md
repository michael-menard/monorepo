# Story sets-1000: Database Schema & Migrations

## Status

Draft

## Story

**As a** developer,
**I want** the Sets database schema created with proper migrations,
**So that** the backend can persist and query set collection data.

## Acceptance Criteria

1. [ ] `sets` table created with all required columns per PRD data model
2. [ ] `set_images` table created for multiple images per set
3. [ ] Proper indexes on userId, setNumber, theme for query performance
4. [ ] Foreign key to users table with cascade delete
5. [ ] Migration runs successfully on dev environment
6. [ ] Drizzle schema types generated

## Tasks

- [ ] **Task 1: Create sets table schema**
  - [ ] Define sets table in Drizzle schema
  - [ ] Add all columns from PRD data model
  - [ ] Add timestamps (createdAt, updatedAt)
  - [ ] Add userId foreign key

- [ ] **Task 2: Create set_images table**
  - [ ] Define set_images table
  - [ ] Foreign key to sets table
  - [ ] Position/order column for image ordering

- [ ] **Task 3: Add indexes**
  - [ ] Index on userId for user's collection queries
  - [ ] Index on setNumber for duplicate detection
  - [ ] Index on theme for filtering

- [ ] **Task 4: Generate and run migration**
  - [ ] Generate migration file
  - [ ] Test migration on dev database
  - [ ] Verify rollback works

## Dev Notes

### Sets Table Schema

```typescript
// apps/api/src/db/schema/sets.ts
import { pgTable, uuid, text, integer, boolean, timestamp, decimal } from 'drizzle-orm/pg-core'
import { users } from './users'

export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Basic info
  title: text('title').notNull(),
  setNumber: text('set_number'),
  store: text('store'),
  sourceUrl: text('source_url'),
  pieceCount: integer('piece_count'),
  releaseDate: timestamp('release_date'),
  theme: text('theme'),
  tags: text('tags').array().default([]),
  notes: text('notes'),

  // Set status
  isBuilt: boolean('is_built').default(false).notNull(),
  quantity: integer('quantity').default(1).notNull(),

  // Purchase details
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  tax: decimal('tax', { precision: 10, scale: 2 }),
  shipping: decimal('shipping', { precision: 10, scale: 2 }),
  purchaseDate: timestamp('purchase_date'),

  // Future: wishlist integration
  wishlistItemId: uuid('wishlist_item_id'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sets_user_id_idx').on(table.userId),
  setNumberIdx: index('sets_set_number_idx').on(table.setNumber),
  themeIdx: index('sets_theme_idx').on(table.theme),
}))
```

### Set Images Table

```typescript
export const setImages = pgTable('set_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id').references(() => sets.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  setIdIdx: index('set_images_set_id_idx').on(table.setId),
}))
```

### Notes

- `mocIds` relationship will be added in sets-1016 (MOC linking story)
- `wishlistItemId` column added now but not enforced as FK until Wishlist exists
- Using decimal for money fields to avoid floating point issues

## Testing

- [ ] Migration applies cleanly to empty database
- [ ] Migration applies cleanly to database with existing data
- [ ] Rollback migration works
- [ ] Drizzle types are correctly generated
- [ ] Can insert test record with all fields

## Dependencies

- Users table must exist (from auth epic)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Data Model section)
