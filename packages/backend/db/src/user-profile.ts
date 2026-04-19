import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

// ─────────────────────────────────────────────────────────────────────────────
// User Profiles (PROF plan)
// ─────────────────────────────────────────────────────────────────────────────

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // Cognito sub (text, not FK — matches convention)
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'), // MinIO S3 key
    memberSince: timestamp('member_since').defaultNow().notNull(),
    preferences: jsonb('preferences').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: uniqueIndex('idx_user_profiles_user_id').on(table.userId),
  }),
)

// ─────────────────────────────────────────────────────────────────────────────
// Activity Events (PROF plan)
// ─────────────────────────────────────────────────────────────────────────────

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(), // 'added', 'progress', 'wishlist_add', 'instruction_upload', etc.
    title: text('title').notNull(),
    message: text('message'),
    relatedId: text('related_id'), // ID of related entity (MOC, set, etc.)
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('idx_activity_events_user_id').on(table.userId),
    createdAtIdx: index('idx_activity_events_created_at').on(table.createdAt),
    userCreatedIdx: index('idx_activity_events_user_created').on(table.userId, table.createdAt),
  }),
)
