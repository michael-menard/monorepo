/**
 * Knowledge Base Schema — public PostgreSQL schema
 *
 * Database: KB DB (@repo/knowledge-base, port 5433)
 * Schema:   public
 *
 * Core knowledge storage: entries, embeddings, ADRs, code standards,
 * cohesion rules, lessons learned, and audit log.
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  customType,
  jsonb,
  boolean,
  integer,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

export const vector = customType<{
  data: number[]
  driverData: string
  config: { dimensions: number }
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    const cleaned = value.replace(/^\[|\]$/g, '')
    return cleaned.split(',').map(Number)
  },
})

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  role: text('role').notNull().default('all'),
  entryType: text('entry_type').notNull().default('note'),
  storyId: text('story_id'),
  tags: text('tags').array(),
  verified: boolean('verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  archived: boolean('archived').default(false).notNull(),
  archivedAt: timestamp('archived_at'),
  canonicalId: uuid('canonical_id').references((): AnyPgColumn => knowledgeEntries.id),
  isCanonical: boolean('is_canonical').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by'),
})

export const embeddingCache = pgTable('embedding_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentHash: text('content_hash').notNull(),
  model: text('model').notNull().default('text-embedding-3-small'),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const adrs = pgTable('adrs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adrId: text('adr_id').notNull(),
  title: text('title').notNull(),
  context: text('context').notNull(),
  decision: text('decision').notNull(),
  consequences: text('consequences'),
  status: text('status').notNull().default('accepted'),
  sourceEntryId: uuid('source_entry_id').references(() => knowledgeEntries.id, {
    onDelete: 'set null',
  }),
  sourceStoryId: text('source_story_id'),
  tags: text('tags').array(),
  workflowStoryId: text('workflow_story_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),
    operation: text('operation').notNull(),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value'),
    userContext: jsonb('user_context'),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    entryIdIdx: index('audit_log_entry_id_idx').on(table.entryId),
    timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),
    entryTimestampIdx: index('audit_log_entry_timestamp_idx').on(table.entryId, table.timestamp),
  }),
)

export const codeStandards = pgTable('code_standards', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  language: text('language'),
  standardType: text('standard_type').notNull(),
  sourceEntryId: uuid('source_entry_id').references(() => knowledgeEntries.id, {
    onDelete: 'set null',
  }),
  sourceStoryId: text('source_story_id'),
  tags: text('tags').array(),
  workflowStoryId: text('workflow_story_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const cohesionRules = pgTable('cohesion_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleName: text('rule_name').notNull(),
  ruleType: text('rule_type').notNull(),
  conditions: jsonb('conditions').notNull(),
  maxViolations: integer('max_violations'),
  severity: text('severity').notNull().default('warning'),
  isActive: boolean('is_active').default(true),
  sourceId: uuid('source_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const lessonsLearned = pgTable('lessons_learned', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull().default('other'),
  whatHappened: text('what_happened'),
  why: text('why'),
  resolution: text('resolution'),
  sourceEntryId: uuid('source_entry_id').references(() => knowledgeEntries.id, {
    onDelete: 'set null',
  }),
  sourceStoryId: text('source_story_id'),
  tags: text('tags').array(),
  verified: boolean('verified').default(false),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: text('verified_by'),
  workflowStoryId: text('workflow_story_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleText: text('rule_text').notNull(),
  ruleType: text('rule_type').notNull(),
  scope: text('scope').notNull(),
  severity: text('severity').notNull().default('warning'),
  status: text('status').notNull().default('active'),
  sourceId: uuid('source_id'),
  sourceStoryId: text('source_story_id'),
  sourceLessonId: uuid('source_lesson_id'),
  workflowStoryId: text('workflow_story_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect
export type NewKnowledgeEntry = typeof knowledgeEntries.$inferInsert
export type EmbeddingCacheEntry = typeof embeddingCache.$inferSelect
export type NewEmbeddingCacheEntry = typeof embeddingCache.$inferInsert
export type Adr = typeof adrs.$inferSelect
export type NewAdr = typeof adrs.$inferInsert
export type CodeStandard = typeof codeStandards.$inferSelect
export type NewCodeStandard = typeof codeStandards.$inferInsert
export type CohesionRule = typeof cohesionRules.$inferSelect
export type NewCohesionRule = typeof cohesionRules.$inferInsert
export type LessonLearned = typeof lessonsLearned.$inferSelect
export type NewLessonLearned = typeof lessonsLearned.$inferInsert
export type Rule = typeof rules.$inferSelect
export type NewRule = typeof rules.$inferInsert
