import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ─────────────────────────────────────────────────────────────────────────────
// Stores — shared lookup table
// ─────────────────────────────────────────────────────────────────────────────

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    url: text('url'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    nameIdx: index('stores_name_idx').on(table.name),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Tags — app-wide tag registry
// ─────────────────────────────────────────────────────────────────────────────

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    nameIdx: index('tags_name_idx').on(table.name),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Entity Tags — polymorphic join (sets, mocs, instructions, inspiration)
// ─────────────────────────────────────────────────────────────────────────────

export const entityTags = pgTable(
  'entity_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id').notNull(),
    entityType: text('entity_type').notNull(), // 'set' | 'moc' | 'instruction' | 'inspiration'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    entityIdx: index('entity_tags_entity_idx').on(table.entityId, table.entityType),
    tagIdx: index('entity_tags_tag_idx').on(table.tagId),
    uniqueTagEntity: uniqueIndex('entity_tags_unique').on(
      table.tagId,
      table.entityId,
      table.entityType,
    ),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Files — app-wide file registry (does NOT replace moc_files)
// ─────────────────────────────────────────────────────────────────────────────

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    s3Key: text('s3_key').notNull().unique(),
    originalFilename: text('original_filename'),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  table => ({
    s3KeyIdx: index('files_s3_key_idx').on(table.s3Key),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Entity Files — polymorphic join (sets, mocs, instructions, inspiration)
// ─────────────────────────────────────────────────────────────────────────────

export const entityFiles = pgTable(
  'entity_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id').notNull(),
    entityType: text('entity_type').notNull(), // 'set' | 'moc' | 'instruction' | 'inspiration'
    purpose: text('purpose').notNull(), // 'thumbnail' | 'gallery' | 'instruction' | 'parts-list'
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    entityIdx: index('entity_files_entity_idx').on(table.entityId, table.entityType),
    fileIdx: index('entity_files_file_idx').on(table.fileId),
    uniqueFileEntity: uniqueIndex('entity_files_unique').on(
      table.fileId,
      table.entityId,
      table.entityType,
    ),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Sets — unified table (replaces wishlist_items + old sets)
//
// status='wanted' = wishlist item
// status='owned'  = collection item
// ─────────────────────────────────────────────────────────────────────────────

export const sets = pgTable(
  'sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),

    // Status / Lifecycle
    status: text('status').notNull().default('wanted'), // 'wanted' | 'owned'
    statusChangedAt: timestamp('status_changed_at'),

    // Identity
    title: text('title').notNull(),
    setNumber: text('set_number'),
    sourceUrl: text('source_url'),

    // Store (FK to stores lookup)
    storeId: uuid('store_id').references(() => stores.id, { onDelete: 'set null' }),

    // Physical
    pieceCount: integer('piece_count'),
    brand: text('brand'),
    year: integer('year'),
    description: text('description'),
    dimensions: jsonb('dimensions').$type<{
      height?: { cm?: number | null; inches?: number | null } | null
      width?: { cm?: number | null; inches?: number | null } | null
      depth?: { cm?: number | null; inches?: number | null } | null
      studsWidth?: number | null
      studsDepth?: number | null
      studsHeight?: number | null
    }>(),
    releaseDate: timestamp('release_date'),
    retireDate: timestamp('retire_date'),
    notes: text('notes'),

    // Condition (primarily for owned)
    condition: text('condition'), // 'new' | 'used'
    completeness: text('completeness'), // 'sealed' | 'complete' | 'incomplete'

    // Build status (primarily for owned)
    buildStatus: text('build_status').default('not_started'), // 'not_started' | 'in_progress' | 'completed' | 'parted_out'

    // Purchase details
    purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
    purchaseTax: decimal('purchase_tax', { precision: 10, scale: 2 }),
    purchaseShipping: decimal('purchase_shipping', { precision: 10, scale: 2 }),
    purchaseDate: timestamp('purchase_date'),
    quantity: integer('quantity').default(1).notNull(),

    // Wishlist-specific (relevant when status='wanted')
    priority: integer('priority'), // 0-5
    sortOrder: integer('sort_order'), // drag-drop ordering

    // Legacy image fields (kept for backward compat during migration)
    imageUrl: text('image_url'),
    imageVariants: jsonb('image_variants'), // WISH-2016 optimized variants

    // ── Legacy columns (still in DB, removed in Phase 5) ──
    /** @deprecated Use storeId FK instead */
    store: text('store'),
    /** @deprecated Use buildStatus enum instead */
    isBuilt: boolean('is_built').default(false).notNull(),
    theme: text('theme'),
    tags: text('tags').array().default([]),
    /** @deprecated Use purchaseTax instead */
    tax: decimal('tax', { precision: 10, scale: 2 }),
    /** @deprecated Use purchaseShipping instead */
    shipping: decimal('shipping', { precision: 10, scale: 2 }),
    /** @deprecated No longer needed in unified model */
    wishlistItemId: uuid('wishlist_item_id'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('sets_user_id_idx').on(table.userId),
    userStatusIdx: index('sets_user_status_idx').on(table.userId, table.status),
    setNumberIdx: index('sets_set_number_idx').on(table.setNumber),
    storeIdIdx: index('sets_store_id_idx').on(table.storeId),
    userSortOrderIdx: index('sets_user_sort_order_idx').on(table.userId, table.sortOrder),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Set Images — DEPRECATED, will be replaced by entity_files in Phase 5
// Kept temporarily so existing sets domain code continues to work.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use entity_files instead. Will be removed in Phase 5 cleanup. */
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
