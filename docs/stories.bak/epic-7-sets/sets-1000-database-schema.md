# Story sets-1000: Database Schema & Migrations

## Status

Ready for QA

## Story

**As a** developer,
**I want** the Sets database schema created with proper migrations,
**So that** the backend can persist and query set collection data.

## Acceptance Criteria

1. [x] `sets` table created with all required columns per PRD data model
2. [x] `set_images` table created for multiple images per set
3. [x] Proper indexes on userId, setNumber, theme for query performance
4. [x] `user_id` stored as Cognito user ID (text) with an index; ownership enforced via auth layer (no Postgres `users` table)
5. [x] Migration runs successfully on dev environment (see Testing for commands)
6. [x] Drizzle schema types generated from the Drizzle schema entrypoint

## Tasks

- [x] **Task 1: Create sets table schema**
  - [x] Define sets table in Drizzle schema
  - [x] Add all columns from PRD data model
  - [x] Add timestamps (createdAt, updatedAt)
  - [x] Add userId column (Cognito user ID, indexed)

- [x] **Task 2: Create set_images table**
  - [x] Define set_images table
  - [x] Foreign key to sets table with ON DELETE CASCADE
  - [x] Position/order column for image ordering

- [x] **Task 3: Add indexes**
  - [x] Index on userId for user's collection queries
  - [x] Index on setNumber for duplicate detection
  - [x] Index on theme for filtering

- [x] **Task 4: Generate and run migration**
  - [x] Generate migration files with `pnpm db:generate` (0005_powerful_madame_masque.sql, 0006_puzzling_deathstrike.sql)
  - [x] Test migration on dev database with `pnpm db:migrate`
  - [ ] Verify rollback works (apply to test DB, then roll back)

## Dev Notes

### Sets Table Schema

```typescript
// apps/api/core/database/schema/sets.ts
import { pgTable, uuid, text, integer, boolean, timestamp, decimal, index } from 'drizzle-orm/pg-core'

export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Cognito user ID (sub claim from JWT)
  userId: text('user_id').notNull(),

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
}, table => ({
  userIdIdx: index('sets_user_id_idx').on(table.userId),
  setNumberIdx: index('sets_set_number_idx').on(table.setNumber),
  themeIdx: index('sets_theme_idx').on(table.theme),
}))
```

### Set Images Table

```typescript
// apps/api/core/database/schema/sets.ts
export const setImages = pgTable('set_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id')
    .notNull()
    .references(() => sets.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, table => ({
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
- [x] Can insert test record with all fields
- [x] Cascade delete removes images when set is deleted (see core/__tests__/sets-database.integration.test.ts)

### How to run migrations

From the monorepo root, with a dev Postgres instance available (local or Aurora) and `POSTGRES_*` configured (e.g. via `apps/api/.env.local`):

```bash
cd apps/api
pnpm db:generate   # regenerate migrations if schema changed
pnpm db:migrate    # apply all pending migrations
```

### Manual verification recipe

1. Run `pnpm db:migrate` against a dev/test database.
2. Using a REPL or a small script with `getDbAsync()` from `core/database/client.ts`:
   - Insert a `sets` row with sample data.
   - Insert one or more `set_images` rows pointing at that set.
3. Delete the `sets` row.
4. Verify that the corresponding `set_images` rows are automatically deleted (ON DELETE CASCADE).

## Dependencies

- Cognito User Pool and auth integration must exist (from auth epic); `sets.user_id` stores the Cognito user ID rather than a Postgres `users` FK.

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Data Model section)
