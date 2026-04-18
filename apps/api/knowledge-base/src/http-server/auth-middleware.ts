/**
 * Cognito auth middleware for the KB HTTP server.
 *
 * Verifies a Cognito ID token from the `Authorization: Bearer <token>` header
 * against the user pool configured by the `@repo/api-core` `verifyIdToken`
 * helper, then enforces a single-user allow-list via the `ALLOWED_COGNITO_SUB`
 * env var.
 *
 * This is intentionally narrow: the KB HTTP server is only ever meant to be
 * reachable by the operator over Tailscale, so the allow-list is one entry.
 * Missing or invalid token -> 401. Valid token with a non-allow-listed sub
 * -> 403.
 *
 * @see EXKB-03 — auth middleware with ALLOWED_COGNITO_SUB allow-list
 */

import type { MiddlewareHandler } from 'hono'
import { verifyIdToken, type AuthUser } from '@repo/api-core'
import { createMcpLogger } from '../mcp-server/logger.js'

const logger = createMcpLogger('http-auth')

/**
 * Hono context variables set by this middleware for downstream handlers.
 */
export type AuthVariables = {
  /** Verified Cognito user (sub, email, username, groups) */
  authUser: AuthUser
}

/**
 * Create the Cognito auth middleware.
 *
 * The allow-list is resolved at middleware-creation time from
 * `process.env.ALLOWED_COGNITO_SUB`. Multiple subs can be provided
 * comma-separated. If the env var is unset, the middleware refuses all
 * requests (fail-closed) and logs a startup-time warning on the first hit.
 *
 * @param verifier - Override for `verifyIdToken`, used by tests.
 * @returns Hono middleware that populates `c.var.authUser` on success.
 */
export function createCognitoAuthMiddleware(
  verifier: (token: string) => Promise<AuthUser | null> = verifyIdToken,
): MiddlewareHandler<{ Variables: AuthVariables }> {
  const rawAllowList = process.env.ALLOWED_COGNITO_SUB ?? ''
  const allowedSubs = new Set(
    rawAllowList
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  )

  if (allowedSubs.size === 0) {
    logger.warn(
      'ALLOWED_COGNITO_SUB is empty; all authenticated requests will be rejected with 403',
    )
  }

  return async (c, next) => {
    const authHeader = c.req.header('authorization') ?? c.req.header('Authorization')

    if (!authHeader) {
      return c.json({ error: 'Unauthorized', message: 'Missing Authorization header' }, 401)
    }

    const user = await verifier(authHeader)

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401)
    }

    if (!allowedSubs.has(user.userId)) {
      logger.warn('Rejected request from non-allow-listed sub', {
        sub: user.userId,
        email: user.email,
      })
      return c.json({ error: 'Forbidden', message: 'User not permitted' }, 403)
    }

    c.set('authUser', user)
    await next()
  }
}
