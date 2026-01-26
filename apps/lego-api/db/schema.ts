/**
 * Database Schema for lego-api
 *
 * Minimal schema for local development.
 * In production, use the full schema from apps/api/core/database/schema.
 */

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
import { relations } from 'drizzle-orm'

// ─────────────────────────────────────────────────────────────────────────
// Gallery Images Table
// ─────────────────────────────────────────────────────────────────────────

export const galleryImages = pgTable(
  'gallery_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    tags: jsonb('tags').$type<string[]>(),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    albumId: uuid('album_id'),
    flagged: boolean('flagged').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_gallery_images_user_id_lazy').on(table.userId),
    albumIdx: index('idx_gallery_images_album_id_lazy').on(table.albumId),
    userCreatedIdx: index('idx_gallery_images_user_created').on(table.userId, table.createdAt),
    albumCreatedIdx: index('idx_gallery_images_album_created').on(table.albumId, table.createdAt),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// Gallery Albums Table
// ─────────────────────────────────────────────────────────────────────────

export const galleryAlbums = pgTable(
  'gallery_albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    coverImageId: uuid('cover_image_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_gallery_albums_user_id_lazy').on(table.userId),
    userCreatedIdx: index('idx_gallery_albums_user_created').on(table.userId, table.createdAt),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// Gallery Flags Table
// ─────────────────────────────────────────────────────────────────────────

export const galleryFlags = pgTable(
  'gallery_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    imageId: uuid('image_id')
      .notNull()
      .references(() => galleryImages.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_gallery_flags_user_id_lazy').on(table.userId),
    imageIdx: index('idx_gallery_flags_image_id').on(table.imageId),
    uniqueImageUser: uniqueIndex('gallery_flags_image_user_unique').on(table.imageId, table.userId),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────

export const galleryImagesRelations = relations(galleryImages, ({ one, many }) => ({
  album: one(galleryAlbums, {
    fields: [galleryImages.albumId],
    references: [galleryAlbums.id],
  }),
  flags: many(galleryFlags),
}))

export const galleryAlbumsRelations = relations(galleryAlbums, ({ one, many }) => ({
  coverImage: one(galleryImages, {
    fields: [galleryAlbums.coverImageId],
    references: [galleryImages.id],
  }),
  images: many(galleryImages),
}))

export const galleryFlagsRelations = relations(galleryFlags, ({ one }) => ({
  image: one(galleryImages, {
    fields: [galleryFlags.imageId],
    references: [galleryImages.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────
// Sets Table
// ─────────────────────────────────────────────────────────────────────────

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
  (table) => ({
    userIdIdx: index('sets_user_id_idx').on(table.userId),
    setNumberIdx: index('sets_set_number_idx').on(table.setNumber),
    themeIdx: index('sets_theme_idx').on(table.theme),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// Set Images Table
// ─────────────────────────────────────────────────────────────────────────

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
  (table) => ({
    setIdIdx: index('set_images_set_id_idx').on(table.setId),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// Sets Relations
// ─────────────────────────────────────────────────────────────────────────

export const setsRelations = relations(sets, ({ many }) => ({
  images: many(setImages),
}))

export const setImagesRelations = relations(setImages, ({ one }) => ({
  set: one(sets, {
    fields: [setImages.setId],
    references: [sets.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────
// Wishlist Items Table
// ─────────────────────────────────────────────────────────────────────────

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)

    // Core fields (required)
    title: text('title').notNull(),
    store: text('store').notNull(), // Retailer: LEGO, Barweer, Cata, BrickLink, Other

    // Identification
    setNumber: text('set_number'), // LEGO set number (e.g., "75192")
    sourceUrl: text('source_url'), // Original product URL

    // Image
    imageUrl: text('image_url'), // S3 URL to stored product image

    // Pricing
    price: text('price'), // Using text for decimal precision (e.g., "199.99")
    currency: text('currency').default('USD'), // USD, EUR, GBP, CAD, AUD

    // Details
    pieceCount: integer('piece_count'), // Number of pieces
    releaseDate: timestamp('release_date'), // Set release date
    tags: jsonb('tags').$type<string[]>().default([]), // Theme/category tags

    // User organization
    priority: integer('priority').default(0), // 0-5 scale
    notes: text('notes'), // User notes (e.g., "wait for sale")
    sortOrder: integer('sort_order').notNull().default(0), // Position in gallery for drag reorder

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_wishlist_user_id').on(table.userId),
    userSortIdx: index('idx_wishlist_user_sort').on(table.userId, table.sortOrder),
    userStoreIdx: index('idx_wishlist_user_store').on(table.userId, table.store),
    userPriorityIdx: index('idx_wishlist_user_priority').on(table.userId, table.priority),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// MOC Instructions Table
// ─────────────────────────────────────────────────────────────────────────

export const mocInstructions = pgTable(
  'moc_instructions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull(), // 'moc' or 'set'

    // Core Identification
    mocId: text('moc_id'), // External platform ID (e.g., "MOC-243400" from Rebrickable)
    slug: text('slug'), // URL-friendly identifier

    // MOC-specific fields
    author: text('author'), // Designer/creator name
    partsCount: integer('parts_count'),
    minifigCount: integer('minifig_count'),
    theme: text('theme'),
    themeId: integer('theme_id'),
    subtheme: text('subtheme'),
    uploadedDate: timestamp('uploaded_date'),

    // Set-specific fields
    brand: text('brand'),
    setNumber: text('set_number'),
    releaseYear: integer('release_year'),
    retired: boolean('retired'),

    // Extended Metadata (JSONB)
    designer: jsonb('designer').$type<{
      username: string
      displayName?: string | null
      profileUrl?: string | null
      avatarUrl?: string | null
      socialLinks?: {
        instagram?: string | null
        twitter?: string | null
        youtube?: string | null
        website?: string | null
      } | null
    }>(),
    dimensions: jsonb('dimensions').$type<{
      height?: { cm?: number | null; inches?: number | null } | null
      width?: { cm?: number | null; inches?: number | null } | null
      depth?: { cm?: number | null; inches?: number | null } | null
      weight?: { kg?: number | null; lbs?: number | null } | null
      studsWidth?: number | null
      studsDepth?: number | null
    }>(),
    instructionsMetadata: jsonb('instructions_metadata').$type<{
      instructionType?: 'pdf' | 'xml' | 'studio' | 'ldraw' | 'lxf' | 'other' | null
      hasInstructions: boolean
      pageCount?: number | null
      fileSize?: number | null
      previewImages: string[]
    }>(),
    features: jsonb('features').$type<
      Array<{
        title: string
        description?: string | null
        icon?: string | null
      }>
    >(),

    // Rich Description Content
    descriptionHtml: text('description_html'),
    shortDescription: text('short_description'),

    // Difficulty & Build Info
    difficulty: text('difficulty'), // 'beginner' | 'intermediate' | 'advanced' | 'expert'
    buildTimeHours: integer('build_time_hours'),
    ageRecommendation: text('age_recommendation'),

    // Status & Visibility
    status: text('status').default('draft'),
    visibility: text('visibility').default('private'),
    isFeatured: boolean('is_featured').default(false),
    isVerified: boolean('is_verified').default(false),

    // Common fields
    tags: jsonb('tags').$type<string[]>(),
    thumbnailUrl: text('thumbnail_url'),
    totalPieceCount: integer('total_piece_count'),

    // Timestamps
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_moc_instructions_user_id').on(table.userId),
    userCreatedIdx: index('idx_moc_instructions_user_created').on(table.userId, table.createdAt),
    titleIdx: index('idx_moc_instructions_title').on(table.title),
    uniqueUserTitle: uniqueIndex('moc_instructions_user_title_unique').on(table.userId, table.title),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// MOC Files Table
// ─────────────────────────────────────────────────────────────────────────

export const mocFiles = pgTable(
  'moc_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),
    fileType: text('file_type').notNull(), // 'instruction', 'parts-list', 'thumbnail', 'gallery-image'
    fileUrl: text('file_url').notNull(),
    originalFilename: text('original_filename'),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft-delete support
  },
  (table) => ({
    mocIdx: index('idx_moc_files_moc_id').on(table.mocId),
    mocTypeIdx: index('idx_moc_files_moc_type').on(table.mocId, table.fileType),
    uniqueMocFilename: uniqueIndex('moc_files_moc_filename_unique').on(table.mocId, table.originalFilename),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// MOC Instructions Relations
// ─────────────────────────────────────────────────────────────────────────

export const mocInstructionsRelations = relations(mocInstructions, ({ many }) => ({
  files: many(mocFiles),
  partsLists: many(mocPartsLists),
}))

export const mocFilesRelations = relations(mocFiles, ({ one, many }) => ({
  moc: one(mocInstructions, {
    fields: [mocFiles.mocId],
    references: [mocInstructions.id],
  }),
  partsLists: many(mocPartsLists),
}))

// ─────────────────────────────────────────────────────────────────────────
// MOC Parts Lists Table
// ─────────────────────────────────────────────────────────────────────────

export const mocPartsLists = pgTable(
  'moc_parts_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id').references(() => mocFiles.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    built: boolean('built').default(false),
    purchased: boolean('purchased').default(false),
    inventoryPercentage: text('inventory_percentage').default('0.00'),
    totalPartsCount: text('total_parts_count'),
    acquiredPartsCount: text('acquired_parts_count').default('0'),
    costEstimate: text('cost_estimate'),
    actualCost: text('actual_cost'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    mocIdx: index('idx_moc_parts_lists_moc_id').on(table.mocId),
    fileIdx: index('idx_moc_parts_lists_file_id').on(table.fileId),
    builtIdx: index('idx_moc_parts_lists_built').on(table.built),
    purchasedIdx: index('idx_moc_parts_lists_purchased').on(table.purchased),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// MOC Parts Table
// ─────────────────────────────────────────────────────────────────────────

export const mocParts = pgTable(
  'moc_parts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partsListId: uuid('parts_list_id')
      .notNull()
      .references(() => mocPartsLists.id, { onDelete: 'cascade' }),
    partId: text('part_id').notNull(),
    partName: text('part_name').notNull(),
    quantity: integer('quantity').notNull(),
    color: text('color').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    partsListIdx: index('idx_moc_parts_parts_list_id').on(table.partsListId),
    partIdIdx: index('idx_moc_parts_part_id').on(table.partId),
    colorIdx: index('idx_moc_parts_color').on(table.color),
  })
)

// ─────────────────────────────────────────────────────────────────────────
// MOC Parts Lists Relations
// ─────────────────────────────────────────────────────────────────────────

export const mocPartsListsRelations = relations(mocPartsLists, ({ one, many }) => ({
  moc: one(mocInstructions, {
    fields: [mocPartsLists.mocId],
    references: [mocInstructions.id],
  }),
  file: one(mocFiles, {
    fields: [mocPartsLists.fileId],
    references: [mocFiles.id],
  }),
  parts: many(mocParts),
}))

export const mocPartsRelations = relations(mocParts, ({ one }) => ({
  partsList: one(mocPartsLists, {
    fields: [mocParts.partsListId],
    references: [mocPartsLists.id],
  }),
}))
