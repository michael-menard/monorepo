import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
  pgSchema,
} from 'drizzle-orm/pg-core'

export const workflowSchema = pgSchema('workflow')

export const planStatusEnum = workflowSchema.enum('plan_status', [
  'draft',
  'active',
  'accepted',
  'stories-created',
  'in-progress',
  'implemented',
  'superseded',
  'archived',
  'blocked',
])

export const planPriorityEnum = workflowSchema.enum('plan_priority', ['P1', 'P2', 'P3', 'P4', 'P5'])

export const plans = workflowSchema.table(
  'plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    planSlug: text('plan_slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    planType: text('plan_type'),
    status: text('status').notNull().default('active'),
    featureDir: text('feature_dir'),
    storyPrefix: text('story_prefix'),
    estimatedStories: integer('estimated_stories'),
    phases: jsonb('phases'),
    tags: text('tags'),
    rawContent: text('raw_content'),
    sourceFile: text('source_file'),
    contentHash: text('content_hash'),
    kbEntryId: uuid('kb_entry_id'),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    priority: text('priority').default('P3'),
    dependencies: jsonb('dependencies'),
    parentPlanId: uuid('parent_plan_id'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: text('deleted_by'),
    supersededBy: uuid('superseded_by'),
    preBlockedStatus: text('pre_blocked_status'),
  },
  table => ({
    planSlugUnique: uniqueIndex('plans_plan_slug_unique').on(table.planSlug),
    statusIdx: index('idx_plans_status').on(table.status),
    planTypeIdx: index('idx_plans_plan_type').on(table.planType),
    storyPrefixIdx: index('idx_plans_story_prefix').on(table.storyPrefix),
    parentPlanIdx: index('idx_plans_parent_plan_id').on(table.parentPlanId),
    featureDirIdx: index('idx_plans_feature_dir').on(table.featureDir),
    createdAtIdx: index('idx_plans_created_at').on(table.createdAt),
  }),
)

export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert
