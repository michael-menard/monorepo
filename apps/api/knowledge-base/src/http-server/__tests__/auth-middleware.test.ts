/**
 * Tests for the Cognito auth middleware.
 *
 * These tests mount the middleware onto a minimal Hono app and drive it with
 * plain `fetch` calls using Hono's built-in `app.request()` helper — no Node
 * HTTP listener required. The real `verifyIdToken` is replaced with a stub so
 * we can assert the middleware's branching without a live Cognito pool.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import type { AuthUser } from '@repo/api-core'
import {
  createCognitoAuthMiddleware,
  type AuthVariables,
} from '../auth-middleware.js'

const ALLOWED_SUB = 'allowed-sub-uuid'
const OTHER_SUB = 'someone-else-uuid'

function buildApp(verifier: (token: string) => Promise<AuthUser | null>) {
  const app = new Hono<{ Variables: AuthVariables }>()
  app.use('/protected', createCognitoAuthMiddleware(verifier))
  app.get('/protected', c => c.json({ userId: c.get('authUser').userId }))
  app.get('/health', c => c.json({ status: 'ok' })) // unauthenticated
  return app
}

describe('createCognitoAuthMiddleware', () => {
  const originalEnv = process.env.ALLOWED_COGNITO_SUB

  beforeEach(() => {
    process.env.ALLOWED_COGNITO_SUB = ALLOWED_SUB
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ALLOWED_COGNITO_SUB
    } else {
      process.env.ALLOWED_COGNITO_SUB = originalEnv
    }
  })

  it('allows /health without an Authorization header', async () => {
    const app = buildApp(async () => null)
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('returns 401 when Authorization header is missing', async () => {
    const app = buildApp(async () => null)
    const res = await app.request('/protected')
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 401 when the verifier rejects the token', async () => {
    const app = buildApp(async () => null)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer bogus' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when the token is valid but the sub is not allow-listed', async () => {
    const app = buildApp(async () => ({
      userId: OTHER_SUB,
      email: 'x@y.com',
    }))
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer good-token' },
    })
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'Forbidden' })
  })

  it('passes through when the token is valid and the sub is allow-listed', async () => {
    const app = buildApp(async () => ({
      userId: ALLOWED_SUB,
      email: 'me@mine.com',
    }))
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer good-token' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId: ALLOWED_SUB })
  })

  it('supports a comma-separated ALLOWED_COGNITO_SUB', async () => {
    process.env.ALLOWED_COGNITO_SUB = `${OTHER_SUB}, ${ALLOWED_SUB}`
    const app = buildApp(async () => ({ userId: ALLOWED_SUB }))
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer good-token' },
    })
    expect(res.status).toBe(200)
  })

  it('rejects everything with 403 when ALLOWED_COGNITO_SUB is empty', async () => {
    process.env.ALLOWED_COGNITO_SUB = ''
    const app = buildApp(async () => ({ userId: ALLOWED_SUB }))
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer good-token' },
    })
    expect(res.status).toBe(403)
  })
})
