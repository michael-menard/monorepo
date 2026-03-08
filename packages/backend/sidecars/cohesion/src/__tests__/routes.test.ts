/**
 * Unit Tests for HTTP Route Handlers
 * WINT-4010: Create Cohesion Sidecar
 *
 * Tests handleCohesionAuditRequest and handleCohesionCheckRequest with mock deps.
 * Covers valid/invalid/error inputs for both endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IncomingMessage, ServerResponse } from 'node:http'
import {
  handleCohesionAuditRequest,
  handleCohesionCheckRequest,
  handleCohesionRequest,
} from '../routes/cohesion.js'
import type { CohesionAuditDeps, CohesionCheckDeps } from '../routes/cohesion.js'
import type { DrizzleDb } from '../compute-audit.js'

// ============================================================================
// Request/Response Mocks
// ============================================================================

function makeMockReq(
  method: string,
  url: string,
  body: unknown,
): IncomingMessage {
  const bodyStr = JSON.stringify(body)
  const chunks = [Buffer.from(bodyStr)]
  let chunkIndex = 0

  const mockReq = {
    method,
    url,
    headers: { host: 'localhost' },
    on: vi.fn().mockImplementation((event: string, handler: Function) => {
      if (event === 'data') {
        setTimeout(() => {
          handler(chunks[chunkIndex++])
        }, 0)
      } else if (event === 'end') {
        setTimeout(() => {
          handler()
        }, 0)
      }
      return mockReq
    }),
    destroy: vi.fn(),
  }
  return mockReq as unknown as IncomingMessage
}

function makeMockReqWithRawBody(method: string, url: string, body: string): IncomingMessage {
  const chunks = [Buffer.from(body)]
  let chunkIndex = 0

  const mockReq = {
    method,
    url,
    headers: { host: 'localhost' },
    on: vi.fn().mockImplementation((event: string, handler: Function) => {
      if (event === 'data') {
        setTimeout(() => {
          handler(chunks[chunkIndex++])
        }, 0)
      } else if (event === 'end') {
        setTimeout(() => {
          handler()
        }, 0)
      }
      return mockReq
    }),
    destroy: vi.fn(),
  }
  return mockReq as unknown as IncomingMessage
}

function makeMockRes() {
  let status: number | undefined
  let body: string | undefined
  const headers: Record<string, any> = {}

  const res = {
    writeHead: vi.fn().mockImplementation((s: number, h: Record<string, any>) => {
      status = s
      Object.assign(headers, h)
    }),
    end: vi.fn().mockImplementation((b: string) => {
      body = b
    }),
    headersSent: false,
  }

  return {
    res: res as unknown as ServerResponse,
    getStatus: () => status,
    getBody: () => (body ? JSON.parse(body) : undefined),
  }
}

// ============================================================================
// Mock Deps
// ============================================================================

const mockDb = {} as DrizzleDb

function makeAuditDeps(result: any = { frankenFeatures: [], coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 } }): CohesionAuditDeps {
  return {
    db: mockDb,
    computeAudit: vi.fn().mockResolvedValue(result),
  }
}

function makeAuditDepsThrows(): CohesionAuditDeps {
  return {
    db: mockDb,
    computeAudit: vi.fn().mockRejectedValue(new Error('compute failed')),
  }
}

function makeCheckDeps(result: any = { featureId: 'test-id', status: 'complete', violations: [], capabilityCoverage: { create: true, read: true, update: true, delete: true } }): CohesionCheckDeps {
  return {
    db: mockDb,
    computeCheck: vi.fn().mockResolvedValue(result),
  }
}

function makeCheckDepsThrows(): CohesionCheckDeps {
  return {
    db: mockDb,
    computeCheck: vi.fn().mockRejectedValue(new Error('compute failed')),
  }
}

// ============================================================================
// Tests: handleCohesionAuditRequest
// ============================================================================

describe('handleCohesionAuditRequest', () => {
  it('returns 200 with data on valid empty body (AC-3)', async () => {
    const req = makeMockReq('POST', '/cohesion/audit', {})
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeAuditDeps()

    await handleCohesionAuditRequest(req, res, deps)

    expect(getStatus()).toBe(200)
    expect(getBody()?.ok).toBe(true)
    expect(getBody()?.data).toBeDefined()
    expect(getBody()?.data?.frankenFeatures).toEqual([])
  })

  it('returns 200 with data on valid body with packageName (AC-3)', async () => {
    const req = makeMockReq('POST', '/cohesion/audit', { packageName: '@repo/ui' })
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeAuditDeps()

    await handleCohesionAuditRequest(req, res, deps)

    expect(getStatus()).toBe(200)
    expect(getBody()?.ok).toBe(true)
    expect(deps.computeAudit).toHaveBeenCalledWith(mockDb, '@repo/ui')
  })

  it('returns 400 on invalid JSON body (AC-5)', async () => {
    const req = makeMockReqWithRawBody('POST', '/cohesion/audit', 'not-json')
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeAuditDeps()

    await handleCohesionAuditRequest(req, res, deps)

    expect(getStatus()).toBe(400)
    expect(getBody()?.ok).toBe(false)
    expect(getBody()?.error).toBe('Invalid JSON body')
  })

  it('returns 405 on non-POST method', async () => {
    const req = makeMockReq('GET', '/cohesion/audit', {})
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeAuditDeps()

    await handleCohesionAuditRequest(req, res, deps)

    expect(getStatus()).toBe(405)
    expect(getBody()?.ok).toBe(false)
  })

  it('returns 500 on computeAudit error (AC-5)', async () => {
    const req = makeMockReq('POST', '/cohesion/audit', {})
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeAuditDepsThrows()

    await handleCohesionAuditRequest(req, res, deps)

    expect(getStatus()).toBe(500)
    expect(getBody()?.ok).toBe(false)
    expect(getBody()?.error).toBe('Internal server error')
  })
})

// ============================================================================
// Tests: handleCohesionCheckRequest
// ============================================================================

describe('handleCohesionCheckRequest', () => {
  it('returns 200 with data on valid featureId (AC-4)', async () => {
    const req = makeMockReq('POST', '/cohesion/check', { featureId: 'some-uuid' })
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeCheckDeps()

    await handleCohesionCheckRequest(req, res, deps)

    expect(getStatus()).toBe(200)
    expect(getBody()?.ok).toBe(true)
    expect(getBody()?.data?.featureId).toBeDefined()
    expect(getBody()?.data?.status).toBeDefined()
  })

  it('returns 400 when featureId is missing (AC-5)', async () => {
    const req = makeMockReq('POST', '/cohesion/check', {})
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeCheckDeps()

    await handleCohesionCheckRequest(req, res, deps)

    expect(getStatus()).toBe(400)
    expect(getBody()?.ok).toBe(false)
    expect(getBody()?.error).toBe('Invalid request body')
  })

  it('returns 400 on invalid JSON body (AC-5)', async () => {
    const req = makeMockReqWithRawBody('POST', '/cohesion/check', 'bad-json')
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeCheckDeps()

    await handleCohesionCheckRequest(req, res, deps)

    expect(getStatus()).toBe(400)
    expect(getBody()?.ok).toBe(false)
  })

  it('returns 405 on non-POST method', async () => {
    const req = makeMockReq('GET', '/cohesion/check', { featureId: 'id' })
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeCheckDeps()

    await handleCohesionCheckRequest(req, res, deps)

    expect(getStatus()).toBe(405)
    expect(getBody()?.ok).toBe(false)
  })

  it('returns 500 on computeCheck error (AC-5)', async () => {
    const req = makeMockReq('POST', '/cohesion/check', { featureId: 'test' })
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeCheckDepsThrows()

    await handleCohesionCheckRequest(req, res, deps)

    expect(getStatus()).toBe(500)
    expect(getBody()?.ok).toBe(false)
    expect(getBody()?.error).toBe('Internal server error')
  })
})

// ============================================================================
// Tests: handleCohesionRequest (dispatcher)
// ============================================================================

describe('handleCohesionRequest', () => {
  it('dispatches POST /cohesion/audit to audit handler', async () => {
    const req = makeMockReq('POST', '/cohesion/audit', {})
    const { res, getStatus } = makeMockRes()
    const deps = { ...makeAuditDeps(), ...makeCheckDeps() }

    await handleCohesionRequest(req, res, deps)

    expect(getStatus()).toBe(200)
  })

  it('dispatches POST /cohesion/check to check handler', async () => {
    const req = makeMockReq('POST', '/cohesion/check', { featureId: 'id' })
    const { res, getStatus } = makeMockRes()
    const deps = { ...makeAuditDeps(), ...makeCheckDeps() }

    await handleCohesionRequest(req, res, deps)

    expect(getStatus()).toBe(200)
  })

  it('returns 404 for unknown route', async () => {
    const req = makeMockReq('POST', '/cohesion/unknown', {})
    const { res, getStatus, getBody } = makeMockRes()
    const deps = { ...makeAuditDeps(), ...makeCheckDeps() }

    await handleCohesionRequest(req, res, deps)

    expect(getStatus()).toBe(404)
    expect(getBody()?.ok).toBe(false)
    expect(getBody()?.error).toBe('Not found')
  })
})

// ============================================================================
// Additional tests for uncovered branches in body reading
// ============================================================================

describe('handleCohesionAuditRequest - additional coverage', () => {
  it('returns 400 when packageName is too long (Zod validation)', async () => {
    const req = makeMockReq('POST', '/cohesion/audit', { packageName: 'x'.repeat(256) })
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeAuditDeps()

    await handleCohesionAuditRequest(req, res, deps)

    expect(getStatus()).toBe(400)
    expect(getBody()?.ok).toBe(false)
    expect(getBody()?.error).toBe('Invalid request body')
  })
})

describe('handleCohesionCheckRequest - additional coverage', () => {
  it('returns 400 when featureId is empty string', async () => {
    const req = makeMockReq('POST', '/cohesion/check', { featureId: '' })
    const { res, getStatus, getBody } = makeMockRes()
    const deps = makeCheckDeps()

    await handleCohesionCheckRequest(req, res, deps)

    expect(getStatus()).toBe(400)
    expect(getBody()?.ok).toBe(false)
  })
})
