/**
 * Minimal test endpoint to debug import issues
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { z } from 'zod'
import loggerPkg from '@repo/logger'
import {
  type VercelRequest,
  type VercelResponse,
  validateCognitoJwt,
  transformRequest,
} from '@repo/vercel-adapter'
import {
  successResponse,
  errorResponseFromError,
  BadRequestError,
  UnauthorizedError,
} from '@repo/lambda-responses'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { SetSchema, SetListResponseSchema } from '@repo/api-client/schemas/sets'

// Inline schema
const sets = pgTable(
  'sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    setNumber: text('set_number'),
    store: text('store'),
    sourceUrl: text('source_url'),
    pieceCount: integer('piece_count'),
    releaseDate: timestamp('release_date'),
    theme: text('theme'),
    tags: text('tags').array().default([]),
    notes: text('notes'),
    isBuilt: boolean('is_built').default(false).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
    tax: decimal('tax', { precision: 10, scale: 2 }),
    shipping: decimal('shipping', { precision: 10, scale: 2 }),
    purchaseDate: timestamp('purchase_date'),
    wishlistItemId: uuid('wishlist_item_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdIdx: index('sets_user_id_idx').on(table.userId),
    setNumberIdx: index('sets_set_number_idx').on(table.setNumber),
    themeIdx: index('sets_theme_idx').on(table.theme),
  }),
)

const setImages = pgTable(
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
  table => ({
    setIdIdx: index('set_images_set_id_idx').on(table.setId),
  }),
)

const schema = { sets, setImages }

export default async function handler(req: any, res: any) {
  res.status(200).json({
    ok: true,
    message: 'All imports + inline schema work',
    hasSets: !!schema.sets,
  })
}
