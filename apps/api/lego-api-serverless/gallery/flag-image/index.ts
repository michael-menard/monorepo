/**
 * Flag Gallery Image Lambda Handler
 *
 * POST /api/flag
 * Flags an image for moderation review
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { db } from '@monorepo/db/client'
import { galleryFlags } from '@monorepo/db/schema'

// Zod schema for flag request
const FlagSchema = z.object({
  imageId: z.string().uuid(),
  reason: z.string().optional(),
})

/**
 * Flag Image Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const parse = FlagSchema.safeParse(body)

    if (!parse.success) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid input')
    }

    const { imageId, reason } = parse.data

    // Check if already flagged
    const existing = await db
      .select()
      .from(galleryFlags)
      .where(and(eq(galleryFlags.imageId, imageId), eq(galleryFlags.userId, userId)))

    if (existing.length > 0) {
      return createErrorResponse(409, 'CONFLICT', 'You have already flagged this image')
    }

    // Insert flag
    const [flag] = await db
      .insert(galleryFlags)
      .values({
        imageId,
        userId,
        reason: reason || null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      })
      .returning()

    return createSuccessResponse(
      {
        message: 'Image flagged for moderation',
        flag,
      },
      201,
    )
  } catch (error) {
    logger.error('Flag image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to flag image')
  }
}
