import { boolean, decimal, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// NOTE: We currently model user ownership via Cognito user IDs (text), not a relational users table.
// This stays consistent with the rest of the schema (gallery, wishlist, MOCs).

export const sets = pgTable(
  'sets',
  {
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

    // Wishlist integration (traceability only for now; no FK yet)
    wishlistItemId: uuid('wishlist_item_id'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('sets_user_id_idx').on(table.userId),
    setNumberIdx: index('sets_set_number_idx').on(table.setNumber),
    themeIdx: index('sets_theme_idx').on(table.theme),
  }),
)

export const setImages = pgTable(
  'set_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    setId: uuid('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    setIdIdx: index('set_images_set_id_idx').on(table.setId),
  }),
)
