import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Only define your Drizzle table here. Use Zod schemas/types in your handlers for type safety and validation.
// Note: userId fields reference Cognito user IDs (sub claim from JWT) - no user table in PostgreSQL

// Gallery Images Table
export const galleryImages = pgTable(
  'gallery_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    title: text('title').notNull(),
    description: text('description'),
    tags: jsonb('tags').$type<string[]>(),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'), // Thumbnail image URL
    albumId: uuid('album_id'), // Will reference galleryAlbums.id - added in migration
    flagged: boolean('flagged').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_gallery_images_user_id_lazy').on(table.userId),
    albumIdx: index('idx_gallery_images_album_id_lazy').on(table.albumId),
    userCreatedIdx: index('idx_gallery_images_user_created').on(table.userId, table.createdAt),
    albumCreatedIdx: index('idx_gallery_images_album_created').on(table.albumId, table.createdAt),
  }),
)

// Gallery Albums Table
export const galleryAlbums = pgTable(
  'gallery_albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    title: text('title').notNull(),
    description: text('description'),
    coverImageId: uuid('cover_image_id'), // Will reference galleryImages.id - added in migration
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_gallery_albums_user_id_lazy').on(table.userId),
    userCreatedIdx: index('idx_gallery_albums_user_created').on(table.userId, table.createdAt),
  }),
)

// Gallery Flags Table
export const galleryFlags = pgTable(
  'gallery_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    imageId: uuid('image_id')
      .notNull()
      .references(() => galleryImages.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    reason: text('reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_gallery_flags_user_id_lazy').on(table.userId),
    imageIdx: index('idx_gallery_flags_image_id').on(table.imageId),
    // Unique constraint to prevent duplicate flags per user/image
    uniqueImageUser: uniqueIndex('gallery_flags_image_user_unique').on(table.imageId, table.userId),
  }),
)

// MOC Instructions Table
export const mocInstructions = pgTable(
  'moc_instructions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull(), // 'moc' or 'set'

    // ─────────────────────────────────────────────────────────────────────────
    // Core Identification (new fields)
    // ─────────────────────────────────────────────────────────────────────────
    mocId: text('moc_id'), // External platform ID (e.g., "MOC-243400" from Rebrickable)
    slug: text('slug'), // URL-friendly identifier (e.g., "king-mearas-castle")

    // ─────────────────────────────────────────────────────────────────────────
    // MOC-specific fields
    // ─────────────────────────────────────────────────────────────────────────
    author: text('author'), // Designer/creator name - Required for MOCs, null for Sets
    partsCount: integer('parts_count'), // Number of parts - Required for MOCs, null for Sets
    minifigCount: integer('minifig_count'), // Number of minifigures included
    theme: text('theme'), // Theme like "Castle" - Required for both MOCs and Sets
    themeId: integer('theme_id'), // Numeric theme ID from external platform (e.g., 186)
    subtheme: text('subtheme'), // Subtheme like "Lion Knights" - Optional for MOCs, null for Sets
    uploadedDate: timestamp('uploaded_date'), // When MOC was uploaded - Required for MOCs, null for Sets

    // ─────────────────────────────────────────────────────────────────────────
    // Set-specific fields
    // ─────────────────────────────────────────────────────────────────────────
    brand: text('brand'), // Required for Sets, null for MOCs
    setNumber: text('set_number'), // MOC ID (e.g., "MOC-172552") for MOCs, Set number (e.g., "10294") for Sets
    releaseYear: integer('release_year'), // Optional for Sets
    retired: boolean('retired'), // Optional for Sets (default false)

    // ─────────────────────────────────────────────────────────────────────────
    // Extended Metadata (JSONB fields for complex nested data)
    // ─────────────────────────────────────────────────────────────────────────
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
    }>(), // Designer profile and social information
    dimensions: jsonb('dimensions').$type<{
      height?: { cm?: number | null; inches?: number | null } | null
      width?: {
        cm?: number | null
        inches?: number | null
        openCm?: number | null
        openInches?: number | null
      } | null
      depth?: {
        cm?: number | null
        inches?: number | null
        openCm?: number | null
        openInches?: number | null
      } | null
      weight?: { kg?: number | null; lbs?: number | null } | null
      studsWidth?: number | null
      studsDepth?: number | null
    }>(), // Physical dimensions of built MOC
    instructionsMetadata: jsonb('instructions_metadata').$type<{
      instructionType?: 'pdf' | 'xml' | 'studio' | 'ldraw' | 'lxf' | 'other' | null
      hasInstructions: boolean
      pageCount?: number | null
      fileSize?: number | null
      previewImages: string[]
    }>(), // Information about instruction files
    alternateBuild: jsonb('alternate_build').$type<{
      isAlternateBuild: boolean
      sourceSetNumbers: string[]
      sourceSetNames: string[]
      setsRequired?: number | null
      additionalPartsNeeded: number
    }>(), // Info if this is an alternate build of official sets
    features: jsonb('features').$type<
      Array<{
        title: string
        description?: string | null
        icon?: string | null
      }>
    >(), // List of notable features/highlights

    // ─────────────────────────────────────────────────────────────────────────
    // Platform & Source Tracking
    // ─────────────────────────────────────────────────────────────────────────
    sourcePlatform: jsonb('source_platform').$type<{
      platform: 'rebrickable' | 'bricklink' | 'brickowl' | 'mecabricks' | 'studio' | 'other'
      externalId?: string | null
      sourceUrl?: string | null
      uploadSource?: 'web' | 'desktop_app' | 'mobile_app' | 'api' | 'unknown' | null
      forkedFromId?: string | null
      importedAt?: string | null // ISO date string in JSON
    }>(), // Source platform info (where MOC was imported from)
    eventBadges: jsonb('event_badges').$type<
      Array<{
        eventId: string
        eventName: string
        badgeType?: string | null
        badgeImageUrl?: string | null
        awardedAt?: string | null // ISO date string in JSON
      }>
    >(), // Competition/event badges earned by this MOC
    moderation: jsonb('moderation').$type<{
      action: 'none' | 'approved' | 'flagged' | 'removed' | 'pending'
      moderatedAt?: string | null // ISO date string in JSON
      reason?: string | null
      forcedPrivate: boolean
    }>(), // Moderation status and actions
    platformCategoryId: integer('platform_category_id'), // Platform-specific category ID (BrickLink: idModelCategory)

    // ─────────────────────────────────────────────────────────────────────────
    // Rich Description Content
    // ─────────────────────────────────────────────────────────────────────────
    descriptionHtml: text('description_html'), // HTML-formatted description with rich text
    shortDescription: text('short_description'), // Brief 1-2 sentence summary (max 500 chars)

    // ─────────────────────────────────────────────────────────────────────────
    // Difficulty & Build Info
    // ─────────────────────────────────────────────────────────────────────────
    difficulty: text('difficulty'), // 'beginner' | 'intermediate' | 'advanced' | 'expert'
    buildTimeHours: integer('build_time_hours'), // Estimated time to build in hours
    ageRecommendation: text('age_recommendation'), // Recommended minimum age (e.g., "16+", "12+")

    // ─────────────────────────────────────────────────────────────────────────
    // Status & Visibility
    // ─────────────────────────────────────────────────────────────────────────
    status: text('status').default('draft'), // 'draft' | 'published' | 'archived' | 'pending_review'
    visibility: text('visibility').default('private'), // 'public' | 'private' | 'unlisted'
    isFeatured: boolean('is_featured').default(false), // True if featured on homepage
    isVerified: boolean('is_verified').default(false), // True if verified by moderators

    // ─────────────────────────────────────────────────────────────────────────
    // Common fields
    // ─────────────────────────────────────────────────────────────────────────
    tags: jsonb('tags').$type<string[]>(),
    thumbnailUrl: text('thumbnail_url'),
    totalPieceCount: integer('total_piece_count'), // Total piece count from parts lists

    // ─────────────────────────────────────────────────────────────────────────
    // Timestamps
    // ─────────────────────────────────────────────────────────────────────────
    publishedAt: timestamp('published_at'), // Date MOC was first published/made public
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    // ─────────────────────────────────────────────────────────────────────────
    // Finalization State (Story 3.1.7)
    // ─────────────────────────────────────────────────────────────────────────
    finalizedAt: timestamp('finalized_at'), // Set when finalize completes successfully
    finalizingAt: timestamp('finalizing_at'), // Transient lock for in-flight finalize

    // ─────────────────────────────────────────────────────────────────────────
    // Audit Trail
    // ─────────────────────────────────────────────────────────────────────────
    addedByUserId: text('added_by_user_id'), // UUID of user who first added this record
    lastUpdatedByUserId: text('last_updated_by_user_id'), // UUID of user who last modified
  },
  table => ({
    // Indexes for lazy fetching and performance
    userIdx: index('idx_moc_instructions_user_id_lazy').on(table.userId),
    userCreatedIdx: index('idx_moc_instructions_user_created').on(table.userId, table.createdAt),

    // Title search index - for searching across all MOCs and Sets
    titleIdx: index('idx_moc_instructions_title').on(table.title),

    // Business constraint: Unique MOC title per user
    uniqueUserTitle: uniqueIndex('moc_instructions_user_title_unique').on(
      table.userId,
      table.title,
    ),

    // Business constraint: Unique slug per user (Story 3.1.14)
    uniqueUserSlug: uniqueIndex('moc_instructions_user_slug_unique').on(table.userId, table.slug),

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
)

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
  table => ({
    // Indexes for lazy fetching and performance
    mocIdx: index('idx_moc_files_moc_id_lazy').on(table.mocId),
    mocTypeIdx: index('idx_moc_files_moc_type').on(table.mocId, table.fileType),
    // Business constraints
    // Note: Removed uniqueMocFileType constraint - MOCs can have multiple files of the same type
    uniqueMocFilename: uniqueIndex('moc_files_moc_filename_unique').on(
      table.mocId,
      table.originalFilename,
    ),
  }),
)

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
  table => ({
    // Indexes for lazy fetching and performance
    mocIdx: index('idx_moc_gallery_images_moc_id_lazy').on(table.mocId),
    galleryImageIdx: index('idx_moc_gallery_images_gallery_image_id_lazy').on(table.galleryImageId),
  }),
)

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
  table => ({
    // Indexes for lazy fetching and performance
    mocIdx: index('idx_moc_gallery_albums_moc_id_lazy').on(table.mocId),
    galleryAlbumIdx: index('idx_moc_gallery_albums_gallery_album_id_lazy').on(table.galleryAlbumId),
  }),
)

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    title: text('title').notNull(),
    description: text('description'),
    productLink: text('product_link'),
    imageUrl: text('image_url'),
    imageWidth: integer('image_width'), // Image width in pixels for frontend optimization
    imageHeight: integer('image_height'), // Image height in pixels for frontend optimization
    category: text('category'), // LEGO categories like 'Speed Champions', 'Modular', 'Star Wars', etc.
    sortOrder: text('sort_order').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    userIdx: index('idx_wishlist_user_id').on(table.userId),
    userSortIdx: index('idx_wishlist_sort_order').on(table.userId, table.sortOrder),
    categorySortIdx: index('idx_wishlist_category_sort').on(
      table.userId,
      table.category,
      table.sortOrder,
    ),
  }),
)

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
  table => ({
    mocIdx: index('idx_moc_parts_lists_moc_id').on(table.mocId),
    fileIdx: index('idx_moc_parts_lists_file_id').on(table.fileId),
    builtIdx: index('idx_moc_parts_lists_built').on(table.built),
    purchasedIdx: index('idx_moc_parts_lists_purchased').on(table.purchased),
    mocBuiltIdx: index('idx_moc_parts_lists_moc_built').on(table.mocId, table.built),
    mocPurchasedIdx: index('idx_moc_parts_lists_moc_purchased').on(table.mocId, table.purchased),
  }),
)

// MOC Parts Table - Individual parts from CSV upload
export const mocParts = pgTable(
  'moc_parts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partsListId: uuid('parts_list_id')
      .notNull()
      .references(() => mocPartsLists.id, { onDelete: 'cascade' }),
    partId: text('part_id').notNull(), // LEGO part number (e.g., "3001")
    partName: text('part_name').notNull(), // Part description (e.g., "Brick 2 x 4")
    quantity: integer('quantity').notNull(), // Number of parts
    color: text('color').notNull(), // Part color (e.g., "Red")
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    partsListIdx: index('idx_moc_parts_parts_list_id').on(table.partsListId),
    partIdIdx: index('idx_moc_parts_part_id').on(table.partId),
    colorIdx: index('idx_moc_parts_color').on(table.color),
  }),
)

// User Daily Uploads Table - Rate limiting for uploads (Story 3.1.6)
export const userDailyUploads = pgTable(
  'user_daily_uploads',
  {
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)
    day: date('day').notNull(), // UTC date for bucketing
    count: integer('count').notNull().default(0), // Number of uploads for this day
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    // Unique constraint on (user_id, day) for atomic upsert
    userDayUnique: uniqueIndex('user_daily_uploads_user_day_unique').on(table.userId, table.day),
    // Index for cleanup queries
    dayIdx: index('idx_user_daily_uploads_day').on(table.day),
  }),
)

// Define relationships for lazy loading
export const galleryImagesRelations = relations(galleryImages, ({ one, many }) => ({
  album: one(galleryAlbums, {
    fields: [galleryImages.albumId],
    references: [galleryAlbums.id],
  }),
  flags: many(galleryFlags),
  mocGalleryImages: many(mocGalleryImages),
}))

export const galleryAlbumsRelations = relations(galleryAlbums, ({ one, many }) => ({
  coverImage: one(galleryImages, {
    fields: [galleryAlbums.coverImageId],
    references: [galleryImages.id],
  }),
  images: many(galleryImages),
  mocGalleryAlbums: many(mocGalleryAlbums),
}))

export const galleryFlagsRelations = relations(galleryFlags, ({ one }) => ({
  image: one(galleryImages, {
    fields: [galleryFlags.imageId],
    references: [galleryImages.id],
  }),
}))

export const mocInstructionsRelations = relations(mocInstructions, ({ many }) => ({
  files: many(mocFiles),
  galleryImages: many(mocGalleryImages),
  galleryAlbums: many(mocGalleryAlbums),
  partsLists: many(mocPartsLists),
}))

export const mocFilesRelations = relations(mocFiles, ({ one, many }) => ({
  moc: one(mocInstructions, {
    fields: [mocFiles.mocId],
    references: [mocInstructions.id],
  }),
  partsLists: many(mocPartsLists),
}))

export const mocGalleryImagesRelations = relations(mocGalleryImages, ({ one }) => ({
  moc: one(mocInstructions, {
    fields: [mocGalleryImages.mocId],
    references: [mocInstructions.id],
  }),
  galleryImage: one(galleryImages, {
    fields: [mocGalleryImages.galleryImageId],
    references: [galleryImages.id],
  }),
}))

export const mocGalleryAlbumsRelations = relations(mocGalleryAlbums, ({ one }) => ({
  moc: one(mocInstructions, {
    fields: [mocGalleryAlbums.mocId],
    references: [mocInstructions.id],
  }),
  galleryAlbum: one(galleryAlbums, {
    fields: [mocGalleryAlbums.galleryAlbumId],
    references: [galleryAlbums.id],
  }),
}))

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

// Note: No user relations - userId is a Cognito reference, not a FK

// ─────────────────────────────────────────────────────────────────────────
// Upload Sessions Tables (Story 3.1.11)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Upload Sessions - tracks multipart upload sessions
 */
export const uploadSessions = pgTable(
  'upload_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID
    /** Session status */
    status: text('status').notNull().default('active'), // active, completed, expired, cancelled
    /** Part size for multipart uploads (bytes) */
    partSizeBytes: integer('part_size_bytes').notNull(),
    /** When session expires */
    expiresAt: timestamp('expires_at').notNull(),
    /** Timestamps */
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    /** Finalization State (Story 3.1.12) */
    finalizedAt: timestamp('finalized_at'), // Set when finalize completes successfully
    finalizingAt: timestamp('finalizing_at'), // Transient lock for in-flight finalize
    /** Created MOC instruction ID (null until finalized) */
    mocInstructionId: uuid('moc_instruction_id').references(() => mocInstructions.id),
  },
  table => ({
    userIdx: index('idx_upload_sessions_user_id').on(table.userId),
    statusIdx: index('idx_upload_sessions_status').on(table.status),
    expiresIdx: index('idx_upload_sessions_expires_at').on(table.expiresAt),
    mocIdx: index('idx_upload_sessions_moc_id').on(table.mocInstructionId),
  }),
)

/**
 * Upload Session Files - tracks files within a session
 */
export const uploadSessionFiles = pgTable(
  'upload_session_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => uploadSessions.id, { onDelete: 'cascade' }),
    /** File category (instruction, parts-list, image, thumbnail) */
    category: text('category').notNull(),
    /** Original file name */
    name: text('name').notNull(),
    /** File size in bytes */
    size: integer('size').notNull(),
    /** MIME type */
    mimeType: text('mime_type').notNull(),
    /** File extension */
    extension: text('extension').notNull(),
    /** S3 key where file will be stored */
    s3Key: text('s3_key').notNull(),
    /** S3 multipart upload ID */
    uploadId: text('upload_id'),
    /** File status */
    status: text('status').notNull().default('pending'), // pending, uploading, completed, failed
    /** File URL after completion */
    fileUrl: text('file_url'),
    /** Timestamps */
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    sessionIdx: index('idx_upload_session_files_session').on(table.sessionId),
    statusIdx: index('idx_upload_session_files_status').on(table.status),
  }),
)

/**
 * Upload Session Parts - tracks individual parts of multipart uploads
 */
export const uploadSessionParts = pgTable(
  'upload_session_parts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fileId: uuid('file_id')
      .notNull()
      .references(() => uploadSessionFiles.id, { onDelete: 'cascade' }),
    /** Part number (1-indexed) */
    partNumber: integer('part_number').notNull(),
    /** ETag from S3 */
    etag: text('etag'),
    /** Part size in bytes */
    size: integer('size').notNull(),
    /** Part status */
    status: text('status').notNull().default('pending'), // pending, uploaded, failed
    /** Timestamps */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    fileIdx: index('idx_upload_session_parts_file').on(table.fileId),
    filePartUnique: uniqueIndex('upload_session_parts_file_part_unique').on(
      table.fileId,
      table.partNumber,
    ),
  }),
)

// Upload Session Relations
export const uploadSessionsRelations = relations(uploadSessions, ({ many }) => ({
  files: many(uploadSessionFiles),
}))

export const uploadSessionFilesRelations = relations(uploadSessionFiles, ({ one, many }) => ({
  session: one(uploadSessions, {
    fields: [uploadSessionFiles.sessionId],
    references: [uploadSessions.id],
  }),
  parts: many(uploadSessionParts),
}))

export const uploadSessionPartsRelations = relations(uploadSessionParts, ({ one }) => ({
  file: one(uploadSessionFiles, {
    fields: [uploadSessionParts.fileId],
    references: [uploadSessionFiles.id],
  }),
}))
