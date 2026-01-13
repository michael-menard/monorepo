import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { z } from 'zod'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { sets } from '@/core/database/schema'
import { CreateSetSchema, type CreateSetInput, type Set } from '@repo/api-client/schemas/sets'

/**
 * Create Set Lambda Handler
 *
 * POST /api/sets
 *
 * Creates a new set for the authenticated user.
 */

// Simple wrapper to validate request body shape before mapping to Drizzle
const CreateSetRequestSchema = CreateSetSchema

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    if (!event.body) {
      return errorResponse(400, 'BAD_REQUEST', 'Request body is required')
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'BAD_REQUEST', 'Invalid JSON in request body')
    }

    const input: CreateSetInput = CreateSetRequestSchema.parse(parsedBody)

    // Map CreateSetInput -> Drizzle insert object
    const now = new Date()

    const [row] = await db
      .insert(sets)
      .values({
        userId,
        title: input.title,
        setNumber: input.setNumber ?? null,
        store: input.store ?? null,
        sourceUrl: input.sourceUrl ?? null,
        pieceCount: input.pieceCount ?? null,
        releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
        theme: input.theme ?? null,
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        isBuilt: input.isBuilt ?? false,
        quantity: input.quantity ?? 1,
        purchasePrice: input.purchasePrice ?? null,
        tax: input.tax ?? null,
        shipping: input.shipping ?? null,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        wishlistItemId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // Normalize DB row to API Set shape
    const set: Set = {
      id: row.id,
      userId: row.userId,
      title: row.title,
      setNumber: row.setNumber,
      store: row.store,
      sourceUrl: row.sourceUrl,
      pieceCount: row.pieceCount ?? null,
      releaseDate: row.releaseDate ? row.releaseDate.toISOString() : null,
      theme: row.theme,
      tags: row.tags ?? [],
      notes: row.notes,
      isBuilt: row.isBuilt,
      quantity: row.quantity,
      purchasePrice:
        row.purchasePrice === null || row.purchasePrice === undefined
          ? null
          : Number(row.purchasePrice),
      tax:
        row.tax === null || row.tax === undefined
          ? null
          : Number(row.tax),
      shipping:
        row.shipping === null || row.shipping === undefined
          ? null
          : Number(row.shipping),
      purchaseDate: row.purchaseDate ? row.purchaseDate.toISOString() : null,
      wishlistItemId: row.wishlistItemId,
      images: [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }

    logger.info('Set created', {
      userId,
      setId: set.id,
      title: set.title,
    })

    // successResponse wraps in { success: true, data: ... }
    return successResponse(set, 201)
  } catch (error) {
    logger.error('Create set error:', error)

    // We may receive ZodError instances from different Zod versions
    // (e.g. shared schemas from @repo/api-client). Use name-based
    // detection instead of instanceof to ensure consistent handling.
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create set')
  }
}
