import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Only define your Drizzle table here. Use Zod schemas/types in your handlers for type safety and validation.
// Note: Users are managed in MongoDB via the auth service, not in PostgreSQL

// Gallery Images Table
export const galleryImages = pgTable(
  'gallery_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull(),
      // Note: No foreign key constraint - user exists in auth service MongoDB
    title: text('title').notNull(),
    description: text('description'),
    tags: jsonb('tags').$type<string[]>(),
    imageUrl: text('image_url').notNull(),
    albumId: uuid('album_id'), // Will reference galleryAlbums.id - added in migration
    flagged: boolean('flagged').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_gallery_images_user_id_lazy').on(table.userId),
    albumIdx: index('idx_gallery_images_album_id_lazy').on(table.albumId),
    userCreatedIdx: index('idx_gallery_images_user_created').on(table.userId, table.createdAt),
    albumCreatedIdx: index('idx_gallery_images_album_created').on(table.albumId, table.createdAt),
  }),
);

// Gallery Albums Table
export const galleryAlbums = pgTable(
  'gallery_albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull(),
      // Note: No foreign key constraint - user exists in auth service MongoDB
    title: text('title').notNull(),
    description: text('description'),
    coverImageId: uuid('cover_image_id'), // Will reference galleryImages.id - added in migration
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_gallery_albums_user_id_lazy').on(table.userId),
    userCreatedIdx: index('idx_gallery_albums_user_created').on(table.userId, table.createdAt),
  }),
);

// Gallery Flags Table
export const galleryFlags = pgTable(
  'gallery_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    imageId: uuid('image_id')
      .notNull()
      .references(() => galleryImages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull(),
      // Note: No foreign key constraint - user exists in auth service MongoDB
    reason: text('reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_gallery_flags_user_id_lazy').on(table.userId),
    imageIdx: index('idx_gallery_flags_image_id').on(table.imageId),
    // Unique constraint to prevent duplicate flags per user/image
    uniqueImageUser: uniqueIndex('gallery_flags_image_user_unique').on(table.imageId, table.userId),
  }),
);

// MOC Instructions Table
export const mocInstructions = pgTable(
  'moc_instructions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull(),
      // Note: No foreign key constraint - user exists in auth service MongoDB
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull(), // 'moc' or 'set'
    // MOC-specific fields
    author: text('author'), // Required for MOCs, null for Sets
    // Set-specific fields
    brand: text('brand'), // Required for Sets, null for MOCs
    theme: text('theme'), // Required for Sets, null for MOCs
    setNumber: text('set_number'), // Optional for Sets
    releaseYear: integer('release_year'), // Optional for Sets
    retired: boolean('retired'), // Optional for Sets (default false)
    // Common fields
    tags: jsonb('tags').$type<string[]>(),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_moc_instructions_user_id_lazy').on(table.userId),
    userCreatedIdx: index('idx_moc_instructions_user_created').on(table.userId, table.createdAt),

    // Title search index - for searching across all MOCs and Sets
    titleIdx: index('idx_moc_instructions_title').on(table.title),

    // Business constraint: Unique MOC title per user
    uniqueUserTitle: uniqueIndex('moc_instructions_user_title_unique').on(table.userId, table.title),

    // Set-specific constraints and indexes
    // Note: Unique constraint for Sets (brand + setNumber) is handled via EXCLUDE constraint in migration
    // This ensures each official LEGO set can only exist once in the system

    // Performance indexes for Set queries
    setBrandSetNumberIdx: index('idx_sets_brand_set_number')
      .on(table.brand, table.setNumber)
      .where(sql`type = 'set' AND brand IS NOT NULL AND set_number IS NOT NULL`),
    setBrandThemeIdx: index('idx_sets_brand_theme')
      .on(table.brand, table.theme)
      .where(sql`type = 'set'`),
    setReleaseYearIdx: index('idx_sets_release_year')
      .on(table.releaseYear)
      .where(sql`type = 'set' AND release_year IS NOT NULL`),
    setRetiredIdx: index('idx_sets_retired')
      .on(table.retired)
      .where(sql`type = 'set' AND retired IS NOT NULL`),
  }),
);

// MOC Files Table (for instructions, parts lists, images, etc.)
export const mocFiles = pgTable(
  'moc_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),
    fileType: text('file_type').notNull(), // e.g., 'instruction', 'parts-list', 'thumbnail', 'gallery-image'
    fileUrl: text('file_url').notNull(),
    originalFilename: text('original_filename'),
    mimeType: text('mime_type'), // Optional: for clarity on file format
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    mocIdx: index('idx_moc_files_moc_id_lazy').on(table.mocId),
    mocTypeIdx: index('idx_moc_files_moc_type').on(table.mocId, table.fileType),
    // Business constraints
    uniqueMocFileType: uniqueIndex('moc_files_moc_filetype_unique').on(table.mocId, table.fileType),
    uniqueMocFilename: uniqueIndex('moc_files_moc_filename_unique').on(table.mocId, table.originalFilename),
  }),
);

// Join table: Link MOCs to existing gallery images
export const mocGalleryImages = pgTable(
  'moc_gallery_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),
    galleryImageId: uuid('gallery_image_id')
      .notNull()
      .references(() => galleryImages.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    mocIdx: index('idx_moc_gallery_images_moc_id_lazy').on(table.mocId),
    galleryImageIdx: index('idx_moc_gallery_images_gallery_image_id_lazy').on(table.galleryImageId),
  }),
);

// Join table: Link MOCs to existing gallery albums (optional, for album linking)
export const mocGalleryAlbums = pgTable(
  'moc_gallery_albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),
    galleryAlbumId: uuid('gallery_album_id')
      .notNull()
      .references(() => galleryAlbums.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    // Indexes for lazy fetching and performance
    mocIdx: index('idx_moc_gallery_albums_moc_id_lazy').on(table.mocId),
    galleryAlbumIdx: index('idx_moc_gallery_albums_gallery_album_id_lazy').on(table.galleryAlbumId),
  }),
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull(),
      // Note: No foreign key constraint - user exists in auth service MongoDB
    title: text('title').notNull(),
    description: text('description'),
    productLink: text('product_link'),
    imageUrl: text('image_url'),
    category: text('category'), // LEGO categories like 'Speed Champions', 'Modular', 'Star Wars', etc.
    sortOrder: text('sort_order').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_wishlist_user_id').on(table.userId),
    userSortIdx: index('idx_wishlist_sort_order').on(table.userId, table.sortOrder),
    categorySortIdx: index('idx_wishlist_category_sort').on(
      table.userId,
      table.category,
      table.sortOrder,
    ),
  }),
);

// MOC Parts Lists Table - Enhanced tracking for parts lists
export const mocPartsLists = pgTable(
  'moc_parts_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id').references(() => mocFiles.id, { onDelete: 'set null' }), // Optional file reference
    title: text('title').notNull(),
    description: text('description'),
    built: boolean('built').default(false),
    purchased: boolean('purchased').default(false),
    inventoryPercentage: text('inventory_percentage').default('0.00'), // Using text to match decimal precision
    totalPartsCount: text('total_parts_count'), // Using text for large numbers
    acquiredPartsCount: text('acquired_parts_count').default('0'),
    costEstimate: text('cost_estimate'), // Using text for decimal precision
    actualCost: text('actual_cost'), // Using text for decimal precision
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    mocIdx: index('idx_moc_parts_lists_moc_id').on(table.mocId),
    fileIdx: index('idx_moc_parts_lists_file_id').on(table.fileId),
    builtIdx: index('idx_moc_parts_lists_built').on(table.built),
    purchasedIdx: index('idx_moc_parts_lists_purchased').on(table.purchased),
    mocBuiltIdx: index('idx_moc_parts_lists_moc_built').on(table.mocId, table.built),
    mocPurchasedIdx: index('idx_moc_parts_lists_moc_purchased').on(table.mocId, table.purchased),
  }),
);

// Define relationships for lazy loading
// Note: User relations removed - users are managed in MongoDB via auth service

export const galleryImagesRelations = relations(galleryImages, ({ one, many }) => ({
  album: one(galleryAlbums, {
    fields: [galleryImages.albumId],
    references: [galleryAlbums.id],
  }),
  flags: many(galleryFlags),
  mocGalleryImages: many(mocGalleryImages),
}));

export const galleryAlbumsRelations = relations(galleryAlbums, ({ one, many }) => ({
  coverImage: one(galleryImages, {
    fields: [galleryAlbums.coverImageId],
    references: [galleryImages.id],
  }),
  images: many(galleryImages),
  mocGalleryAlbums: many(mocGalleryAlbums),
}));

export const galleryFlagsRelations = relations(galleryFlags, ({ one }) => ({
  image: one(galleryImages, {
    fields: [galleryFlags.imageId],
    references: [galleryImages.id],
  }),
}));

export const mocInstructionsRelations = relations(mocInstructions, ({ one, many }) => ({
  files: many(mocFiles),
  galleryImages: many(mocGalleryImages),
  galleryAlbums: many(mocGalleryAlbums),
  partsLists: many(mocPartsLists),
}));

export const mocFilesRelations = relations(mocFiles, ({ one, many }) => ({
  moc: one(mocInstructions, {
    fields: [mocFiles.mocId],
    references: [mocInstructions.id],
  }),
  partsLists: many(mocPartsLists),
}));

export const mocGalleryImagesRelations = relations(mocGalleryImages, ({ one }) => ({
  moc: one(mocInstructions, {
    fields: [mocGalleryImages.mocId],
    references: [mocInstructions.id],
  }),
  galleryImage: one(galleryImages, {
    fields: [mocGalleryImages.galleryImageId],
    references: [galleryImages.id],
  }),
}));

export const mocGalleryAlbumsRelations = relations(mocGalleryAlbums, ({ one }) => ({
  moc: one(mocInstructions, {
    fields: [mocGalleryAlbums.mocId],
    references: [mocInstructions.id],
  }),
  galleryAlbum: one(galleryAlbums, {
    fields: [mocGalleryAlbums.galleryAlbumId],
    references: [galleryAlbums.id],
  }),
}));

export const mocPartsListsRelations = relations(mocPartsLists, ({ one }) => ({
  moc: one(mocInstructions, {
    fields: [mocPartsLists.mocId],
    references: [mocInstructions.id],
  }),
  file: one(mocFiles, {
    fields: [mocPartsLists.fileId],
    references: [mocFiles.id],
  }),
}));

// Wishlist relations removed - users are managed in MongoDB via auth service
