/**
 * Unit Tests for Rules Registry HTTP Handler
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Tests each route, each status code path using mocked compute functions.
 *
 * AC-11: HTTP handler test coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleRulesRegistryRequest } from '../http-handler.js'

// Mock compute functions
vi.mock('../rules-registry.js', () => ({
  getRules: vi.fn(),
  proposeRule: vi.fn(),
  promoteRule: vi.fn(),
  normalizeRuleText: (text: string) => text.toLowerCase().trim(),
}))

import { getRules, proposeRule, promoteRule } from '../rules-registry.js'

// ============================================================================
// Helper: Create mock request/response
// ============================================================================

function createMockReq(
  method: string,
  url: string,
  body?: unknown,
): IncomingMessage {
  const req = {
    method,
    url,
    headers: { host: 'localhost' },
  } as IncomingMessage

  if (body !== undefined) {
    const bodyStr = JSON.stringify(body)
    let consumed = false
    req.on = (event: string, handler: Function) => {
      if (event === 'data' && !consumed) {
        consumed = true
        handler(Buffer.from(bodyStr, 'utf-8'))
      } else if (event === 'end') {
        setImmediate(() => handler())
      }
      return req
    }
  } else {
    req.on = (event: string, handler: Function) => {
      if (event === 'end') {
        setImmediate(() => handler())
      }
      return req
    }
  }

  return req
}

function createMockRes() {
  const res = {
    headersSent: false,
    statusCode: 0,
    body: '',
    writeHead: vi.fn().mockImplementation(function (this: any, status: number) {
      this.statusCode = status
      this.headersSent = true
    }),
    end: vi.fn().mockImplementation(function (this: any, data: string) {
      this.body = data
    }),
  }
  return res as unknown as ServerResponse & { statusCode: number; body: string }
}

const mockRule = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  rule_text: 'Use Zod schemas',
  rule_type: 'lint' as const,
  scope: 'global',
  severity: 'error' as const,
  status: 'active' as const,
  source_story_id: 'WINT-4020',
  source_lesson_id: null,
  created_at: new Date('2026-03-07'),
  updated_at: new Date('2026-03-07'),
}

// ============================================================================
// GET /rules
// ============================================================================

describe('GET /rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with empty array when no rules', async () => {
    vi.mocked(getRules).mockResolvedValue([])
    const req = createMockReq('GET', '/rules')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual([])
  })

  it('returns 200 with rules list', async () => {
    vi.mocked(getRules).mockResolvedValue([mockRule])
    const req = createMockReq('GET', '/rules')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it('returns 200 with type filter passed to getRules', async () => {
    vi.mocked(getRules).mockResolvedValue([mockRule])
    const req = createMockReq('GET', '/rules?type=lint')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(200)
    expect(vi.mocked(getRules)).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lint' }),
    )
  })

  it('returns 400 for invalid type query param', async () => {
    const req = createMockReq('GET', '/rules?type=invalid_type')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
    expect(body.error).toContain('Validation error')
  })

  it('returns 400 for invalid status query param', async () => {
    const req = createMockReq('GET', '/rules?status=unknown_status')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
  })
})

// ============================================================================
// POST /rules
// ============================================================================

describe('POST /rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validBody = {
    rule_text: 'Do not use TypeScript interfaces',
    rule_type: 'lint',
    scope: 'global',
    severity: 'error',
    source_story_id: 'WINT-4020',
  }

  it('returns 201 on successful rule proposal', async () => {
    vi.mocked(proposeRule).mockResolvedValue({ ok: true, data: { ...mockRule, status: 'proposed' } })
    const req = createMockReq('POST', '/rules', validBody)
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.data).toBeDefined()
  })

  it('returns 409 on conflict', async () => {
    vi.mocked(proposeRule).mockResolvedValue({
      ok: false,
      error: 'Conflict: rule already exists',
      conflicting_ids: ['abc-123'],
    })
    const req = createMockReq('POST', '/rules', validBody)
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(409)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
    expect(body.conflicting_ids).toEqual(['abc-123'])
  })

  it('returns 400 when rule_text is missing', async () => {
    const req = createMockReq('POST', '/rules', {
      rule_type: 'lint',
      scope: 'global',
      severity: 'error',
    })
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
    expect(body.error).toContain('Validation error')
  })

  it('returns 400 when rule_type is invalid', async () => {
    const req = createMockReq('POST', '/rules', {
      ...validBody,
      rule_type: 'invalid_type',
    })
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
  })
})

// ============================================================================
// POST /rules/:id/promote
// ============================================================================

describe('POST /rules/:id/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const promoteBody = { source_story_id: 'WINT-4020' }

  it('returns 200 on successful promotion', async () => {
    vi.mocked(promoteRule).mockResolvedValue({ ok: true, data: { ...mockRule, status: 'active' } })
    const req = createMockReq('POST', '/rules/abc-123/promote', promoteBody)
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('active')
  })

  it('returns 422 when no source reference', async () => {
    vi.mocked(promoteRule).mockResolvedValue({
      ok: false,
      error: 'source_story_id or source_lesson_id required to promote',
      status: 422,
    })
    const req = createMockReq('POST', '/rules/abc-123/promote', {})
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(422)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
  })

  it('returns 404 when rule not found', async () => {
    vi.mocked(promoteRule).mockResolvedValue({
      ok: false,
      error: 'Rule not found',
      status: 404,
    })
    const req = createMockReq('POST', '/rules/non-existent-uuid/promote', promoteBody)
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Rule not found')
  })

  it('returns 409 when rule already active', async () => {
    vi.mocked(promoteRule).mockResolvedValue({
      ok: false,
      error: 'Rule is already active',
      status: 409,
    })
    const req = createMockReq('POST', '/rules/abc-123/promote', promoteBody)
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(409)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
  })
})

// ============================================================================
// Unknown routes
// ============================================================================

describe('Unknown routes', () => {
  it('returns 404 for GET /unknown', async () => {
    const req = createMockReq('GET', '/unknown')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(404)
    const body = JSON.parse(res.body)
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Not found')
  })

  it('returns 404 for POST /rules/id/unknown', async () => {
    const req = createMockReq('POST', '/rules/abc/unknown')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(404)
  })

  it('returns 404 for DELETE /rules', async () => {
    const req = createMockReq('DELETE', '/rules')
    const res = createMockRes()

    await handleRulesRegistryRequest(req, res as unknown as ServerResponse)

    expect(res.statusCode).toBe(404)
  })
})
