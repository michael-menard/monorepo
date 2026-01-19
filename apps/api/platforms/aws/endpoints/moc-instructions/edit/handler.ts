/**
 * PATCH MOC Metadata Lambda Function
 *
 * Story 3.1.34: PATCH MOC Metadata Endpoint
 *
 * Route: PATCH /api/mocs/:mocId
 *
 * Features:
 * - Partial metadata updates (title, description, tags, theme, slug)
 * - Slug uniqueness check within owner scope (409 with suggestion on conflict)
 * - Owner-only access (401/403/404)
 * - OpenSearch re-indexing (fail-open)
 * - Always updates updatedAt timestamp
 *
 * Authentication: JWT via AWS Cognito (required)
 */

import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'

import { db } from '@/core/database/client'
import { mocInstructions } from '@/core/database/schema'
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { findAvailableSlug } from '@repo/upload-types'
import { updateMocIndex } from '@/endpoints/moc-instructions/_shared/opensearch-moc'
import type { MocInstruction } from '@repo/api-types/moc'

const logger = createLogger('moc-patch-metadata')

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

const MocIdSchema = z.string().uuid()

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

export type PatchMocRequest = z.infer<typeof PatchMocRequestSchema>

const PatchMocResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']),
  updatedAt: z.string().datetime(),
})

export type PatchMocResponse = z.infer<typeof PatchMocResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// API Gateway Event Interface
// ─────────────────────────────────────────────────────────────────────────────

interface APIGatewayEvent {
  requestContext: {
    http: {
      method: string
      path: string
    }
    authorizer?: {
      jwt?: {
        claims: {
          sub: string
          email?: string
        }
      }
    }
    requestId: string
  }
  headers?: Record<string, string | undefined>
  pathParameters?: Record<string, string>
  body?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId

  try {
    logger.info('PATCH MOC Metadata invoked', {
      requestId,
      path: event.requestContext.http.path,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 4: Auth Check (AC: 4)
    // ─────────────────────────────────────────────────────────────────────────

    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) {
      logger.warn('Unauthorized access attempt', { requestId })
      throw new UnauthorizedError('Authentication required')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 1: Extract and Validate Request (AC: 1, 2)
    // ─────────────────────────────────────────────────────────────────────────

    const mocId = event.pathParameters?.mocId || event.pathParameters?.id
    if (!mocId) {
      throw new NotFoundError('MOC ID is required')
    }

    // Validate mocId format
    const mocIdResult = MocIdSchema.safeParse(mocId)
    if (!mocIdResult.success) {
      throw new NotFoundError('MOC not found')
    }

    // Parse and validate request body
    if (!event.body) {
      throw new ConflictError('Request body is required')
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(event.body)
    } catch {
      throw new ConflictError('Invalid JSON in request body')
    }

    const bodyResult = PatchMocRequestSchema.safeParse(parsedBody)
    if (!bodyResult.success) {
      const issues = bodyResult.error.issues
      const errors = issues.map((e: any) => `${e.path?.join('.') || ''}: ${e.message}`).join(', ')
      return errorResponse(400, 'VALIDATION_ERROR', `Validation failed: ${errors}`, requestId)
    }

    const updateData = bodyResult.data

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'No fields to update', requestId)
    }

    logger.info('PATCH request validated', {
      requestId,
      mocId,
      fields: Object.keys(updateData),
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 4: Verify MOC Exists and Ownership (AC: 4)
    // ─────────────────────────────────────────────────────────────────────────

    const [existingMoc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!existingMoc) {
      logger.info('MOC not found', { requestId, mocId })
      throw new NotFoundError('MOC not found')
    }

    // Authorization check: user must own the MOC
    if (existingMoc.userId !== userId) {
      // Return 403 for non-owner
      logger.warn('Forbidden access attempt', { requestId, mocId, userId })
      throw new ForbiddenError('You do not have permission to edit this MOC')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 3: Slug Conflict Handling (AC: 3)
    // ─────────────────────────────────────────────────────────────────────────

    if (updateData.slug) {
      // Check for slug uniqueness within owner's MOCs (excluding current MOC)
      const existingWithSlug = await db
        .select({ id: mocInstructions.id, slug: mocInstructions.slug })
        .from(mocInstructions)
        .where(
          and(
            eq(mocInstructions.userId, userId),
            eq(mocInstructions.slug, updateData.slug),
            ne(mocInstructions.id, mocId),
          ),
        )
        .limit(1)

      if (existingWithSlug.length > 0) {
        // Fetch all existing slugs to generate suggestion
        const allUserSlugs = await db
          .select({ slug: mocInstructions.slug })
          .from(mocInstructions)
          .where(eq(mocInstructions.userId, userId))

        const existingSlugs = allUserSlugs.map(s => s.slug).filter((s): s is string => s !== null)

        const suggestedSlug = findAvailableSlug(updateData.slug, existingSlugs)

        logger.info('Slug conflict detected', {
          requestId,
          mocId,
          requestedSlug: updateData.slug,
          suggestedSlug,
        })

        return {
          statusCode: 409,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          },
          body: JSON.stringify({
            code: 'SLUG_CONFLICT',
            message: `The slug '${updateData.slug}' is already used by another of your MOCs`,
            suggestedSlug,
            correlationId: requestId,
          }),
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 5: Update Database (AC: 5)
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
      logger.error('Database update returned no result', { requestId, mocId })
      throw new Error('Failed to update MOC')
    }

    logger.info('MOC metadata updated', {
      requestId,
      mocId,
      updatedFields: Object.keys(updateData),
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 6: OpenSearch Re-indexing (AC: 6)
    // ─────────────────────────────────────────────────────────────────────────

    try {
      await updateMocIndex(updatedMoc as unknown as MocInstruction)
      logger.info('OpenSearch re-indexed', { requestId, mocId })
    } catch (error) {
      // Fail-open: log warning but don't fail the request
      logger.warn('OpenSearch update failed, reconciliation job will catch up', {
        requestId,
        mocId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build Response
    // ─────────────────────────────────────────────────────────────────────────

    const response: PatchMocResponse = {
      id: updatedMoc.id,
      title: updatedMoc.title,
      description: updatedMoc.description,
      slug: updatedMoc.slug,
      tags: updatedMoc.tags as string[] | null,
      theme: updatedMoc.theme,
      status: updatedMoc.status as 'draft' | 'published' | 'archived' | 'pending_review',
      updatedAt: updatedMoc.updatedAt.toISOString(),
    }

    // Validate response schema
    PatchMocResponseSchema.parse(response)

    return successResponse(200, {
      success: true,
      data: response,
    })
  } catch (error) {
    logger.error('PATCH MOC Metadata error', error, { requestId })
    return errorResponseFromError(error, requestId)
  }
}
