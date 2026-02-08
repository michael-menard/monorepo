import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { auth, adminAuth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { authorizationService } from '../../composition/authorization.js'
import { extractClientIp } from '../../core/utils/ip.js'
import {
  createCognitoUserClient,
  createAuditLogRepository,
  createUserQuotaReadRepository,
} from './adapters/index.js'
import { createAdminService, type RequestContext } from './application/index.js'
import { ListUsersQuerySchema, ListAuditLogQuerySchema, BlockUserInputSchema } from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create adapters
const cognitoClient = createCognitoUserClient()
const auditRepo = createAuditLogRepository(db, schema)
const quotaReadRepo = createUserQuotaReadRepository(db, schema)

// Create service with injected dependencies
const adminService = createAdminService({
  cognitoClient,
  auditRepo,
  quotaReadRepo,
  authService: authorizationService,
})

// ─────────────────────────────────────────────────────────────────────────
// Helper: Extract request context for audit logging
// ─────────────────────────────────────────────────────────────────────────

function getRequestContext(c: any): RequestContext {
  return {
    ipAddress: extractClientIp(c.req.raw) ?? undefined,
    userAgent: c.req.header('user-agent') ?? undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const adminUsers = new Hono()

// All admin routes require authentication and admin role
adminUsers.use('*', auth)
adminUsers.use('*', adminAuth)

/**
 * GET /users - List users or search by email
 *
 * Query params:
 * - limit: Number of users to return (default 20, max 60)
 * - paginationToken: Token for next page
 * - email: Email prefix to search for
 */
adminUsers.get('/users', async c => {
  const userId = c.get('userId')
  const query = ListUsersQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { limit, paginationToken, email } = query.data
  const context = getRequestContext(c)

  // Search by email if provided, otherwise list all
  const result = email
    ? await adminService.searchUsers(userId, email, limit, context)
    : await adminService.listUsers(userId, limit, paginationToken, context)

  if (!result.ok) {
    const status = result.error === 'COGNITO_ERROR' ? 500 : 400
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * GET /users/:userId - Get user detail
 *
 * Returns combined Cognito + database user information.
 */
adminUsers.get('/users/:userId', async c => {
  const adminUserId = c.get('userId')
  const targetUserId = c.req.param('userId')
  const context = getRequestContext(c)

  const result = await adminService.getUserDetail(adminUserId, targetUserId, context)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST /users/:userId/revoke-tokens - Revoke all refresh tokens
 *
 * Globally signs out the user from all sessions.
 */
adminUsers.post('/users/:userId/revoke-tokens', async c => {
  const adminUserId = c.get('userId')
  const targetUserId = c.req.param('userId')
  const context = getRequestContext(c)

  const result = await adminService.revokeTokens(adminUserId, targetUserId, context)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : 500
    return c.json({ error: result.error }, status)
  }

  logger.info('Admin revoked tokens', { adminUserId, targetUserId })
  return c.json({ success: true })
})

/**
 * POST /users/:userId/block - Block a user account
 *
 * Body:
 * - reason: BlockReason (security_incident, policy_violation, account_compromise, other)
 * - notes: Optional additional notes
 */
adminUsers.post('/users/:userId/block', async c => {
  const adminUserId = c.get('userId')
  const targetUserId = c.req.param('userId')
  const body = await c.req.json()
  const input = BlockUserInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const context = getRequestContext(c)
  const result = await adminService.blockUser(adminUserId, targetUserId, input.data, context)

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND' ? 404 : result.error === 'USER_ALREADY_BLOCKED' ? 409 : 500
    return c.json({ error: result.error }, status)
  }

  logger.info('Admin blocked user', { adminUserId, targetUserId, reason: input.data.reason })
  return c.json({ success: true })
})

/**
 * POST /users/:userId/unblock - Unblock a user account
 */
adminUsers.post('/users/:userId/unblock', async c => {
  const adminUserId = c.get('userId')
  const targetUserId = c.req.param('userId')
  const context = getRequestContext(c)

  const result = await adminService.unblockUser(adminUserId, targetUserId, context)

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND' ? 404 : result.error === 'USER_NOT_BLOCKED' ? 409 : 500
    return c.json({ error: result.error }, status)
  }

  logger.info('Admin unblocked user', { adminUserId, targetUserId })
  return c.json({ success: true })
})

/**
 * GET /audit-log - Get admin audit log entries
 *
 * Query params:
 * - limit: Number of entries to return (default 50, max 100)
 * - targetUserId: Filter by target user
 * - actionType: Filter by action type
 */
adminUsers.get('/audit-log', async c => {
  const adminUserId = c.get('userId')
  const query = ListAuditLogQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { limit, targetUserId, actionType } = query.data
  const context = getRequestContext(c)

  const entries = await adminService.getAuditLog(
    adminUserId,
    { limit, targetUserId, actionType },
    context,
  )

  return c.json({ entries })
})

export default adminUsers
