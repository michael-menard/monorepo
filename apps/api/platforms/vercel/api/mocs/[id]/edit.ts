/**
 * Vercel API Route: PATCH /api/mocs/:id/edit
 *
 * Handles partial metadata updates for a MOC.
 * - PATCH: Update title, description, tags, theme, slug
 *
 * Access rules:
 * - Authenticated users only (AUTH_BYPASS for dev)
 * - Owner-only access (403 for non-owner)
 * - 404 for non-existent MOC or invalid UUID
 *
 * Slug conflict handling:
 * - Returns 409 with suggestedSlug if slug conflicts with another of user's MOCs
 * - Same slug as current MOC does NOT conflict
 *
 * STORY-013: MOC Instructions - Edit (No Files)
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and, ne } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import loggerPkg from '@repo/logger'
import { findAvailableSlug } from '@repo/upload-types'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─────────────────────────────────────────────────────────────────────────────
// Request Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const PatchMocRequestSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
    description: z.string().max(2000, 'Description too long').nullable().optional(),
    tags: z
      .array(z.string().max(30, 'Tag too long'))
      .max(10, 'Maximum 10 tags allowed')
      .nullable()
      .optional(),
    theme: z.string().max(50, 'Theme too long').nullable().optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
      .max(100, 'Slug too long')
      .optional(),
  })
  .strict()

// ─────────────────────────────────────────────────────────────────────────────
// Inline Schema (matches apps/api/core/database/schema/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  mocId: text('moc_id'),
  slug: text('slug'),
  title: text('title').notNull(),
  description: text('description'),
  author: text('author'),
  brand: text('brand'),
  theme: text('theme'),
  subtheme: text('subtheme'),
  setNumber: text('set_number'),
  releaseYear: text('release_year'),
  retired: text('retired'),
  partsCount: text('parts_count'),
  tags: jsonb('tags').$type<string[]>(),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Database client (singleton)
// ─────────────────────────────────────────────────────────────────────────────

let dbClient: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!dbClient) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 1,
    })
    dbClient = drizzle(pool)
  }
  return dbClient
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user ID from AUTH_BYPASS or return null for unauthenticated.
 * This endpoint requires authentication - returns null if not authenticated.
 */
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow PATCH
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-1: Authentication Required
  // ─────────────────────────────────────────────────────────────────────────

  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-2: Extract and Validate MOC ID
  // ─────────────────────────────────────────────────────────────────────────

  const mocId = req.query.id as string
  if (!mocId) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'MOC not found',
      },
    })
    return
  }

  // Return 404 for invalid UUID format (not 400, to prevent existence leak)
  if (!uuidRegex.test(mocId)) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'MOC not found',
      },
    })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-3: Parse and Validate Request Body
  // ─────────────────────────────────────────────────────────────────────────

  // Handle invalid JSON
  let parsedBody: unknown
  try {
    // req.body is already parsed by Vercel if Content-Type is application/json
    // If it's a string, we need to parse it
    if (typeof req.body === 'string') {
      parsedBody = JSON.parse(req.body)
    } else {
      parsedBody = req.body
    }
  } catch {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON',
      },
    })
    return
  }

  // Handle empty body
  if (!parsedBody || typeof parsedBody !== 'object' || Object.keys(parsedBody).length === 0) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body is empty or has no updatable fields',
      },
    })
    return
  }

  // Validate with Zod schema (strict mode rejects unknown fields)
  const bodyResult = PatchMocRequestSchema.safeParse(parsedBody)
  if (!bodyResult.success) {
    const issues = bodyResult.error.issues
    const errors = issues.map(e => `${e.path?.join('.') || ''}: ${e.message}`).join(', ')
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${errors}`,
      },
    })
    return
  }

  const updateData = bodyResult.data

  // Check if there's anything to update (all fields are optional)
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'No fields to update',
      },
    })
    return
  }

  try {
    const db = getDb()

    // ─────────────────────────────────────────────────────────────────────────
    // AC-2: Verify MOC Exists and Ownership
    // ─────────────────────────────────────────────────────────────────────────

    const [existingMoc] = await db
      .select({
        id: mocInstructions.id,
        userId: mocInstructions.userId,
        title: mocInstructions.title,
        description: mocInstructions.description,
        slug: mocInstructions.slug,
        tags: mocInstructions.tags,
        theme: mocInstructions.theme,
        status: mocInstructions.status,
      })
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))

    if (!existingMoc) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'MOC not found',
        },
      })
      return
    }

    // Authorization check: user must own the MOC
    if (existingMoc.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this MOC',
        },
      })
      return
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-4: Slug Conflict Handling
    // ─────────────────────────────────────────────────────────────────────────

    if (updateData.slug !== undefined) {
      // Same slug as current MOC does NOT conflict
      if (updateData.slug !== existingMoc.slug) {
        // Check for slug uniqueness within owner's MOCs (excluding current MOC)
        const existingWithSlug = await db
          .select({ id: mocInstructions.id })
          .from(mocInstructions)
          .where(
            and(
              eq(mocInstructions.userId, userId),
              eq(mocInstructions.slug, updateData.slug),
              ne(mocInstructions.id, mocId),
            ),
          )

        if (existingWithSlug.length > 0) {
          // Fetch all existing slugs to generate suggestion
          const allUserSlugs = await db
            .select({ slug: mocInstructions.slug })
            .from(mocInstructions)
            .where(eq(mocInstructions.userId, userId))

          const existingSlugs = allUserSlugs.map(s => s.slug).filter((s): s is string => s !== null)

          const suggestedSlug = findAvailableSlug(updateData.slug, existingSlugs)

          logger.info('Slug conflict detected', {
            mocId,
            requestedSlug: updateData.slug,
            suggestedSlug,
          })

          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: `The slug '${updateData.slug}' is already used by another of your MOCs`,
            },
            suggestedSlug,
          })
          return
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5: Update Database
    // ─────────────────────────────────────────────────────────────────────────

    const now = new Date()

    // Build update object with only provided fields
    const dbUpdateData: Record<string, unknown> = {
      updatedAt: now,
    }

    if (updateData.title !== undefined) dbUpdateData.title = updateData.title
    if (updateData.description !== undefined) dbUpdateData.description = updateData.description
    if (updateData.tags !== undefined) dbUpdateData.tags = updateData.tags
    if (updateData.theme !== undefined) dbUpdateData.theme = updateData.theme
    if (updateData.slug !== undefined) dbUpdateData.slug = updateData.slug

    const [updatedMoc] = await db
      .update(mocInstructions)
      .set(dbUpdateData)
      .where(eq(mocInstructions.id, mocId))
      .returning()

    if (!updatedMoc) {
      logger.error('Database update returned no result', { mocId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update MOC',
        },
      })
      return
    }

    logger.info('MOC metadata updated', {
      mocId,
      updatedFields: Object.keys(updateData),
    })

    // ─────────────────────────────────────────────────────────────────────────
    // AC-5/AC-6: Build Response
    // ─────────────────────────────────────────────────────────────────────────

    const response = {
      id: updatedMoc.id,
      title: updatedMoc.title,
      description: updatedMoc.description,
      slug: updatedMoc.slug,
      tags: updatedMoc.tags,
      theme: updatedMoc.theme,
      status: updatedMoc.status,
      updatedAt: updatedMoc.updatedAt.toISOString(),
    }

    res.status(200).json({
      success: true,
      data: response,
    })
  } catch (error) {
    logger.error('PATCH MOC error', {
      mocId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
