import { pgTable, uuid, text, timestamp, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'

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

export const instructions = pgTable('instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocNumber: text('moc_number').notNull().unique(),
  title: text('title').notNull(),
  author: text('author').notNull().default(''),
  purchaseDate: timestamp('purchase_date', { withTimezone: true }),
  rebrickableUrl: text('rebrickable_url').notNull(),
  downloadUrl: text('download_url'),
  partsCount: integer('parts_count').notNull().default(0),
  fileType: text('file_type').notNull().default(''),
  fileSizeBytes: integer('file_size_bytes').notNull().default(0),
  contentHash: text('content_hash').notNull().default(''),
  minioKey: text('minio_key').notNull().default(''),
  minioUrl: text('minio_url').notNull().default(''),
  description: text('description'),
  descriptionHtml: text('description_html'),
  dateAdded: timestamp('date_added', { withTimezone: true }),
  authorProfileUrl: text('author_profile_url'),
  tags: jsonb('tags').$type<string[]>(),
  scrapeRunId: uuid('scrape_run_id')
    .notNull()
    .references(() => scrapeRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const parts = pgTable('parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  partNumber: text('part_number').notNull(),
  color: text('color').notNull().default(''),
  name: text('name').notNull().default(''),
  category: text('category').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('parts_part_number_color_idx').on(table.partNumber, table.color),
])

export const instructionParts = pgTable('instruction_parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  instructionId: uuid('instruction_id')
    .notNull()
    .references(() => instructions.id, { onDelete: 'cascade' }),
  partId: uuid('part_id')
    .notNull()
    .references(() => parts.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  isSpare: integer('is_spare').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('instruction_parts_instruction_part_idx').on(table.instructionId, table.partId),
])

export const scrapeCheckpoints = pgTable('scrape_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  scrapeRunId: uuid('scrape_run_id')
    .notNull()
    .references(() => scrapeRuns.id),
  mocNumber: text('moc_number').notNull(),
  phase: text('phase').notNull(),
  scrapedData: jsonb('scraped_data').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
