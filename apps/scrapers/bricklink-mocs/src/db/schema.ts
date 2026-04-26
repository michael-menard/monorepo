import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

/**
 * Reuses the shared scrape_runs and scrape_step_events tables from the
 * rebrickable scraper — both live in the same `rebrickable` database.
 *
 * New table: bricklink_designs — stores BrickLink Studio MOC metadata.
 * New table: bricklink_design_parts — parts list for each design.
 */

// ─── Shared tables (already exist in rebrickable DB) ──────────────────────

export const scrapeRuns = pgTable('scrape_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: text('status').notNull().default('running'),
  instructionsFound: integer('instructions_found').notNull().default(0),
  downloaded: integer('downloaded').notNull().default(0),
  skipped: integer('skipped').notNull().default(0),
  errors: jsonb('errors').notNull().default([]),
  config: jsonb('config').notNull().default({}),
  summary: jsonb('summary'),
})

export const scrapeStepEvents = pgTable(
  'scrape_step_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: text('job_id'),
    scrapeRunId: uuid('scrape_run_id').references(() => scrapeRuns.id),
    mocNumber: text('moc_number'),
    scraperType: text('scraper_type').notNull(),
    eventType: text('event_type').notNull(),
    stepId: text('step_id'),
    status: text('status'),
    seq: integer('seq').notNull(),
    detail: jsonb('detail'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('idx_scrape_step_events_job_id').on(table.jobId),
    index('idx_scrape_step_events_scrape_run').on(table.scrapeRunId),
    index('idx_scrape_step_events_created').on(table.createdAt),
  ],
)

// ─── BrickLink-specific tables ────────────────────────────────────────────

export const bricklinkDesigns = pgTable(
  'bricklink_designs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idModel: integer('id_model').notNull(),
    title: text('title').notNull(),
    author: text('author').notNull().default(''),
    authorUrl: text('author_url'),
    authorLocation: text('author_location'),
    description: text('description'),
    publishedDate: text('published_date'),
    category: text('category'),
    tags: jsonb('tags').$type<string[]>(),

    // Stats
    views: integer('views').notNull().default(0),
    downloads: integer('downloads').notNull().default(0),
    likes: integer('likes').notNull().default(0),
    comments: integer('comments').notNull().default(0),

    // Parts summary
    lotCount: integer('lot_count').notNull().default(0),
    itemCount: integer('item_count').notNull().default(0),
    colorCount: integer('color_count').notNull().default(0),

    // Images
    mainImageUrl: text('main_image_url'),
    galleryImageUrls: jsonb('gallery_image_urls').$type<string[]>(),

    // S3 references (after upload)
    mainImageS3Key: text('main_image_s3_key'),
    galleryImageS3Keys: jsonb('gallery_image_s3_keys').$type<string[]>(),

    // Source
    sourceUrl: text('source_url').notNull(),
    scrapeRunId: uuid('scrape_run_id')
      .notNull()
      .references(() => scrapeRuns.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [uniqueIndex('bricklink_designs_id_model_idx').on(table.idModel)],
)

export const bricklinkDesignParts = pgTable(
  'bricklink_design_parts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    designId: uuid('design_id')
      .notNull()
      .references(() => bricklinkDesigns.id, { onDelete: 'cascade' }),
    partNumber: text('part_number').notNull(),
    name: text('name').notNull().default(''),
    color: text('color').notNull().default(''),
    colorId: integer('color_id'),
    quantity: integer('quantity').notNull().default(1),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('bricklink_design_parts_design_part_color_idx').on(
      table.designId,
      table.partNumber,
      table.color,
    ),
  ],
)
