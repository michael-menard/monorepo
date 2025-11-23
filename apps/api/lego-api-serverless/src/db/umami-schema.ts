/**
 * Umami Analytics Database Schema
 *
 * This schema defines the Umami analytics tables in the 'umami' PostgreSQL schema.
 * It's isolated from the main application schema for security and data separation.
 *
 * Story 1.2: Aurora PostgreSQL Schema for Umami
 *
 * Schema Isolation:
 * - All tables are in the 'umami' PostgreSQL schema namespace
 * - Completely isolated from application data (public schema)
 * - Managed by dedicated 'umami_user' database role
 *
 * Based on Umami v2.x database structure with Prisma migrations
 */

import {
  boolean,
  char,
  index,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Define the 'umami' PostgreSQL schema namespace
export const umamiSchema = pgSchema('umami')

/**
 * Prisma Migrations Table
 * Tracks applied database migrations for Umami
 */
export const prismaMigrations = umamiSchema.table('_prisma_migrations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  checksum: varchar('checksum', { length: 64 }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  migrationName: varchar('migration_name', { length: 255 }).notNull(),
  logs: text('logs'),
  rolledBackAt: timestamp('rolled_back_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  appliedStepsCount: integer('applied_steps_count').notNull().default(0),
})

/**
 * Account Table
 * Stores Umami admin user accounts for the web interface
 */
export const account = umamiSchema.table(
  'account',
  {
    userId: uuid('user_id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 60 }).notNull(), // bcrypt hash
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    usernameIdx: uniqueIndex('account_username_idx').on(table.username),
  }),
)

/**
 * Website Table
 * Stores website configurations for analytics tracking
 */
export const website = umamiSchema.table(
  'website',
  {
    websiteId: uuid('website_id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    domain: varchar('domain', { length: 500 }),
    shareId: varchar('share_id', { length: 50 }).unique(),
    revId: integer('rev_id').notNull().default(0),
    userId: uuid('user_id').references(() => account.userId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  table => ({
    shareIdIdx: uniqueIndex('website_share_id_idx').on(table.shareId),
    userIdIdx: index('website_user_id_idx').on(table.userId),
    createdAtIdx: index('website_created_at_idx').on(table.createdAt),
  }),
)

/**
 * Session Table
 * Stores user session data for analytics
 */
export const session = umamiSchema.table(
  'session',
  {
    sessionId: uuid('session_id').primaryKey().defaultRandom(),
    websiteId: uuid('website_id')
      .notNull()
      .references(() => website.websiteId, { onDelete: 'cascade' }),
    hostname: varchar('hostname', { length: 100 }),
    browser: varchar('browser', { length: 20 }),
    os: varchar('os', { length: 20 }),
    device: varchar('device', { length: 20 }),
    screen: varchar('screen', { length: 11 }),
    language: varchar('language', { length: 35 }),
    country: char('country', { length: 2 }),
    subdivision1: char('subdivision1', { length: 3 }),
    subdivision2: char('subdivision2', { length: 3 }),
    city: varchar('city', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    websiteIdIdx: index('session_website_id_idx').on(table.websiteId),
    createdAtIdx: index('session_created_at_idx').on(table.createdAt),
    websiteCreatedIdx: index('session_website_created_idx').on(table.websiteId, table.createdAt),
  }),
)

/**
 * Website Event Table
 * Stores custom events for analytics
 */
export const websiteEvent = umamiSchema.table(
  'website_event',
  {
    eventId: uuid('event_id').primaryKey().defaultRandom(),
    websiteId: uuid('website_id')
      .notNull()
      .references(() => website.websiteId, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => session.sessionId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    urlPath: varchar('url_path', { length: 500 }).notNull(),
    urlQuery: varchar('url_query', { length: 1000 }),
    referrerPath: varchar('referrer_path', { length: 500 }),
    referrerQuery: varchar('referrer_query', { length: 1000 }),
    referrerDomain: varchar('referrer_domain', { length: 500 }),
    pageTitle: varchar('page_title', { length: 500 }),
    eventType: integer('event_type').notNull().default(1), // 1 = pageview, 2 = custom event
    eventName: varchar('event_name', { length: 50 }),
  },
  table => ({
    websiteIdIdx: index('website_event_website_id_idx').on(table.websiteId),
    sessionIdIdx: index('website_event_session_id_idx').on(table.sessionId),
    createdAtIdx: index('website_event_created_at_idx').on(table.createdAt),
    websiteCreatedIdx: index('website_event_website_created_idx').on(
      table.websiteId,
      table.createdAt,
    ),
    websiteSessionCreatedIdx: index('website_event_website_session_created_idx').on(
      table.websiteId,
      table.sessionId,
      table.createdAt,
    ),
  }),
)

/**
 * Event Data Table
 * Stores additional data for custom events (key-value pairs)
 */
export const eventData = umamiSchema.table(
  'event_data',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => websiteEvent.eventId, { onDelete: 'cascade' }),
    websiteId: uuid('website_id')
      .notNull()
      .references(() => website.websiteId, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => session.sessionId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    urlPath: varchar('url_path', { length: 500 }).notNull(),
    eventName: varchar('event_name', { length: 50 }).notNull(),
    dataKey: varchar('data_key', { length: 500 }).notNull(),
    stringValue: varchar('string_value', { length: 500 }),
    numberValue: integer('number_value'),
    dateValue: timestamp('date_value', { withTimezone: true }),
    dataType: integer('data_type').notNull(), // 1 = string, 2 = number, 3 = boolean, 4 = date
  },
  table => ({
    eventIdIdx: index('event_data_event_id_idx').on(table.eventId),
    websiteIdIdx: index('event_data_website_id_idx').on(table.websiteId),
    createdAtIdx: index('event_data_created_at_idx').on(table.createdAt),
    websiteCreatedIdx: index('event_data_website_created_idx').on(table.websiteId, table.createdAt),
  }),
)

/**
 * Team Table
 * Stores team information for multi-user access
 */
export const team = umamiSchema.table(
  'team',
  {
    teamId: uuid('team_id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    accessCode: varchar('access_code', { length: 50 }).unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    accessCodeIdx: uniqueIndex('team_access_code_idx').on(table.accessCode),
  }),
)

/**
 * Team User Table
 * Junction table for team membership
 */
export const teamUser = umamiSchema.table(
  'team_user',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.teamId, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => account.userId, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull().default('member'), // 'owner', 'admin', 'member', 'viewer'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    teamUserIdx: uniqueIndex('team_user_team_user_idx').on(table.teamId, table.userId),
    teamIdIdx: index('team_user_team_id_idx').on(table.teamId),
    userIdIdx: index('team_user_user_id_idx').on(table.userId),
  }),
)

/**
 * Team Website Table
 * Junction table for team website access
 */
export const teamWebsite = umamiSchema.table(
  'team_website',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.teamId, { onDelete: 'cascade' }),
    websiteId: uuid('website_id')
      .notNull()
      .references(() => website.websiteId, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    teamWebsiteIdx: uniqueIndex('team_website_team_website_idx').on(table.teamId, table.websiteId),
    teamIdIdx: index('team_website_team_id_idx').on(table.teamId),
    websiteIdIdx: index('team_website_website_id_idx').on(table.websiteId),
  }),
)

// ========================================
// Relations
// ========================================

/**
 * Account Relations
 */
export const accountRelations = relations(account, ({ many }) => ({
  websites: many(website),
  teamUsers: many(teamUser),
}))

/**
 * Website Relations
 */
export const websiteRelations = relations(website, ({ one, many }) => ({
  owner: one(account, {
    fields: [website.userId],
    references: [account.userId],
  }),
  sessions: many(session),
  events: many(websiteEvent),
  eventData: many(eventData),
  teamWebsites: many(teamWebsite),
}))

/**
 * Session Relations
 */
export const sessionRelations = relations(session, ({ one, many }) => ({
  website: one(website, {
    fields: [session.websiteId],
    references: [website.websiteId],
  }),
  events: many(websiteEvent),
  eventData: many(eventData),
}))

/**
 * Website Event Relations
 */
export const websiteEventRelations = relations(websiteEvent, ({ one, many }) => ({
  website: one(website, {
    fields: [websiteEvent.websiteId],
    references: [website.websiteId],
  }),
  session: one(session, {
    fields: [websiteEvent.sessionId],
    references: [session.sessionId],
  }),
  eventData: many(eventData),
}))

/**
 * Event Data Relations
 */
export const eventDataRelations = relations(eventData, ({ one }) => ({
  event: one(websiteEvent, {
    fields: [eventData.eventId],
    references: [websiteEvent.eventId],
  }),
  website: one(website, {
    fields: [eventData.websiteId],
    references: [website.websiteId],
  }),
  session: one(session, {
    fields: [eventData.sessionId],
    references: [session.sessionId],
  }),
}))

/**
 * Team Relations
 */
export const teamRelations = relations(team, ({ many }) => ({
  teamUsers: many(teamUser),
  teamWebsites: many(teamWebsite),
}))

/**
 * Team User Relations
 */
export const teamUserRelations = relations(teamUser, ({ one }) => ({
  team: one(team, {
    fields: [teamUser.teamId],
    references: [team.teamId],
  }),
  user: one(account, {
    fields: [teamUser.userId],
    references: [account.userId],
  }),
}))

/**
 * Team Website Relations
 */
export const teamWebsiteRelations = relations(teamWebsite, ({ one }) => ({
  team: one(team, {
    fields: [teamWebsite.teamId],
    references: [team.teamId],
  }),
  website: one(website, {
    fields: [teamWebsite.websiteId],
    references: [website.websiteId],
  }),
}))

// Export all tables for use in migrations and queries
export const umamiTables = {
  prismaMigrations,
  account,
  website,
  session,
  websiteEvent,
  eventData,
  team,
  teamUser,
  teamWebsite,
}

// Export all relations
export const umamiRelations = {
  accountRelations,
  websiteRelations,
  sessionRelations,
  websiteEventRelations,
  eventDataRelations,
  teamRelations,
  teamUserRelations,
  teamWebsiteRelations,
}
