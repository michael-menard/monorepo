/**
 * MOC Instructions Lambda Function
 *
 * Multi-method handler for MOC Instructions CRUD operations.
 * Routes requests based on HTTP method and implements:
 * - GET /api/mocs - List all MOCs (paginated, searchable)
 * - GET /api/mocs/:id - Get MOC detail
 * - POST /api/mocs - Create new MOC
 * - PATCH /api/mocs/:id - Update MOC
 * - DELETE /api/mocs/:id - Delete MOC
 *
 * Authentication: JWT via AWS Cognito
 * Database: PostgreSQL via Drizzle ORM + RDS Proxy
 * Caching: Redis via ElastiCache
 * Search: OpenSearch for full-text queries
 */

import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import {
  CreateMocSchema,
  UpdateMocSchema,
  MocListQuerySchema,
} from '@/endpoints/moc-instructions/_shared/types'
import { BadRequestError, UnauthorizedError, ValidationError } from '@/core/utils/responses'
import {
  listMocs as listMocsService,
  getMocDetail as getMocDetailService,
  createMoc as createMocService,
  updateMoc as updateMocService,
  deleteMoc as deleteMocService,
} from '@/endpoints/moc-instructions/_shared/moc-service'
import { logger } from '@/core/observability/logger'

/**
 * API Gateway Event Interface
 * Simplified for the subset of fields we use
 */
interface APIGatewayEvent {
  requestContext: {
    http: {
      method: string
      path: string
    }
    authorizer?: {
      jwt?: {
        claims: {
          sub: string // User ID from Cognito
          email?: string
        }
      }
    }
    requestId: string
  }
  pathParameters?: Record<string, string>
  queryStringParameters?: Record<string, string>
  body?: string | null
}

/**
 * Main Lambda Handler
 * Routes to appropriate handler based on HTTP method
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('MOC Instructions Lambda invoked', {
      requestId: event.requestContext.requestId,
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
    })

    const method = event.requestContext.http.method

    // Route to appropriate handler
    switch (method) {
      case 'GET':
        return await handleGet(event)
      case 'POST':
        return await handlePost(event)
      case 'PATCH':
        return await handlePatch(event)
      case 'DELETE':
        return await handleDelete(event)
      default:
        throw new BadRequestError(`Method ${method} not supported`)
    }
  } catch (error) {
    logger.error('MOC Instructions Lambda error:', error)
    return errorResponseFromError(error)
  }
}

/**
 * GET Handler
 * Routes:
 * - GET /api/mocs -> List all MOCs
 * - GET /api/mocs/:id -> Get MOC detail
 */
async function handleGet(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserIdFromEvent(event)
  const mocId = event.pathParameters?.id

  if (mocId) {
    // GET /api/mocs/:id - Retrieve MOC detail
    return await getMocDetail(mocId, userId)
  } else {
    // GET /api/mocs - List all MOCs
    const query = event.queryStringParameters || {}
    return await listMocs(userId, query)
  }
}

/**
 * POST Handler
 * Route: POST /api/mocs - Create new MOC
 */
async function handlePost(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserIdFromEvent(event)

  if (!event.body) {
    throw new BadRequestError('Request body is required')
  }

  const body = JSON.parse(event.body)
  return await createMoc(userId, body)
}

/**
 * PATCH Handler
 * Route: PATCH /api/mocs/:id - Update MOC
 */
async function handlePatch(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserIdFromEvent(event)
  const mocId = event.pathParameters?.id

  if (!mocId) {
    throw new BadRequestError('MOC ID is required')
  }

  if (!event.body) {
    throw new BadRequestError('Request body is required')
  }

  const body = JSON.parse(event.body)
  return await updateMoc(mocId, userId, body)
}

/**
 * DELETE Handler
 * Route: DELETE /api/mocs/:id - Delete MOC
 */
async function handleDelete(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserIdFromEvent(event)
  const mocId = event.pathParameters?.id

  if (!mocId) {
    throw new BadRequestError('MOC ID is required')
  }

  return await deleteMoc(mocId, userId)
}

/**
 * Extract user ID from JWT claims
 * Throws UnauthorizedError if not present
 */
function getUserIdFromEvent(event: APIGatewayEvent): string {
  const userId = event.requestContext.authorizer?.jwt?.claims.sub

  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  return userId
}

/**
 * LIST MOCS - GET /api/mocs
 * Story 2.2 implementation
 *
 * Features:
 * - Pagination with page/limit query params (default: page=1, limit=20)
 * - Search via OpenSearch (falls back to PostgreSQL ILIKE)
 * - Tag filtering
 * - Redis caching with 5-minute TTL
 * - Cache invalidation on mutations
 */
async function listMocs(
  userId: string,
  queryParams: Record<string, string>,
): Promise<APIGatewayProxyResult> {
  // Validate query parameters
  const parse = MocListQuerySchema.safeParse(queryParams)
  if (!parse.success) {
    throw new ValidationError('Invalid query parameters', {
      errors: parse.error.flatten(),
    })
  }

  const query = parse.data

  logger.info('Listing MOCs', { userId, query })

  // Call service layer for business logic
  const { mocs, total } = await listMocsService(userId, query)

  // Return standardized response matching existing API contract
  return successResponse(200, {
    success: true,
    data: mocs,
    total,
    page: query.page,
    limit: query.limit,
  })
}

/**
 * GET MOC DETAIL - GET /api/mocs/:id
 * Story 2.3 implementation
 *
 * Features:
 * - Authorization check (user must own MOC)
 * - Eager loading of related entities:
 *   - mocFiles (instructions, parts lists, thumbnails, images)
 *   - mocGalleryImages (linked from gallery)
 *   - mocPartsLists (parts list metadata)
 * - Redis caching with 10-minute TTL
 * - Cache hit logging
 */
async function getMocDetail(mocId: string, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Getting MOC detail', { mocId, userId })

  // Call service layer for business logic
  const mocDetail = await getMocDetailService(mocId, userId)

  // Return standardized response
  return successResponse(200, {
    success: true,
    data: mocDetail,
  })
}

/**
 * CREATE MOC - POST /api/mocs
 * Story 2.4 implementation
 *
 * Features:
 * - Request body validation with Zod (title required, description/tags/thumbnailUrl optional)
 * - User ID from JWT automatically assigned
 * - Unique title per user constraint (database enforced - returns 409 on duplicate)
 * - Database transaction for atomicity
 * - OpenSearch indexing (async, non-blocking)
 * - Redis cache invalidation (user's MOC list)
 * - Returns 201 Created with full MOC object
 */
async function createMoc(userId: string, body: unknown): Promise<APIGatewayProxyResult> {
  // Validate input
  const parse = CreateMocSchema.safeParse(body)
  if (!parse.success) {
    throw new ValidationError('Invalid MOC data', {
      errors: parse.error.flatten(),
    })
  }

  const mocData = parse.data

  logger.info('Creating MOC', { userId, title: mocData.title })

  // Call service layer for business logic
  const createdMoc = await createMocService(userId, mocData)

  // Return 201 Created with standardized response
  return successResponse(201, {
    success: true,
    data: createdMoc,
  })
}

/**
 * UPDATE MOC - PATCH /api/mocs/:id
 * Story 2.5 implementation
 */
async function updateMoc(
  mocId: string,
  userId: string,
  body: unknown,
): Promise<APIGatewayProxyResult> {
  // Validate input
  const parse = UpdateMocSchema.safeParse(body)
  if (!parse.success) {
    throw new ValidationError('Invalid update data', {
      errors: parse.error.flatten(),
    })
  }

  const updateData = parse.data

  logger.info('Updating MOC', { mocId, userId, updateData })

  // Call service layer for business logic
  const updatedMoc = await updateMocService(mocId, userId, updateData)

  // Return standardized response
  return successResponse(200, {
    success: true,
    data: updatedMoc,
  })
}

/**
 * DELETE MOC - DELETE /api/mocs/:id
 * Story 2.6 implementation
 */
async function deleteMoc(mocId: string, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Deleting MOC', { mocId, userId })

  // Call service layer for business logic
  await deleteMocService(mocId, userId)

  // Return 204 No Content (successful deletion)
  return successResponse(204, {
    success: true,
    message: 'MOC deleted successfully',
  })
}
