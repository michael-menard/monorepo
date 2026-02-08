import {
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
import { mocInstructions } from './index'

// ─────────────────────────────────────────────────────────────────────────────
// Inspiration Gallery Schema (Epic 5)
//
// Tables for collecting, organizing, and managing visual inspiration for LEGO
// MOC builds through album-based organization with nested hierarchies (DAG)
// and MOC linking.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inspirations Table - Individual inspiration images
 *
 * Stores images that users collect as inspiration for their LEGO MOC builds.
 * Each inspiration can belong to multiple albums (many-to-many via inspiration_albums).
 */
export const inspirations = pgTable(
  'inspirations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)

    // Core fields
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url').notNull(), // S3 URL for the inspiration image
    thumbnailUrl: text('thumbnail_url'), // Optimized thumbnail URL
    sourceUrl: text('source_url'), // Original source URL (Pinterest, Instagram, etc.)

    // Organization
    tags: jsonb('tags').$type<string[]>().default([]),
    sortOrder: integer('sort_order').notNull().default(0), // Position in gallery for drag reorder

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for common queries
    userIdx: index('idx_inspirations_user_id').on(table.userId),
    userSortIdx: index('idx_inspirations_user_sort').on(table.userId, table.sortOrder),
    userCreatedIdx: index('idx_inspirations_user_created').on(table.userId, table.createdAt),
    titleIdx: index('idx_inspirations_title').on(table.title),
  }),
)

/**
 * Inspiration Albums Table - Collections of inspirations
 *
 * Albums organize inspirations into named collections. Albums support
 * nested hierarchies via album_parents (DAG structure with cycle detection).
 */
export const inspirationAlbums = pgTable(
  'inspiration_albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito user ID (sub claim from JWT)

    // Core fields
    title: text('title').notNull(),
    description: text('description'),
    coverImageId: uuid('cover_image_id'), // References inspirations.id for cover display

    // Organization
    tags: jsonb('tags').$type<string[]>().default([]),
    sortOrder: integer('sort_order').notNull().default(0), // Position in gallery for drag reorder

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for common queries
    userIdx: index('idx_inspiration_albums_user_id').on(table.userId),
    userSortIdx: index('idx_inspiration_albums_user_sort').on(table.userId, table.sortOrder),
    userCreatedIdx: index('idx_inspiration_albums_user_created').on(table.userId, table.createdAt),
    // Unique constraint: album title must be unique per user
    uniqueUserTitle: uniqueIndex('inspiration_albums_user_title_unique').on(
      table.userId,
      table.title,
    ),
  }),
)

/**
 * Inspiration Album Items - Many-to-many junction table
 *
 * Links inspirations to albums. An inspiration can belong to multiple albums,
 * and an album can contain multiple inspirations.
 */
export const inspirationAlbumItems = pgTable(
  'inspiration_album_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inspirationId: uuid('inspiration_id')
      .notNull()
      .references(() => inspirations.id, { onDelete: 'cascade' }),
    albumId: uuid('album_id')
      .notNull()
      .references(() => inspirationAlbums.id, { onDelete: 'cascade' }),

    // Sort order within the album
    sortOrder: integer('sort_order').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for efficient joins
    inspirationIdx: index('idx_inspiration_album_items_inspiration').on(table.inspirationId),
    albumIdx: index('idx_inspiration_album_items_album').on(table.albumId),
    albumSortIdx: index('idx_inspiration_album_items_album_sort').on(table.albumId, table.sortOrder),
    // Unique constraint: prevent duplicate inspiration-album pairs
    uniqueInspirationAlbum: uniqueIndex('inspiration_album_items_unique').on(
      table.inspirationId,
      table.albumId,
    ),
  }),
)

/**
 * Album Parents - DAG hierarchy for nested albums
 *
 * Defines parent-child relationships between albums. Uses DFS-based cycle
 * detection (INSP-022) to prevent circular references. Max nesting: 10 levels.
 *
 * DAG (Directed Acyclic Graph) structure allows:
 * - An album can have multiple parents (appear in multiple places)
 * - An album can have multiple children (contain sub-albums)
 * - No cycles (album cannot be its own ancestor)
 */
export const albumParents = pgTable(
  'album_parents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id')
      .notNull()
      .references(() => inspirationAlbums.id, { onDelete: 'cascade' }),
    parentAlbumId: uuid('parent_album_id')
      .notNull()
      .references(() => inspirationAlbums.id, { onDelete: 'cascade' }),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for efficient traversal
    albumIdx: index('idx_album_parents_album').on(table.albumId),
    parentIdx: index('idx_album_parents_parent').on(table.parentAlbumId),
    // Unique constraint: prevent duplicate parent-child pairs
    uniqueAlbumParent: uniqueIndex('album_parents_unique').on(table.albumId, table.parentAlbumId),
  }),
)

/**
 * Inspiration MOCs - Link inspirations to MOC instructions
 *
 * Tracks which MOC projects an inspiration is linked to.
 * Enables features like "Inspirations for this MOC" or "MOCs inspired by this".
 */
export const inspirationMocs = pgTable(
  'inspiration_mocs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inspirationId: uuid('inspiration_id')
      .notNull()
      .references(() => inspirations.id, { onDelete: 'cascade' }),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),

    // Optional notes about how this inspiration relates to the MOC
    notes: text('notes'),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for efficient joins
    inspirationIdx: index('idx_inspiration_mocs_inspiration').on(table.inspirationId),
    mocIdx: index('idx_inspiration_mocs_moc').on(table.mocId),
    // Unique constraint: prevent duplicate inspiration-MOC pairs
    uniqueInspirationMoc: uniqueIndex('inspiration_mocs_unique').on(
      table.inspirationId,
      table.mocId,
    ),
  }),
)

/**
 * Album MOCs - Link albums to MOC instructions
 *
 * Tracks which MOC projects an entire album is linked to.
 * Useful for grouping all inspirations for a specific build.
 */
export const albumMocs = pgTable(
  'album_mocs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id')
      .notNull()
      .references(() => inspirationAlbums.id, { onDelete: 'cascade' }),
    mocId: uuid('moc_id')
      .notNull()
      .references(() => mocInstructions.id, { onDelete: 'cascade' }),

    // Optional notes about how this album relates to the MOC
    notes: text('notes'),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    // Indexes for efficient joins
    albumIdx: index('idx_album_mocs_album').on(table.albumId),
    mocIdx: index('idx_album_mocs_moc').on(table.mocId),
    // Unique constraint: prevent duplicate album-MOC pairs
    uniqueAlbumMoc: uniqueIndex('album_mocs_unique').on(table.albumId, table.mocId),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle Relations
// ─────────────────────────────────────────────────────────────────────────────

export const inspirationsRelations = relations(inspirations, ({ many }) => ({
  albumItems: many(inspirationAlbumItems),
  mocs: many(inspirationMocs),
}))

export const inspirationAlbumsRelations = relations(inspirationAlbums, ({ one, many }) => ({
  coverImage: one(inspirations, {
    fields: [inspirationAlbums.coverImageId],
    references: [inspirations.id],
  }),
  items: many(inspirationAlbumItems),
  parents: many(albumParents, { relationName: 'albumChildren' }),
  children: many(albumParents, { relationName: 'albumParents' }),
  mocs: many(albumMocs),
}))

export const inspirationAlbumItemsRelations = relations(inspirationAlbumItems, ({ one }) => ({
  inspiration: one(inspirations, {
    fields: [inspirationAlbumItems.inspirationId],
    references: [inspirations.id],
  }),
  album: one(inspirationAlbums, {
    fields: [inspirationAlbumItems.albumId],
    references: [inspirationAlbums.id],
  }),
}))

export const albumParentsRelations = relations(albumParents, ({ one }) => ({
  album: one(inspirationAlbums, {
    fields: [albumParents.albumId],
    references: [inspirationAlbums.id],
    relationName: 'albumChildren',
  }),
  parent: one(inspirationAlbums, {
    fields: [albumParents.parentAlbumId],
    references: [inspirationAlbums.id],
    relationName: 'albumParents',
  }),
}))

export const inspirationMocsRelations = relations(inspirationMocs, ({ one }) => ({
  inspiration: one(inspirations, {
    fields: [inspirationMocs.inspirationId],
    references: [inspirations.id],
  }),
  moc: one(mocInstructions, {
    fields: [inspirationMocs.mocId],
    references: [mocInstructions.id],
  }),
}))

export const albumMocsRelations = relations(albumMocs, ({ one }) => ({
  album: one(inspirationAlbums, {
    fields: [albumMocs.albumId],
    references: [inspirationAlbums.id],
  }),
  moc: one(mocInstructions, {
    fields: [albumMocs.mocId],
    references: [mocInstructions.id],
  }),
}))
